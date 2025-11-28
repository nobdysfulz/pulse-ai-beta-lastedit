/**
 * PULSE Intelligence - Model Router
 * Version: 1.0
 * 
 * Routes AI requests to the optimal LLM model based on context,
 * query type, and performance requirements.
 */

export const MODEL_CONFIG = {
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    maxTokens: 2048,
    latencyTarget: 1500, // ms
    costPer1K: 0.05,
    useCases: ['Quick responses', 'Short context', 'FAQs', 'Confirmations']
  },
  'gpt-4o': {
    name: 'gpt-4o',
    maxTokens: 8192,
    latencyTarget: 3000, // ms
    costPer1K: 0.30,
    useCases: ['Analytical reasoning', 'Business insights', 'Multi-source synthesis']
  },
  'gpt-4o-turbo': {
    name: 'gpt-4-turbo-preview',
    maxTokens: 16384,
    latencyTarget: 4500, // ms
    costPer1K: 0.60,
    useCases: ['Creative content', 'Long-form generation', 'Complex reasoning']
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    maxTokens: 2048,
    latencyTarget: 2000, // ms
    costPer1K: 0.01,
    useCases: ['Fallback', 'Budget mode']
  }
};

export const FEATURE_MODEL_MAP = {
  // Dashboard
  'dashboard_insights': 'gpt-4o-mini',
  'dashboard_advisor': 'gpt-4o',
  
  // To-Do / Analytics
  'todo_analytics': 'gpt-4o-mini',
  
  // Content Studio
  'content_creator': 'gpt-4o-turbo',
  'content_short': 'gpt-4o',
  
  // Market
  'market_analysis': 'gpt-4o',
  'market_query': 'gpt-4o',
  
  // Agents
  'nova': 'gpt-4o-mini',
  'sirius': 'gpt-4o-turbo',
  'phoenix': 'gpt-4o',
  'vega': 'gpt-4o-mini',
  
  // Copilot
  'copilot': 'gpt-4o',
  
  // Fallback
  'fallback': 'gpt-3.5-turbo'
};

/**
 * Select the optimal model for a given context
 */
export function selectModel(context) {
  const {
    type,        // 'content', 'analytics', 'quick', etc.
    agent,       // 'NOVA', 'SIRIUS', 'VEGA', 'advisor', etc.
    length,      // estimated input length
    quick,       // boolean flag for quick responses
    feature      // specific feature name
  } = context;

  // Feature-based routing (most specific)
  if (feature && FEATURE_MODEL_MAP[feature]) {
    return FEATURE_MODEL_MAP[feature];
  }

  // Agent-based routing
  if (agent) {
    const agentLower = agent.toLowerCase();
    if (FEATURE_MODEL_MAP[agentLower]) {
      return FEATURE_MODEL_MAP[agentLower];
    }
  }

  // Content-based routing
  if (type === 'content' && length > 500) {
    return 'gpt-4o-turbo';
  }

  if (type === 'analytics' || agent === 'advisor') {
    return 'gpt-4o';
  }

  // Quick response routing
  if (quick || agent === 'NOVA' || agent === 'VEGA') {
    return 'gpt-4o-mini';
  }

  // Default
  return 'gpt-4o';
}

/**
 * Get max tokens for a model
 */
export function getMaxTokens(modelName, contextLength = 0) {
  const model = MODEL_CONFIG[modelName] || MODEL_CONFIG['gpt-4o'];
  
  // For quick tasks, limit tokens further
  if (contextLength < 300 && modelName === 'gpt-4o-mini') {
    return 300;
  }
  
  return model.maxTokens;
}

/**
 * Get fallback model if primary fails
 */
export function getFallbackModel(primaryModel) {
  const fallbackChain = {
    'gpt-4o-turbo': 'gpt-4o',
    'gpt-4o': 'gpt-4o-mini',
    'gpt-4o-mini': 'gpt-3.5-turbo',
    'gpt-3.5-turbo': null // no fallback
  };

  return fallbackChain[primaryModel] || 'gpt-3.5-turbo';
}

/**
 * Log model usage for analytics
 */
export function logModelUsage(modelName, context, latency, cacheHit, tokenCount) {
  if (typeof window !== 'undefined') {
    const log = {
      timestamp: Date.now(),
      model: modelName,
      feature: context.feature || context.agent,
      latency,
      cacheHit,
      tokenCount
    };
    
    console.log('[ModelRouter]', log);
    
    // Store in local storage for debugging (last 100 entries)
    try {
      const logs = JSON.parse(localStorage.getItem('pulse_model_logs') || '[]');
      logs.unshift(log);
      localStorage.setItem('pulse_model_logs', JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      // Silent fail
    }
  }
}