import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { cn } from '@/components/lib/utils';
import ReactMarkdown from 'react-markdown';
import { ChatSessionManager } from '../ai/chatControls';
import ChatControls from '../ui/ChatControls';
import SocialPostCard from '@/components/ui/SocialPostCard';
import { checkProactiveTriggers, formatSuggestionAsMessage } from '../ai/proactiveSuggestions';
import AgentDebugPanel from '@/components/agents/AgentDebugPanel';

const agentNames = {
  executive_assistant: "NOVA",
  content_agent: "SIRIUS",
  transaction_coordinator: "VEGA"
};

const agentAvatars = {
  executive_assistant: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/9ed7e57e3_ExecutiveAssistant.png',
  content_agent: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/4cce42e70_ContentAgent.png',
  transaction_coordinator: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/1b1eebc95_TransactionCoordinator.png'
};

export default function AgentChatInterface({ agentType }) {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const sessionManagerRef = useRef(null);
  const proactiveSuggestionsTimerRef = useRef(null);

  const agentName = agentNames[agentType] || agentType;
  const agentAvatar = agentAvatars[agentType];

  const isDebugMode = user?.role === 'admin' && (
  window.location.search.includes('debug=true') || localStorage.getItem('agent_debug') === 'true');

  useEffect(() => {
    if (user && agentType) {
      sessionManagerRef.current = new ChatSessionManager(agentType, user.id);

      const cachedMessages = sessionManagerRef.current.loadMessages();
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
      }
    }
  }, [user, agentType]);

  useEffect(() => {
    if (!user || !sessionManagerRef.current) return;

    const checkAndSuggest = async () => {
      const lastActivity = sessionManagerRef.current.lastActivity;
      const idleTime = Date.now() - lastActivity;

      if (idleTime < 5 * 60 * 1000) return;

      const suggestions = await checkProactiveTriggers(user, sessionManagerRef.current);

      if (suggestions.length > 0) {
        const suggestionMessage = formatSuggestionAsMessage(suggestions[0]);
        setMessages((prev) => [...prev, suggestionMessage]);
      }
    };

    proactiveSuggestionsTimerRef.current = setInterval(checkAndSuggest, 10 * 60 * 1000);

    return () => {
      if (proactiveSuggestionsTimerRef.current) {
        clearInterval(proactiveSuggestionsTimerRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (sessionManagerRef.current && messages.length > 0) {
      sessionManagerRef.current.saveMessages(messages);
      sessionManagerRef.current.updateActivity();
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();

    const messageText = inputMessage.trim();
    if (!messageText || loading) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      console.log(`[${agentType}] Sending message:`, messageText.substring(0, 50));

      // Prepare clean conversation history for backend
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

      const payload = {
        userPrompt: messageText,
        conversationHistory: conversationHistory,
        sessionId: sessionManagerRef.current?.sessionId || `session_${Date.now()}`
      };

      console.log(`[${agentType}] Payload:`, {
        promptLength: payload.userPrompt.length,
        historyLength: payload.conversationHistory.length,
        sessionId: payload.sessionId
      });

      const response = await base44.functions.invoke(`${agentType}Chat`, payload);

      console.log(`[${agentType}] Response:`, response);

      if (response.error) {
        throw new Error(response.error.message || response.error || "The agent failed to respond.");
      }

      const result = response.data;

      // Log tool usage but don't show to user
      if (result.toolsUsed && result.toolsUsed.length > 0) {
        console.log(`[${agentType}] Tools used:`, result.toolsUsed);
      }

      const assistantMessage = {
        role: 'assistant',
        content: result.response || 'No response',
        actions: result.actions || [],
        posts: result.posts || [],
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error(`[${agentType}] Error:`, error);

      const errorMessage = {
        role: 'assistant',
        content: error.message || 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to get response from agent');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    sessionManagerRef.current?.stopGeneration();
  };

  const handleRetry = () => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMessage) {
        setInputMessage(lastUserMessage.content);
        setTimeout(() => sendMessage(), 100);
      }
    }
  };

  const handleClear = () => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.clearConversation();
      setMessages([]);
    }
  };

  const handlePostCardAction = async (action, post) => {
    console.log('[PostCardAction]', action, post);

    if (action.type === 'publish') {
      const toastId = toast.loading(`Publishing to ${action.platform}...`);

      try {
        const publishFunctions = {
          instagram: 'publishInstagramPostTool',
          facebook: 'publishFacebookPostTool',
          linkedin: 'publishLinkedInPostTool'
        };

        const functionName = publishFunctions[action.platform];
        if (!functionName) {
          throw new Error(`Publishing to ${action.platform} is not yet supported`);
        }

        const payload = {
          caption: post.caption || '',
          imageUrl: post.imageUrl
        };

        if (post.hashtags) {
          payload.caption = `${payload.caption}\n\n${post.hashtags}`;
        }

        console.log('[PostCardAction] Calling:', functionName, 'with payload:', payload);

        const { data, error } = await base44.functions.invoke(functionName, payload);

        console.log('[PostCardAction] Response:', { data, error });

        if (error) {
          throw new Error(error.message || error || 'Failed to publish');
        }

        toast.dismiss(toastId);
        toast.success(`Successfully published to ${action.platform}!`);

        const confirmMessage = {
          role: 'assistant',
          content: `Great! I've published that post to ${action.platform}. It should appear on your profile shortly.`,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, confirmMessage]);

      } catch (error) {
        console.error('[PublishError]', error);
        toast.dismiss(toastId);

        let errorMessage = 'Failed to publish';

        if (error.message) {
          if (error.message.includes('not connected')) {
            errorMessage = `Please connect your ${action.platform} account in Settings → Integrations first.`;
          } else if (error.message.includes('expired') || error.message.includes('invalid')) {
            errorMessage = 'The image URL has expired. Please generate the post again.';
          } else {
            errorMessage = error.message;
          }
        }

        toast.error(`Failed to publish: ${errorMessage}`);

        const errorChatMessage = {
          role: 'assistant',
          content: `I wasn't able to publish that post. ${errorMessage}`,
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages((prev) => [...prev, errorChatMessage]);
      }
    } else if (action.type === 'edit') {
      toast.info('Edit functionality - coming soon');
    } else if (action.type === 'schedule') {
      toast.info('Schedule functionality - coming soon');
    }
  };

  if (!agentType) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error: Agent type not specified</p>
      </div>);

  }

  return (
    <>
      <div className="h-full flex flex-col bg-[#F8FAFC]">
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 min-h-[560px]">
          {messages.length === 0 &&
          <div className="text-center py-4">
              <p className="text-[#64748B] mb-2">Hello! I'm {agentName}.</p>
              <p className="text-sm text-[#94A3B8]">How can I assist you today?</p>
            </div>
          }

          {messages.map((message, index) =>
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}>

              {message.role === 'assistant' &&
            <img
              src={agentAvatar}
              alt={agentName}
              width="32"
              height="32"
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
              }} />

            }

              <div className={cn(
              "max-w-[85%]",
              message.role === 'user' && "flex flex-col items-end"
            )}>
                <div className={cn(
                "rounded-2xl px-4 py-3",
                message.role === 'user' ?
                "bg-[#1E293B] text-white" :
                message.isError ?
                "bg-red-50 border border-red-200 text-red-800" :
                message.isLoading ?
                "bg-blue-50 border border-blue-200 text-blue-800" :
                "bg-white border border-[#E2E8F0]"
              )}>
                  {message.role === 'user' ?
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p> :

                <ReactMarkdown
                  className="text-sm leading-relaxed prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2"
                  components={{
                    p: ({ children }) => <p className="my-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-[#1E293B]">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc ml-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-[#1E293B]">{children}</li>
                  }}>

                      {message.content}
                    </ReactMarkdown>
                }
                </div>

                {message.posts && message.posts.length > 0 &&
              <div className="mt-3 space-y-3">
                    {message.posts.map((post, idx) =>
                <SocialPostCard
                  key={idx}
                  post={post}
                  onAction={(action) => handlePostCardAction(action, post)} />

                )}
                  </div>
              }
              </div>
            </div>
          )}

          {loading &&
          <div className="flex gap-3 justify-start">
              <img
              src={agentAvatar}
              alt={agentName}
              width="32"
              height="32"
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
              }} />

              <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          }

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[#E2E8F0] px-6 py-3 flex-shrink-0 bg-white">
          <form onSubmit={sendMessage} className="flex gap-3 mb-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Message ${agentName}...`}
              className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-lg bg-white focus:ring-0 focus:outline-none focus:border-[#7C3AED] text-base text-[#1E293B] placeholder:text-[#94A3B8]"
              disabled={loading} />

            <Button type="submit" disabled={loading || !inputMessage.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>

          <ChatControls
            onStop={handleStop}
            onRetry={handleRetry}
            onClear={handleClear}
            isGenerating={loading}
            canRetry={messages.length >= 2 && !loading} />

        </div>
      </div>

      {isDebugMode &&
      <AgentDebugPanel
        agentType={agentType}
        sessionManager={sessionManagerRef.current} />

      }
    </>);

}