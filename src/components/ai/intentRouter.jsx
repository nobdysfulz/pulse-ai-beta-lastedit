/**
 * PULSE Intelligence - Intent Router
 * Automatically interprets user messages and maps them to the right tool, 
 * agent, or action without needing specific commands.
 * 
 * Version: 1.0
 */

// Rule-based keyword matching for fast routing
const INTENT_RULES = {
  // NOVA (Executive Assistant)
  executive_assistant: {
    keywords: ['schedule', 'book', 'reminder', 'remind', 'add to calendar', 'reschedule', 
               'meeting', 'appointment', 'email', 'send email', 'draft email', 'inbox'],
    intents: {
      schedule_meeting: ['schedule', 'book', 'meeting', 'appointment', 'zoom', 'calendar'],
      create_reminder: ['remind', 'reminder', 'follow up'],
      send_email: ['email', 'send', 'draft', 'message'],
      reschedule_event: ['reschedule', 'move', 'change time']
    }
  },
  
  // SIRIUS (Content Agent)
  content_agent: {
    keywords: ['post', 'caption', 'content', 'video', 'reel', 'design', 'hashtag', 
               'image', 'social', 'instagram', 'facebook', 'linkedin', 'gmb'],
    intents: {
      create_social_post: ['post', 'caption', 'social', 'content', 'create'],
      generate_image: ['image', 'graphic', 'design', 'visual'],
      generate_video_script: ['video', 'reel', 'script'],
      optimize_caption: ['hashtag', 'optimize', 'improve caption'],
      expand_posting_channels: ['add', 'include', 'also post to'],
      retrieve_content_draft: ['show', 'draft', 'preview', 'earlier']
    }
  },
  
  // VEGA (Transaction Coordinator)
  transaction_coordinator: {
    keywords: ['contract', 'disclosure', 'offer', 'checklist', 'upload', 'skyslope', 
               'file', 'transaction', 'docs', 'document', 'deal'],
    intents: {
      upload_document: ['upload', 'file', 'document', 'form'],
      get_transaction_status: ['status', 'update', 'progress', 'checklist'],
      add_contact_to_transaction: ['add', 'contact', 'party'],
      send_deadline_reminder: ['reminder', 'deadline', 'due'],
      generate_transaction_summary: ['summarize', 'summary', 'overview']
    }
  },
  
  // PHOENIX (Lead Concierge)
  leads_agent: {
    keywords: ['call', 'text', 'follow up', 'nurture', 'prospect', 'new lead', 
               'crm', 'conversation', 'leads', 'pipeline', 'contact'],
    intents: {
      call_leads: ['call', 'phone', 'reach out'],
      text_followup: ['text', 'sms', 'message'],
      analyze_followup_needs: ['who', 'which leads', 'priority'],
      add_lead: ['add', 'new lead', 'create contact'],
      initiate_call_sequence: ['campaign', 'sequence', 'calling']
    }
  },
  
  // ADVISOR (Strategy/Coaching) - note: not currently implemented as separate agent
  advisor: {
    keywords: ['market', 'pricing', 'performance', 'goal', 'analytics', 'insight', 
               'analyze', 'advise', 'strategy', 'how am i doing'],
    intents: {
      analyze_performance: ['performance', 'doing', 'progress', 'stats'],
      generate_focus_plan: ['focus', 'plan', 'next week', 'priorities'],
      analyze_goal_progress: ['goal', 'target', 'on track'],
      generate_weekly_report: ['weekly', 'summary', 'report'],
      analyze_market_trends: ['market', 'trends', 'pricing', 'inventory']
    }
  }
};

/**
 * Route user intent using rule-based matching + LLM fallback
 * @param {string} userMessage - The user's input message
 * @param {object} sessionContext - Current session context
 * @returns {object} Intent object with agent, intent, confidence, and context
 */
export async function routeIntent(userMessage, sessionContext = {}) {
  const normalized = normalizeMessage(userMessage);
  
  // Step 1: Try rule-based matching first (fast)
  const ruleBasedResult = matchRuleBasedIntent(normalized, sessionContext);
  
  if (ruleBasedResult.confidence >= 0.85) {
    console.log('[IntentRouter] Rule-based match:', ruleBasedResult);
    return ruleBasedResult;
  }
  
  // Step 2: Fallback to LLM classifier for ambiguous cases
  console.log('[IntentRouter] Falling back to LLM classifier');
  const llmResult = await classifyWithLLM(userMessage, sessionContext);
  
  return llmResult;
}

/**
 * Normalize message by lowercasing and removing filler words
 * @param {string} message - Raw user message
 * @returns {string} Normalized message
 */
function normalizeMessage(message) {
  const fillerWords = ['hey', 'please', 'can you', 'could you', 'would you', 
                       'um', 'uh', 'like', 'just', 'maybe'];
  
  let normalized = message.toLowerCase().trim();
  
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  });
  
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Match intent using keyword rules
 * @param {string} normalized - Normalized message
 * @param {object} sessionContext - Session context
 * @returns {object} Intent result with confidence
 */
