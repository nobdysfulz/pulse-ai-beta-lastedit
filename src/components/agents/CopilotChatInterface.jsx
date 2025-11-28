import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { Button } from '@/components/ui/button';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';
import AITypingIndicator from '../ui/AITypingIndicator';
import { cn } from '@/components/lib/utils';
import { expandPrompt } from '../ai/promptExpander';
import { routeIntent, needsClarification } from '../ai/intentRouter';
import { detectUserTone, humanizeToolResult } from '../ai/responseComposer';
import { parseContentPreview } from '../ai/actionMapper';
import ContentPreview from '../ui/ContentPreview';

import { ChatSessionManager } from '../ai/chatControls';
import ChatControls, { ActionButtons, CompactText, CacheStatusBadge } from '../ui/ChatControls';

export default function CopilotChatInterface() {
  const { user, marketConfig, goals, actions } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(''); // Renamed inputMessage to input
  const [isLoading, setIsLoading] = useState(false); // Renamed loading to isLoading
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const sessionManagerRef = React.useRef(null);
  const [cacheMetadata, setCacheMetadata] = React.useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize session manager
  React.useEffect(() => {
    if (user && !sessionManagerRef.current) { // Ensure it's only initialized once
      sessionManagerRef.current = new ChatSessionManager('copilot', user.id);

      // Restore session if exists
      const cachedMessages = sessionManagerRef.current.loadMessages();
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
      } else {
        // Initial greeting if no messages are cached
        setMessages([{ role: 'assistant', content: "Hi! I'm your PULSE Copilot. How can I help you today?", timestamp: new Date().toISOString() }]);
      }
    }
  }, [user]);

  // Save messages to session cache whenever they change
  React.useEffect(() => {
    if (sessionManagerRef.current && messages.length > 0) {
      sessionManagerRef.current.saveMessages(messages);
      sessionManagerRef.current.updateActivity();
    }
  }, [messages]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    const messageText = input.trim(); // Use 'input' instead of 'inputMessage'
    if (!messageText || isLoading) return; // Use 'isLoading' instead of 'loading'

    // Step 1: Expand prompt
    const sessionContext = sessionManagerRef.current?.getContext() || {};
    const expandedInput = expandPrompt(messageText, {
      intent: sessionContext.last_intent,
      context: sessionContext.last_context,
      lastOutputType: sessionContext.last_output_type
    });

    console.log('[Copilot] Original:', messageText);
    console.log('[Copilot] Expanded:', expandedInput);

    // Step 2: Detect user tone
    const userTone = detectUserTone(messageText);

    const userMessage = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Use 'setInput' instead of 'setInputMessage'
    setIsLoading(true); // Use 'setIsLoading' instead of 'setLoading'

    const controller = sessionManagerRef.current?.createAbortController();

    try {
      // Step 3: Route intent
      const intentData = await routeIntent(expandedInput, {
        currentAgent: 'copilot',
        lastAction: sessionContext.last_intent,
        ...sessionContext
      });

      console.log('[Copilot] Intent:', intentData);

      // Step 4: Check for clarification
      const clarificationType = needsClarification(intentData.confidence);

      if (clarificationType === 'hard') {
        const clarifyMessage = {
          role: 'assistant',
          content: "Can you tell me a bit more about what you'd like me to help with?",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, clarifyMessage]);
        setIsLoading(false); // Use 'setIsLoading'
        return;
      }

      // Step 5: Call copilot with expanded input
      // Reverted from trackAICall/withRetry to direct invoke, as those functions are not defined/imported in the outline
      const { data, error } = await base44.functions.invoke('copilotChat', {
        userPrompt: expandedInput, // Use expandedInput
        conversationHistory: messages,
        sessionId: sessionManagerRef.current?.sessionId,
        useCache: true,
        userTone: userTone, // Add userTone
        intentData: intentData // Add intentData
      }, { signal: controller?.signal });

      if (error) {
        throw new Error(error.message || 'Failed to get response');
      }
      const result = data; // Assign data to result for consistency with outline's subsequent usage

      // Step 6: Update context memory
      if (sessionManagerRef.current) {
        sessionManagerRef.current.setLastIntent(intentData.intent, intentData.context);

        if (intentData.intent?.includes('post') || intentData.intent?.includes('content')) {
          sessionManagerRef.current.setLastOutputType('post');
        } else if (intentData.intent?.includes('email')) {
          sessionManagerRef.current.setLastOutputType('email');
        } else if (intentData.intent?.includes('meeting')) {
          sessionManagerRef.current.setLastOutputType('meeting');
        }
      }

      // Step 7: Parse content preview
      const contentPreview = parseContentPreview(result.response);

      // connections fetching and extractExecutableActions are not defined/imported, so removed to ensure functionality
      // const connections = await base44.entities.ExternalServiceConnection.filter({
      //   userId: user.id,
      //   status: 'connected'
      // }).catch(() => []);
      // const extractedActions = extractExecutableActions(result.response, connections, { agentType: 'copilot' });

      // Extract cache metadata if available
      if (result.metadata) {
        setCacheMetadata(result.metadata);
      }

      const assistantMessage = {
        role: 'assistant',
        content: result.response || result.message || 'No response',
        actions: result.actions || [], // Removed ...extractedActions as extractExecutableActions is not defined
        timestamp: new Date().toISOString(),
        cacheHit: result.metadata?.cacheHit,
        userTone: userTone,
        contentPreview: contentPreview // Add contentPreview
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (contentPreview && sessionManagerRef.current) {
        sessionManagerRef.current.saveContentDraft(contentPreview);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        const stoppedMessage = {
          role: 'assistant',
          content: 'Response stopped by user.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, stoppedMessage]);
      } else {
        console.error('Error getting Copilot response:', error);
        toast.error(error.message || "Failed to get response from Copilot.");
        const errorMessage = {
          role: 'assistant',
          content: "I apologize, but I'm having trouble responding right now. Please try again.",
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false); // Use 'setIsLoading'
    }
  };

  const handleStop = () => {
    sessionManagerRef.current?.stopGeneration();
  };

  const handleRetry = () => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        setInput(lastUserMessage.content);
        // Use a timeout to ensure state update for input takes effect before sendMessage
        setTimeout(() => sendMessage(), 100);
      }
    }
  };

  const handleClear = () => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.clearConversation();
      setMessages([{ role: 'assistant', content: "Hi! I'm your PULSE Copilot. How can I help you today?", timestamp: new Date().toISOString() }]); // Reset with greeting
      setCacheMetadata(null);
    }
  };

  const handleActionClick = async (action) => {
    // Handle navigation
    if (action.type === 'navigate') {
      window.location.href = action.url;
      return;
    }

    // Handle dismiss
    if (action.type === 'dismiss') {
      toast.info('Suggestion dismissed');
      return;
    }

    try {
      // Assuming 'tool' and 'args' are present in the action object
      const { data } = await base44.functions.invoke(action.tool, action.args || {});

      // Invalidate relevant queries based on the action performed
      if (action.tool === 'scheduleAppointmentTool') {
        queryClient.invalidateQueries(['appointments']);
        queryClient.invalidateQueries(['dailyActions']);
      }
      if (action.tool === 'sendEmailTool') {
        queryClient.invalidateQueries(['sentEmails']);
      }
      // Add more invalidations for other tools as needed

      const confirmMessage = {
        role: 'assistant',
        content: `Done! ${action.label} completed successfully.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, confirmMessage]);
    } catch (error) {
      console.error('[Copilot] Action error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Failed to ${action.label}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleContentPreviewAction = (action) => {
    if (action.type === 'update_caption') {
      setMessages(prev => {
        const updated = [...prev];
        const lastAssistant = [...updated].reverse().find(m => m.role === 'assistant' && m.contentPreview);
        if (lastAssistant && lastAssistant.contentPreview) {
          lastAssistant.contentPreview = {
            ...lastAssistant.contentPreview,
            caption: action.caption
          };
        }
        return updated;
      });
      toast.success('Caption updated');
    } else {
      handleActionClick(action);
    }
  };


  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header section (removed close button and title as per outline) */}
      {/*
      <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
        <h2 className="text-lg font-semibold text-[#1E293B]">PULSE Copilot</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-[#94A3B8]" />
          </Button>
        )}
      </div>
      */}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && ( // Changed initial message display
          <div className="text-center py-12">
            <p className="text-[#64748B] mb-2">How can I help you today?</p>
            <p className="text-sm text-[#94A3B8]">Ask me anything about your business, schedule, or market.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-[#7C3AED]" />
              </div>
            )}

            <div className={cn(
              "max-w-[85%]",
              message.role === 'user' && "flex flex-col items-end"
            )}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                message.role === 'user'
                  ? "bg-[#1E293B] text-white"
                  : "bg-white border border-[#E2E8F0]"
              )}>
                <CompactText
                  text={message.content}
                  maxChars={800}
                  className="text-sm leading-relaxed"
                />

                {message.cacheHit && (
                  <CacheStatusBadge
                    cacheHit={message.cacheHit}
                    timestamp={message.timestamp}
                    className="mt-2"
                  />
                )}

                {message.actions && message.actions.length > 0 && (
                  <ActionButtons
                    actions={message.actions}
                    onActionClick={handleActionClick}
                  />
                )}
              </div>

              {message.contentPreview && (
                <ContentPreview
                  preview={message.contentPreview}
                  onAction={handleContentPreviewAction}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-[#7C3AED] animate-pulse" />
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#E2E8F0] p-4 space-y-3">
        <ChatControls
          onStop={handleStop}
          onRetry={handleRetry}
          onClear={handleClear}
          isGenerating={isLoading}
          canRetry={messages.length >= 2 && !isLoading}
        />

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-lg bg-white focus:ring-0 focus:outline-none focus:border-[#7C3AED] text-sm text-[#1E293B] placeholder:text-[#94A3B8]"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}