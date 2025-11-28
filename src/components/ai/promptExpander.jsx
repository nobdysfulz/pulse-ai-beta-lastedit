/**
 * PULSE Intelligence - Prompt Expander
 * Converts unstructured, informal, or shorthand user input into clear, 
 * context-aware requests that the Intent Router can process.
 * 
 * Version: 1.0
 */

/**
 * Expand shorthand or vague user input into structured prompts
 * @param {string} rawInput - The user's original message
 * @param {object} lastContext - Last known intent/context from session
 * @returns {string} Expanded, clear prompt
 */
export function expandPrompt(rawInput, lastContext = null) {
  const lower = rawInput.toLowerCase().trim();
  
  // Phrase-based replacements
  const replacements = {
    "make it pop": "enhance the visual design and color contrast",
    "make it sound better": "refine the wording and improve tone",
    "do that again": "repeat the previous action with the same settings",
    "start over": "restart the current task or campaign from scratch",
    "fix it": "review and correct any errors or inconsistencies",
    "help me out": "provide guidance and next steps",
    "post it": "publish the generated content to connected platforms",
    "send it": "send the generated email or message",
    "change the tone": "adjust the tone of voice for this content",
    "make it more luxury": "rewrite using luxury-style language and visuals",
    "make it more casual": "rewrite using conversational language",
    "keep going": "continue generating additional ideas or items",
    "what's next": "suggest the next best action based on my data",
    "show me again": "retrieve the last generated result or preview",
    "do it for linkedin": "repurpose for LinkedIn format and caption style",
    "do it for facebook": "repurpose for Facebook format and caption style",
    "do it for instagram": "repurpose for Instagram format and caption style",
    "do it for gmb": "repurpose for Google My Business format and caption style",
    "make it younger": "rewrite targeting a younger demographic",
    "make it professional": "rewrite in a professional, polished tone",
    "add energy": "make the content more energetic and engaging",
    "tone it down": "make the content more subtle and understated",
    "clean it up": "refine and polish the content",
    "polish it": "refine and improve the overall quality",
    "tighten it": "make it more concise and focused"
  };

  let expanded = lower;
  
  // Apply phrase replacements
  for (const [phrase, replacement] of Object.entries(replacements)) {
    if (expanded.includes(phrase)) {
      expanded = expanded.replace(phrase, replacement);
    }
  }

  // Context expansion - if user says "do it again" after a previous action
  if (expanded.match(/repeat|again/) && lastContext?.intent) {
    expanded += ` using the same intent: ${lastContext.intent} and context: ${JSON.stringify(lastContext.context)}`;
  }

  // Handle pronouns with context linking
  if (lastContext?.lastOutputType) {
    const pronouns = ["it", "that", "those", "this"];
    const hasPronouns = pronouns.some(p => expanded.split(/\s+/).includes(p));
    
    if (hasPronouns) {
      const entityMap = {
        'post': 'the last generated social post',
        'email': 'the last generated email draft',
        'document': 'the last generated document',
        'image': 'the last generated image',
        'meeting': 'the last scheduled meeting',
        'reminder': 'the last created reminder'
      };
      
      const entity = entityMap[lastContext.lastOutputType] || 'the last item';
      expanded = expanded.replace(/\b(it|that|those|this)\b/gi, entity);
    }
  }

  // Fallback - if no expansion occurred, add clarification hint
  if (expanded === lower && expanded.split(' ').length <= 3) {
    return `${rawInput}. If unclear, suggest related actions based on context.`;
  }

  // Capitalize for clean display
  return expanded.charAt(0).toUpperCase() + expanded.slice(1);
}

/**
 * Detect if user input is a follow-up to a previous action
 * @param {string} input - User message
 * @returns {boolean} True if this is a continuation/follow-up
 */
export function isFollowUpMessage(input) {
  const followUpPatterns = [
    /\b(again|repeat|more|another|continue|keep going)\b/i,
    /\b(that|it|this|those)\b/i,
    /\b(also|and|too)\b/i,
    /^(yes|yep|yeah|sure|ok|okay|sounds good)/i
  ];
  
  return followUpPatterns.some(pattern => pattern.test(input));
}

/**
 * Extract platform references from user message
 * @param {string} input - User message
 * @returns {array} Array of platform names
 */
export function extractPlatforms(input) {
  const platforms = [];
  const lower = input.toLowerCase();
  
  if (lower.includes('linkedin')) platforms.push('linkedin');
  if (lower.includes('facebook') || lower.includes('fb')) platforms.push('facebook');
  if (lower.includes('instagram') || lower.includes('ig')) platforms.push('instagram');
  if (lower.includes('gmb') || lower.includes('google my business')) platforms.push('gmb');
  if (lower.includes('twitter') || lower.includes('x')) platforms.push('twitter');
  
  return platforms;
}