function matchRuleBasedIntent(normalized, sessionContext) {
  let bestMatch = {
    intent: 'general_query',
    agent: sessionContext.currentAgent || 'executive_assistant',
    confidence: 0,
    context: {}
  };
  
  // Check each agent's keywords
  for (const [agentKey, rules] of Object.entries(INTENT_RULES)) {
    const keywordMatches = rules.keywords.filter(kw => normalized.includes(kw)).length;
    
    if (keywordMatches > 0) {
      // Check specific intents
      for (const [intentName, intentKeywords] of Object.entries(rules.intents)) {
        const intentMatches = intentKeywords.filter(kw => normalized.includes(kw)).length;
        
        if (intentMatches > 0) {
          const confidence = Math.min(0.95, (keywordMatches + intentMatches) / 10);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              intent: intentName,
              agent: agentKey,
              confidence,
              context: extractContext(normalized, intentName)
            };
          }
        }
      }
      
      // Generic agent match without specific intent
      if (bestMatch.confidence === 0 && keywordMatches >= 2) {
        bestMatch = {
          intent: 'general_query',
          agent: agentKey,
          confidence: 0.7,
          context: extractContext(normalized, 'general_query')
        };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Extract contextual information from the message
 * @param {string} message - Normalized message
 * @param {string} intent - Detected intent
 * @returns {object} Context object
 */
function extractContext(message, intent) {
  const context = {};
  
  // Extract platforms
  const platforms = [];
  if (message.includes('linkedin')) platforms.push('LinkedIn');
  if (message.includes('facebook') || message.includes('fb')) platforms.push('Facebook');
  if (message.includes('instagram') || message.includes('ig')) platforms.push('Instagram');
  if (message.includes('gmb') || message.includes('google my business')) platforms.push('GMB');
  if (platforms.length > 0) context.platforms = platforms;
  
  // Extract tone
  if (message.includes('casual') || message.includes('chill') || message.includes('relaxed')) {
    context.tone = 'casual';
  } else if (message.includes('professional') || message.includes('formal') || message.includes('polished')) {
    context.tone = 'professional';
  } else if (message.includes('luxury') || message.includes('high-end') || message.includes('upscale')) {
    context.tone = 'luxury';
  } else if (message.includes('inspirational') || message.includes('motivational')) {
    context.tone = 'inspirational';
  }
  
  // Extract timeframe
  if (message.includes('tomorrow')) context.timeframe = 'tomorrow';
  else if (message.includes('today')) context.timeframe = 'today';
  else if (message.includes('this week')) context.timeframe = 'this_week';
  else if (message.includes('next week')) context.timeframe = 'next_week';
  else if (message.includes('daily')) context.frequency = 'daily';
  
  // Extract topic/subject
  const topicPatterns = [
    { regex: /about\s+(\w+(?:\s+\w+){0,3})/i, key: 'topic' },
    { regex: /for\s+(\w+(?:\s+\w+){0,2})/i, key: 'target' }
  ];
  
  topicPatterns.forEach(({ regex, key }) => {
    const match = message.match(regex);
    if (match) context[key] = match[1];
  });
  
  return context;
}

/**
 * Classify intent using LLM when rule-based matching fails
 * @param {string} userMessage - Original user message
 * @param {object} sessionContext - Session context
 * @returns {object} Intent classification result
 */
async function classifyWithLLM(userMessage, sessionContext) {
  try {
    const { base44 } = await import('@/api/base44Client');
    
    const systemPrompt = `You are an intent classifier for a real estate AI assistant platform.
    
Classify the user's message into one of these agents:
- executive_assistant (NOVA): scheduling, emails, reminders, organization
- content_agent (SIRIUS): social posts, content creation, marketing
- transaction_coordinator (VEGA): deals, documents, compliance, transactions
- leads_agent (PHOENIX): lead follow-up, calls, pipeline management

Return JSON with this structure:
{
  "intent": "specific_action_name",
  "agent": "agent_key",
  "confidence": 0.0-1.0,
  "context": {
    "topic": "optional_topic",
    "tone": "optional_tone",
    "platforms": ["optional_platforms"],
    "timeframe": "optional_timeframe"
  }
}

Current session context: ${JSON.stringify(sessionContext)}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `User message: "${userMessage}"\n\nClassify this intent.`,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          agent: { type: "string" },
          confidence: { type: "number" },
          context: { 
            type: "object",
            properties: {
              topic: { type: "string" },
              tone: { type: "string" },
              platforms: { type: "array", items: { type: "string" } },
              timeframe: { type: "string" }
            }
          }
        },
        required: ["intent", "agent", "confidence"]
      }
    });
    
    return {
      intent: result.intent || 'general_query',
      agent: result.agent || 'executive_assistant',
      confidence: result.confidence || 0.5,
      context: result.context || {}
    };
    
  } catch (error) {
    console.error('[IntentRouter] LLM classification failed:', error);
    
    // Ultimate fallback
    return {
      intent: 'general_query',
      agent: sessionContext.currentAgent || 'executive_assistant',
      confidence: 0.3,
      context: {}
    };
  }
}

/**
 * Determine if clarification is needed based on confidence
 * @param {number} confidence - Intent confidence score
 * @returns {string|null} Clarification type or null
 */
export function needsClarification(confidence) {
  if (confidence >= 0.85) return null;
  if (confidence >= 0.65) return 'soft'; // "Just to confirm..."
  return 'hard'; // "Can you tell me what you'd like me to do?"
}