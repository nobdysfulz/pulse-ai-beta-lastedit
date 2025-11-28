/**
 * Response Formatter
 * Ensures all AI responses are properly formatted, truncated, and structured
 */

const MAX_RESPONSE_LENGTH = 800;
const MAX_ACTION_ITEMS = 5;

/**
 * Format AI response to ensure compact, structured output
 */
export function formatResponse(rawResponse, options = {}) {
  const {
    maxLength = MAX_RESPONSE_LENGTH,
    allowMarkdown = true,
    stripUrls = false
  } = options;

  if (!rawResponse) return '';

  let formatted = rawResponse.trim();

  // Strip URLs if requested
  if (stripUrls) {
    formatted = formatted.replace(/https?:\/\/[^\s]+/g, '[link]');
  }

  // Clean up excessive whitespace
  formatted = formatted.replace(/\n\n\n+/g, '\n\n');
  formatted = formatted.replace(/\s+/g, ' ');

  // Ensure response ends with proper punctuation
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.';
  }

  return formatted;
}

/**
 * Extract action items from AI response
 * Looks for common patterns like bullet points, numbered lists, etc.
 */
export function extractActions(response) {
  if (!response) return [];

  const actions = [];
  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match bullet points (-, *, •)
    const bulletMatch = trimmed.match(/^[•\-*]\s+(.+)$/);
    if (bulletMatch) {
      actions.push({
        type: 'recommendation',
        label: bulletMatch[1].trim()
      });
      continue;
    }

    // Match numbered lists (1., 2., etc.)
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      actions.push({
        type: 'recommendation',
        label: numberedMatch[1].trim()
      });
      continue;
    }

    // Match action indicators
    if (
      trimmed.toLowerCase().startsWith('action:') ||
      trimmed.toLowerCase().startsWith('next step:') ||
      trimmed.toLowerCase().startsWith('recommendation:')
    ) {
      const actionText = trimmed.split(':').slice(1).join(':').trim();
      if (actionText) {
        actions.push({
          type: 'action',
          label: actionText
        });
      }
    }
  }

  return actions.slice(0, MAX_ACTION_ITEMS);
}

/**
 * Parse structured response (JSON or markdown)
 */
export function parseStructuredResponse(response) {
  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(response);
    return {
      type: 'json',
      data: parsed
    };
  } catch (e) {
    // Not JSON, check for markdown structure
    const sections = {};
    const lines = response.split('\n');
    let currentSection = 'main';
    let currentContent = [];

    for (const line of lines) {
      // Check for markdown headers
      const headerMatch = line.match(/^#+\s+(.+)$/);
      if (headerMatch) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = headerMatch[1].toLowerCase().replace(/\s+/g, '_');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Add final section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return {
      type: 'markdown',
      sections
    };
  }
}

/**
 * Enforce token limits on prompts before sending to LLM
 */
export function truncatePrompt(prompt, maxTokens = 2000) {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  
  if (prompt.length <= maxChars) {
    return prompt;
  }

  // Truncate intelligently at sentence boundaries
  const truncated = prompt.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  const cutoff = Math.max(lastPeriod, lastNewline);
  if (cutoff > maxChars * 0.8) {
    return truncated.substring(0, cutoff + 1);
  }

  return truncated + '...';
}

/**
 * Calculate approximate token count
 */
export function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Sanitize user input before sending to AI
 */
export function sanitizeInput(input) {
  if (!input) return '';
  
  let sanitized = input.trim();
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }
  
  return sanitized;
}

/**
 * Build concise system prompt
 */
export function buildSystemPrompt(agentType, context) {
  const basePrompts = {
    copilot: 'You are PULSE Intelligence — a professional AI assistant for real estate agents. Be concise, data-driven, and actionable.',
    advisor: 'You are the agent\'s business advisor. Provide strategic insights based on their data. Be conversational and encouraging.',
    market: 'You are a market intelligence expert. Analyze trends and provide actionable market insights.',
    nova: 'You are NOVA, an executive assistant. Be efficient and action-oriented.',
    sirius: 'You are SIRIUS, a creative marketing agent. Generate engaging content with clear calls to action.',
    vega: 'You are VEGA, a transaction coordinator. Be structured and detail-oriented.'
  };

  const basePrompt = basePrompts[agentType] || basePrompts.copilot;

  const contextSummary = context ? `\n\nContext:\n${JSON.stringify(context, null, 2)}` : '';

  return `${basePrompt}

CRITICAL RULES:
1. Keep responses under 800 characters unless generating detailed content
2. Use bullet points for lists
3. End with clear next steps when applicable
4. Be specific and reference the user's data
5. Never repeat information unnecessarily${contextSummary}`;
}

/**
 * Extract metadata from response
 */
export function extractMetadata(response) {
  const metadata = {
    length: response.length,
    tokens: estimateTokens(response),
    hasActions: response.includes('Action:') || response.includes('Next step:'),
    hasList: /^[-*•]\s/m.test(response) || /^\d+\.\s/m.test(response),
    sentiment: analyzeSentiment(response)
  };

  return metadata;
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(text) {
  const positive = ['great', 'excellent', 'strong', 'improved', 'opportunity', 'success'];
  const negative = ['concern', 'decline', 'weak', 'risk', 'behind', 'issue'];
  
  const lowerText = text.toLowerCase();
  
  const positiveCount = positive.filter(word => lowerText.includes(word)).length;
  const negativeCount = negative.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

export default {
  formatResponse,
  extractActions,
  parseStructuredResponse,
  truncatePrompt,
  estimateTokens,
  sanitizeInput,
  buildSystemPrompt,
  extractMetadata
};