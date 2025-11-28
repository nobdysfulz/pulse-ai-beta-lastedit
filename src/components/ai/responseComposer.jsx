/**
 * PULSE Intelligence - Response Composer
 * Version: 2.0 - Enhanced with Acknowledgments and Suggestions
 * 
 * Transforms AI responses into natural, human-like communication
 * with proper acknowledgments and next-step suggestions
 */

/**
 * Detect user tone from message
 * @param {string} message - User's message
 * @returns {string} Detected tone
 */
export function detectUserTone(message) {
  const lower = message.toLowerCase();
  
  // Urgent/stressed
  if (lower.includes('asap') || lower.includes('urgent') || lower.includes('!!')) {
    return 'urgent';
  }
  
  // Casual/friendly
  if (lower.includes('hey') || lower.includes('thanks') || lower.includes('😊')) {
    return 'casual';
  }
  
  // Professional/formal
  if (lower.includes('please') || lower.includes('kindly') || lower.includes('would you')) {
    return 'professional';
  }
  
  // Direct/brief
  if (message.length < 20 && !message.includes('?')) {
    return 'brief';
  }
  
  return 'friendly';
}

/**
 * Add acknowledgment to response based on agent type
 * @param {string} userPrompt - What user asked for
 * @param {string} agentType - Which agent is responding
 * @param {string} tone - User's tone
 * @returns {string} Acknowledgment line
 */
export function generateAcknowledgment(userPrompt, agentType, tone = 'friendly') {
  const lower = userPrompt.toLowerCase();
  
  // Acknowledgments by agent type
  const acknowledgments = {
    executive_assistant: {
      schedule: ["Got it — I'll set that up for you.", "Perfect — scheduling that now.", "On it — I'll get that on your calendar."],
      email: ["Sure thing — I'll draft that email.", "Got it — composing that message now.", "Perfect — I'll send that for you."],
      reminder: ["Noted — I'll remind you about that.", "Got it — reminder set.", "Perfect — I'll make sure you don't forget."],
      default: ["Got it — I'll help with that.", "Perfect — I can handle that.", "On it — let me take care of that."]
    },
    content_agent: {
      post: ["Love it — here's your draft 👇", "Got it — here's what I created for you 👇", "Perfect — check out this draft 👇"],
      image: ["Nice — generating that visual now.", "On it — creating your image.", "Got it — I'll design that for you."],
      campaign: ["Exciting! Here's your campaign setup 👇", "Got it — here's your campaign plan 👇", "Perfect — I've outlined everything below 👇"],
      default: ["Got it — here's what I came up with 👇", "Perfect — check this out 👇", "Here's what I created for you 👇"]
    },
    transaction_coordinator: {
      upload: ["Got it — I'll upload that document.", "Perfect — adding that to SkySlope now.", "On it — uploading to your transaction file."],
      update: ["Got it — I'll update that transaction.", "Perfect — syncing those changes now.", "On it — updating the file."],
      status: ["Here's the status update you requested 👇", "Got it — here's where things stand 👇", "Perfect — here's the rundown 👇"],
      default: ["Got it — here's the information 👇", "Perfect — I've checked that for you 👇", "On it — here's what I found 👇"]
    },
    copilot: {
      analyze: ["Let me analyze that for you 👇", "Got it — here's my analysis 👇", "Perfect — I've reviewed everything 👇"],
      suggest: ["Here's what I recommend 👇", "Got it — here are some suggestions 👇", "Perfect — I have some ideas for you 👇"],
      default: ["Got it — here's what I found 👇", "Perfect — I can help with that 👇", "On it — here's the info 👇"]
    }
  };

  const agentAcks = acknowledgments[agentType] || acknowledgments.copilot;
  
  // Determine category
  let category = 'default';
  if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('calendar')) {
    category = 'schedule';
  } else if (lower.includes('email') || lower.includes('send') || lower.includes('message')) {
    category = 'email';
  } else if (lower.includes('remind') || lower.includes('reminder')) {
    category = 'reminder';
  } else if (lower.includes('post') || lower.includes('content') || lower.includes('caption')) {
    category = 'post';
  } else if (lower.includes('image') || lower.includes('graphic') || lower.includes('visual')) {
    category = 'image';
  } else if (lower.includes('campaign')) {
    category = 'campaign';
  } else if (lower.includes('upload') || lower.includes('document')) {
    category = 'upload';
  } else if (lower.includes('update') || lower.includes('change')) {
    category = 'update';
  } else if (lower.includes('status') || lower.includes('how is') || lower.includes('where are')) {
    category = 'status';
  } else if (lower.includes('analyze') || lower.includes('review')) {
    category = 'analyze';
  } else if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('what should')) {
    category = 'suggest';
  }

  const options = agentAcks[category] || agentAcks.default;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate next-step suggestion after action completion
 * @param {string} actionType - Type of action completed
 * @param {string} agentType - Which agent completed it
 * @returns {string} Suggestion text
 */
