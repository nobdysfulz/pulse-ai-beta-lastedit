import React, { useState, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Database, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/components/lib/utils';

/**
 * Debug panel for AI Agents
 * Only visible to admins with ?debug=true flag
 */
export default function AgentDebugPanel({ agentType, sessionManager }) {
  const { user } = useContext(UserContext);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show for admins
  if (user?.role !== 'admin') return null;

  const sessionContext = sessionManager?.getContext() || {};
  const cacheStats = {
    hits: sessionContext.cache_hits || 0,
    misses: sessionContext.cache_misses || 0,
    size: sessionContext.cache_size || 0
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 bg-[#7C3AED] text-white px-4 py-2 rounded-lg shadow-lg hover:bg-[#6D28D9] transition-colors flex items-center gap-2 z-50"
      >
        <Zap className="w-4 h-4" />
        Debug Panel
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-[#E2E8F0] rounded-lg shadow-2xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#7C3AED]" />
          <h3 className="font-semibold text-[#1E293B]">Debug Panel</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-[#64748B] hover:text-[#1E293B]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* Session Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-[#64748B]" />
            <span className="text-sm font-medium text-[#1E293B]">Session Info</span>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Agent:</span>
              <span className="text-[#1E293B] font-medium">{agentType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Session ID:</span>
              <span className="text-[#1E293B] font-mono">{sessionManager?.sessionId?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Last Activity:</span>
              <span className="text-[#1E293B]">
                {sessionManager?.lastActivity ? 
                  new Date(sessionManager.lastActivity).toLocaleTimeString() : 
                  'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Cache Stats */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-[#64748B]" />
            <span className="text-sm font-medium text-[#1E293B]">Cache Performance</span>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Cache Hits:</span>
              <span className="text-green-600 font-medium">{cacheStats.hits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Cache Misses:</span>
              <span className="text-orange-600 font-medium">{cacheStats.misses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Hit Rate:</span>
              <span className="text-[#1E293B] font-medium">
                {cacheStats.hits + cacheStats.misses > 0 ? 
                  Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Cache Size:</span>
              <span className="text-[#1E293B]">{cacheStats.size} KB</span>
            </div>
          </div>
        </div>

        {/* Intent Data */}
        {sessionContext.last_intent && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#64748B]" />
              <span className="text-sm font-medium text-[#1E293B]">Last Intent</span>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Intent:</span>
                <Badge className="text-[10px]">{sessionContext.last_intent}</Badge>
              </div>
              {sessionContext.last_context && (
                <div className="mt-2">
                  <span className="text-[#64748B]">Context:</span>
                  <pre className="mt-1 text-[10px] bg-white p-2 rounded border border-[#E2E8F0] overflow-x-auto">
                    {JSON.stringify(sessionContext.last_context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connected Accounts */}
        {sessionContext.connected_accounts?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-[#64748B]" />
              <span className="text-sm font-medium text-[#1E293B]">Connected Accounts</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {sessionContext.connected_accounts.map((account, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px]">
                  {account}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-[#E2E8F0]">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              sessionManager?.clearConversation();
              window.location.reload();
            }}
            className="w-full text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Clear Session & Reload
          </Button>
        </div>
      </div>
    </div>
  );
}