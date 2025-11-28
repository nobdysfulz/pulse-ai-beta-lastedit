import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../components/context/UserContext';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { ChatSessionManager } from '../components/ai/chatControls';
import ChatControls, { CacheStatusBadge } from '../components/ui/ChatControls';
import { sessionCache } from '../components/ai/sessionCache';
import { cn } from '@/components/lib/utils';
import ReactMarkdown from 'react-markdown';
import LoadingIndicator from '@/components/ui/LoadingIndicator'; // Import LoadingIndicator

export default function PersonalAdvisorPage() {
  const { user, loading: contextLoading } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();
  // useQueryClient is not used in the current implementation, can be removed if not planned for future use
  // const queryClient = useQueryClient();

  const sessionManagerRef = useRef(null);
  const [cacheMetadata, setCacheMetadata] = useState(null);
  const [retryCount, setRetryCount] = useState(0); // New state for retry count

  // Initialize session manager and load messages
  useEffect(() => {
    if (user && !sessionManagerRef.current) { // Ensure it only initializes once and when user is available
      sessionManagerRef.current = new ChatSessionManager('advisor', user.id);
      
      // Restore session if exists
      const cachedMessages = sessionManagerRef.current.loadMessages();
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
      }
    }
  }, [user]);

  // Save messages to session cache whenever messages change
  useEffect(() => {
    if (sessionManagerRef.current && messages.length > 0) {
      sessionManagerRef.current.saveMessages(messages);
      sessionManagerRef.current.updateActivity(); // Mark session as active
    }
  }, [messages]);

  // Reset retryCount when a new assistant message is received and loading stops
  useEffect(() => {
    if (!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setRetryCount(0);
    }
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const controller = sessionManagerRef.current?.createAbortController();

    try {
      const sessionId = sessionManagerRef.current?.sessionId;

      const { data, error } = await base44.functions.invoke('copilotChat', {
          userPrompt: userMessage.content,
          conversationHistory: messages,
          sessionId: sessionId,
          useCache: true,
          currentTab: 'advisor'
      }, {
        signal: controller?.signal
      });

      if (error) {
          throw new Error(error.message || "The Copilot failed to respond.");
      }

      if (data.metadata) {
        setCacheMetadata(data.metadata);
      }

      const assistantMessage = { 
          role: 'assistant', 
          content: data.response || data.message || 'No response', 
          actions: data.actions || [],
          timestamp: new Date().toISOString(),
          cacheHit: data.metadata?.cacheHit
      };
      setMessages((prev) => [...prev, assistantMessage]);

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
        const errorMessage = { role: 'assistant', content: "I apologize, but I'm having trouble responding right now. Please try again.", timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
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
        setRetryCount(prev => prev + 1); // Increment retry count
        setTimeout(() => sendMessage(), 100);
      }
    }
  };

  const handleClear = () => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.clearConversation();
      setMessages([]);
      setCacheMetadata(null);
      setRetryCount(0); // Reset retry count
    }
  };

  // handleActionClick function removed as ActionButtons are no longer imported or rendered.
  // const handleActionClick = async (action) => { /* ... */ };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted/30">
        <LoadingIndicator text="Loading Advisor..." size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-muted/30">
      <title>Personal Advisor - PULSE Intelligence</title>
      <meta name="description" content="Get personalized AI coaching and advice for your real estate business with PULSE Intelligence's Personal Advisor." />
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/30">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/ccb40ae91_PULSEaiicon.png"
              alt="PULSE AI"
              className="w-16 h-16 mx-auto mb-4 object-contain"
            />
            <h2 className="text-xl font-semibold text-foreground mb-2">Your Personal Advisor</h2>
            <p className="text-muted-foreground">Ask me anything about your business, market, or goals</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/3ac877de1_PULSEaiicon.png"
                  alt="PULSE AI"
                  className="w-8 h-8 object-contain"
                />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-foreground text-white"
                  : "bg-card border border-border"
              )}
            >
              {msg.role === "user" ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <>
                  <ReactMarkdown 
                    className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="my-2 ml-4 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 ml-4 list-decimal">{children}</ol>,
                      li: ({ children }) => <li className="my-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-border pl-3 my-2 text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  
                  {msg.cacheHit && (
                    <CacheStatusBadge 
                      cacheHit={msg.cacheHit} 
                      timestamp={msg.timestamp}
                      className="mt-2"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full flex items-center justify-center">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/3ac877de1_PULSEaiicon.png"
                alt="PULSE AI"
                className="w-8 h-8 object-contain animate-pulse"
              />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {isLoading && retryCount > 0 && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">Retry attempt {retryCount}...</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4 space-y-3 bg-card">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your advisor anything..."
            className="flex-1 px-4 py-3 border border-border rounded-lg bg-background focus:ring-0 focus:outline-none focus:border-primary text-base text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        
        <ChatControls
          onStop={handleStop}
          onRetry={handleRetry}
          onClear={handleClear}
          isGenerating={isLoading}
          canRetry={messages.length >= 2 && !isLoading}
        />
      </div>
    </div>
  );
}