export function generateNextStepSuggestion(actionType, agentType) {
  const suggestions = {
    executive_assistant: {
      email_sent: "Want me to set a follow-up reminder?",
      meeting_scheduled: "Should I send a confirmation email to the attendees?",
      reminder_created: "Need anything else scheduled?"
    },
    content_agent: {
      post_created: "Want to schedule it or post now?",
      post_published: "Should I create another post for a different platform?",
      image_generated: "Ready to use this in a post?"
    },
    transaction_coordinator: {
      document_uploaded: "Need me to check off any compliance items?",
      transaction_updated: "Want a summary email sent to all parties?",
      milestone_completed: "Should I notify the client?"
    }
  };

  const agentSuggestions = suggestions[agentType] || {};
  return agentSuggestions[actionType] || null;
}

/**
 * Compose full response with acknowledgment + content + suggestion
 * @param {object} params - Response parameters
 * @returns {string} Composed response
 */
export function composeResponse({
  userPrompt,
  agentType,
  content,
  tone = 'friendly',
  addAcknowledgment = true,
  addSuggestion = false,
  actionType = null
}) {
  let response = '';

  // Add acknowledgment
  if (addAcknowledgment) {
    const ack = generateAcknowledgment(userPrompt, agentType, tone);
    response += ack + '\n\n';
  }

  // Add main content
  response += content;

  // Add suggestion
  if (addSuggestion && actionType) {
    const suggestion = generateNextStepSuggestion(actionType, agentType);
    if (suggestion) {
      response += '\n\n' + suggestion;
    }
  }

  return response;
}

/**
 * Humanize tool execution result
 * Converts technical confirmations into natural language
 * 
 * @param {string} toolName - Name of the tool executed
 * @param {object} result - Tool execution result
 * @param {string} agentType - Which agent executed it
 * @returns {string} Human-friendly confirmation
 */
export function humanizeToolResult(toolName, result, agentType) {
  const confirmations = {
    // Email tools
    sendGoogleEmailTool: "Email sent! I've logged it in your Gmail.",
    sendMicrosoftEmailTool: "Email sent! It's in your Outlook sent folder.",
    sendEmailTool: "Email sent successfully!",
    
    // Calendar tools
    scheduleGoogleCalendarEventTool: "Meeting scheduled! Invite sent to all attendees.",
    scheduleZoomMeetingTool: "Zoom meeting created! Link sent to participants.",
    scheduleCompleteMeeting: "Meeting confirmed and invites sent!",
    
    // Social media tools
    publishInstagramPostTool: "Posted to Instagram! Your content is live.",
    publishFacebookPostTool: "Posted to Facebook! Check your page to see it.",
    publishLinkedInPostTool: "Posted to LinkedIn! Your network can now see it.",
    
    // Content generation
    generateSocialPostTool: "Here's your social post — ready to publish or edit!",
    generateImageTool: "Image generated! You can download or use it in a post.",
    generateMarketReportTool: "Market report ready! Review it below.",
    
    // Transaction tools
    uploadSkySlopeDocumentTool: "Document uploaded to SkySlope and logged!",
    updateTransactionTool: "Transaction updated — all changes synced!",
    createTransactionTool: "New transaction created successfully!",
    updateTransactionMilestoneTool: "Milestone updated — everyone's been notified!",
    
    // Task tools
    createTaskTool: "Task created! I've added it to your to-do list.",
    createLoftyTaskTool: "Task created in Lofty and synced!",
    
    // Research tools
    researchTopicTool: "Research complete! Here's what I found:",
    
    // Document tools
    createDocumentTool: "Document created and saved!",
    createGoogleDocTool: "Google Doc created — link is ready to share!"
  };

  // Get confirmation message
  let message = confirmations[toolName] || "All set — that's been completed!";
  
  // Add result-specific details if available
  if (result) {
    if (result.subject && toolName.includes('Email')) {
      message += ` (Subject: "${result.subject}")`;
    }
    if (result.title && toolName.includes('Meeting')) {
      message += ` (${result.title})`;
    }
    if (result.platform && toolName.includes('Post')) {
      message += ` Your engagement should start rolling in soon.`;
    }
  }

  // Add next-step suggestion
  const suggestion = generateNextStepSuggestion(
    toolName.replace('Tool', '').toLowerCase(),
    agentType
  );
  
  if (suggestion) {
    message += '\n\n' + suggestion;
  }

  return message;
}

/**
 * Format response with proper line breaks and emphasis
 * @param {string} text - Raw response text
 * @returns {string} Formatted response
 */
export function formatResponse(text) {
  // Remove excessive line breaks
  let formatted = text.replace(/\n{3,}/g, '\n\n');
  
  // Ensure lists are properly formatted
  formatted = formatted.replace(/([•\-\*])\s*/g, '$1 ');
  
  // Ensure proper spacing around emojis
  formatted = formatted.replace(/([^\s])([\u{1F300}-\u{1F9FF}])/gu, '$1 $2');
  formatted = formatted.replace(/([\u{1F300}-\u{1F9FF}])([^\s])/gu, '$1 $2');
  
  return formatted.trim();
}