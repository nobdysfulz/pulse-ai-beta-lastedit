import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { MessageCircle, X, Send, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function SupportChatWidget() {
  const { user, isSupportChatOpen, setSupportChatOpen, activeSupportAgent } = useContext(UserContext);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation when chat opens
  useEffect(() => {
    if (isSupportChatOpen && !conversation && user) {
      initializeConversation();
    }
  }, [isSupportChatOpen, user]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [conversation?.id]);

  const initializeConversation = async () => {
    setInitializing(true);
    try {
      const agentName = activeSupportAgent || 'technical_support';
      const newConversation = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: {
          name: agentName === 'pgic_intelligence_agent' ? 'Intelligence Assistant' : 'Support Chat',
          description: 'User conversation'
        }
      });
      
      setConversation(newConversation);
      setMessages(newConversation.messages || []);
    } catch (error) {
      console.error('[SupportChat] Failed to initialize conversation:', error);
      toast.error('Failed to start support chat');
    } finally {
      setInitializing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversation) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('[SupportChat] Failed to send message:', error);
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  if (!isSupportChatOpen) {
    return (
      <button
        onClick={() => setSupportChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-full shadow-lg hidden md:flex items-center justify-center transition-all z-50"
        aria-label="Open support chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-[#E2E8F0] flex flex-col transition-all z-50",
      isMinimized ? "w-80 h-14" : "w-96 h-[32rem]"
    )}>
      <div className="bg-[#7C3AED] text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">
            {activeSupportAgent === 'pgic_intelligence_agent' ? 'Intelligence Assistant' : 'Support Chat'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            aria-label={isMinimized ? "Maximize" : "Minimize"}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSupportChatOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {initializing ? (
              <div className="text-center text-[#64748B] text-sm py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Connecting to support...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-[#64748B] text-sm py-8">
                <p>Hi! How can we help you today?</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      message.role === 'user'
                        ? "bg-[#7C3AED] text-white"
                        : "bg-[#F1F5F9] text-[#1E293B]"
                    )}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <ReactMarkdown
                        className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        components={{
                          p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="my-0.5">{children}</li>,
                          code: ({ inline, children }) => 
                            inline ? (
                              <code className="px-1 py-0.5 rounded bg-slate-200 text-slate-700 text-xs">
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-slate-900 text-slate-100 rounded p-2 my-1 text-xs">
                                {children}
                              </code>
                            )
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F1F5F9] rounded-lg p-3 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[#64748B]">Support is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E2E8F0]">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={loading || initializing}
              />
              <Button type="submit" size="icon" disabled={!inputMessage.trim() || loading || initializing}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}