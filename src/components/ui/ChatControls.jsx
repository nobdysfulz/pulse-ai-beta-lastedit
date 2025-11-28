import React from 'react';
import { Button } from '@/components/ui/button';
import { StopCircle, RotateCcw, Clock, Zap, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/components/lib/utils';

/**
 * Universal Chat Controls Component
 * Provides Stop/Retry/Clear buttons for all AI chat interfaces
 */
export default function ChatControls({ 
  onStop, 
  onRetry, 
  onClear,
  isGenerating = false,
  canRetry = false,
  className 
}) {
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  const handleClear = () => {
    if (showClearConfirm) {
      onClear();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isGenerating && (
        <Button
          variant="outline"
          size="sm"
          onClick={onStop}
          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 text-xs h-7"
        >
          <StopCircle className="w-3 h-3 mr-1" />
          Stop
        </Button>
      )}
      
      {!isGenerating && canRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-xs h-7"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleClear}
        className={cn(
          "text-xs h-7",
          showClearConfirm && "bg-red-50 border-red-300 text-red-700"
        )}
      >
        {showClearConfirm ? 'Confirm Clear?' : 'Clear Chat'}
      </Button>
    </div>
  );
}

/**
 * Action Buttons Component
 * Renders inline action buttons from AI response
 */
export function ActionButtons({ actions = [], onActionClick, className }) {
  const [executing, setExecuting] = React.useState(null);

  const handleClick = async (action, index) => {
    setExecuting(index);
    try {
      await onActionClick(action);
    } finally {
      setExecuting(null);
    }
  };

  if (!actions || actions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 mt-3", className)}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="secondary"
          size="sm"
          onClick={() => handleClick(action, index)}
          disabled={executing !== null}
          className="bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/20"
        >
          {executing === index ? (
            <>Processing...</>
          ) : (
            <>{action.label}</>
          )}
        </Button>
      ))}
    </div>
  );
}

/**
 * Compact Text Renderer
 * Renders text with "Read More" expansion for long content
 */
export function CompactText({ text, maxChars = 800, className }) {
  const [expanded, setExpanded] = React.useState(false);
  
  if (!text) return null;

  const needsTruncation = text.length > maxChars;
  const displayText = expanded || !needsTruncation 
    ? text 
    : text.substring(0, maxChars) + '...';

  return (
    <div className={className}>
      <div className="whitespace-pre-wrap">{displayText}</div>
      {needsTruncation && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-[#7C3AED] p-0 h-auto mt-2"
        >
          {expanded ? 'Show Less' : 'Read More'}
        </Button>
      )}
    </div>
  );
}

/**
 * Cache Status Indicator
 * Shows if response came from cache
 */
export function CacheStatusBadge({ cacheHit, timestamp, className }) {
  if (!cacheHit) return null;

  const age = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000 / 60);
  
  return (
    <div className={cn("text-xs text-[#64748B] flex items-center gap-1", className)}>
      <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
      Loaded from recent insights ({age}m ago)
    </div>
  );
}

/**
 * Performance Stats Display
 */
export function PerformanceStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs text-[#64748B] px-1">
      {stats.avgResponseTime && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Avg: {stats.avgResponseTime}ms</span>
        </div>
      )}
      {stats.cacheHitRate !== undefined && (
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>Cache: {stats.cacheHitRate}%</span>
        </div>
      )}
      {stats.totalCalls && (
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>{stats.totalCalls} calls</span>
        </div>
      )}
    </div>
  );
}

/**
 * Error Display
 */
export function ErrorDisplay({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900 mb-1">Something went wrong</h4>
          <p className="text-sm text-red-700 mb-3">{error.message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}