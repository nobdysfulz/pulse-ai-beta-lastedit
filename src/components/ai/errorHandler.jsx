/**
 * AI Error Handler
 * Provides graceful error handling, retry logic, and fallback responses
 */

const MAX_RETRIES = 2;
const BASE_DELAY = 1000;

export const ErrorType = {
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  NETWORK: 'network',
  AUTH: 'auth',
  INVALID_RESPONSE: 'invalid_response',
  CONTEXT_TOO_LARGE: 'context_too_large',
  UNKNOWN: 'unknown'
};

export function classifyError(error) {
  const message = error.message?.toLowerCase() || '';
  
  if (error.name === 'AbortError') {
    return ErrorType.TIMEOUT;
  }
  
  if (message.includes('rate limit') || message.includes('429')) {
    return ErrorType.RATE_LIMIT;
  }
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }
  
  if (message.includes('network') || message.includes('fetch failed')) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes('unauthorized') || message.includes('401')) {
    return ErrorType.AUTH;
  }
  
  if (message.includes('context length') || message.includes('token limit')) {
    return ErrorType.CONTEXT_TOO_LARGE;
  }
  
  if (message.includes('invalid') || message.includes('parse')) {
    return ErrorType.INVALID_RESPONSE;
  }
  
  return ErrorType.UNKNOWN;
}

export function getUserMessage(errorType) {
  const messages = {
    [ErrorType.RATE_LIMIT]: 'Taking a quick break to avoid rate limits. Please try again in a moment.',
    [ErrorType.TIMEOUT]: 'Request timed out. Please try again with a shorter message.',
    [ErrorType.NETWORK]: 'Network connection issue. Please check your connection and try again.',
    [ErrorType.AUTH]: 'Authentication error. Please refresh the page and try again.',
    [ErrorType.INVALID_RESPONSE]: 'Received an unexpected response. Please try again.',
    [ErrorType.CONTEXT_TOO_LARGE]: 'Your conversation history is too long. Try clearing the chat and starting fresh.',
    [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
  };
  
  return messages[errorType] || messages[ErrorType.UNKNOWN];
}

export function isRetryable(errorType) {
  return [
    ErrorType.RATE_LIMIT,
    ErrorType.TIMEOUT,
    ErrorType.NETWORK,
    ErrorType.UNKNOWN
  ].includes(errorType);
}

export function getRetryDelay(attemptNumber) {
  return BASE_DELAY * Math.pow(2, attemptNumber - 1);
}

export async function withRetry(fn, options = {}) {
  const {
    maxRetries = MAX_RETRIES,
    onRetry = () => {},
    shouldRetry = isRetryable
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);
      
      if (!shouldRetry(errorType) || attempt > maxRetries) {
        throw error;
      }
      
      const delay = getRetryDelay(attempt);
      console.log(`[withRetry] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      
      onRetry(attempt, errorType, delay);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function withTimeout(fn, timeoutMs = 30000) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    )
  ]);
}

export function getFallbackResponse(agentType) {
  const fallbacks = {
    copilot: {
      response: "I'm having trouble right now. Check your dashboard for today's priorities.",
      actions: []
    },
    advisor: {
      response: "Temporarily unavailable. Focus on your highest-priority tasks for today.",
      actions: []
    },
    market: {
      response: "Unable to analyze market data right now. View your market page for manual review.",
      actions: []
    },
    nova: {
      response: "Temporarily unavailable. Check your calendar and email manually.",
      actions: []
    },
    sirius: {
      response: "Unable to generate content. Try the Content Studio for templates.",
      actions: []
    },
    vega: {
      response: "Unable to access transactions. Check them manually.",
      actions: []
    }
  };
  
  return fallbacks[agentType] || fallbacks.copilot;
}

export function logError(error, context = {}) {
  const errorType = classifyError(error);
  const timestamp = new Date().toISOString();
  
  const errorLog = {
    timestamp,
    errorType,
    message: error.message,
    stack: error.stack,
    context
  };
  
  console.error('[AI Error]', errorLog);
  
  return errorLog;
}

export function sanitizeError(error) {
  return {
    message: getUserMessage(classifyError(error)),
    type: classifyError(error),
    timestamp: new Date().toISOString()
  };
}

export default {
  classifyError,
  getUserMessage,
  isRetryable,
  getRetryDelay,
  withRetry,
  withTimeout,
  getFallbackResponse,
  logError,
  sanitizeError,
  ErrorType
};