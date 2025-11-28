/**
 * PULSE Intelligence - Action Mapper
 * Version: 2.0 - Enhanced with Unified Action Bar
 * 
 * Maps AI responses to executable actions
 * Eliminates duplicate buttons and consolidates actions intelligently
 */

/**
 * Extract executable actions from AI response text and connections
 * Enhanced to detect suggested actions and content previews
 * Phase 5: Unified action bar - no duplicates
 * 
 * @param {string} responseText - The AI's response
 * @param {array} connections - User's connected services
 * @param {object} metadata - Additional context (agentType, etc.)
 * @returns {array} Array of unique action objects
 */
export function extractExecutableActions(responseText, connections = [], metadata = {}) {
  const actions = [];
  const lower = responseText.toLowerCase();
  const actionMap = new Map(); // Use Map to prevent duplicates

  // Helper to add unique action
  const addAction = (key, action) => {
    if (!actionMap.has(key)) {
      actionMap.set(key, action);
    }
  };

  // Content generation actions (SIRIUS)
  if (metadata.agentType === 'content_agent' || metadata.agentType === 'SIRIUS') {
    // Only show generation buttons if content hasn't been created yet
    const hasContentPreview = responseText.includes('Caption:') || 
                               responseText.includes('here\'s your draft') ||
                               responseText.includes('check out this');

    if (!hasContentPreview) {
      if (lower.includes('post') || lower.includes('caption') || lower.includes('draft')) {
        addAction('generate_post', {
          label: 'Generate Post',
          tool: 'generateSocialPostTool',
          args: {},
          suggested: true
        });
      }

      if (lower.includes('image') || lower.includes('graphic') || lower.includes('visual')) {
        addAction('generate_image', {
          label: 'Generate Image',
          tool: 'generateImageTool',
          args: {},
          suggested: true
        });
      }
    }

    // Platform-specific publishing (only after content exists)
    if (hasContentPreview) {
      const hasInstagram = connections.some(c => c.serviceName === 'instagram');
      const hasFacebook = connections.some(c => c.serviceName === 'facebook');
      const hasLinkedIn = connections.some(c => c.serviceName === 'linkedin');

      if (hasInstagram) {
        addAction('publish_instagram', {
          label: 'Publish to Instagram',
          tool: 'publishInstagramPostTool',
          args: {}
        });
      }
      
      if (hasFacebook) {
        addAction('publish_facebook', {
          label: 'Publish to Facebook',
          tool: 'publishFacebookPostTool',
          args: {}
        });
      }
      
      if (hasLinkedIn) {
        addAction('publish_linkedin', {
          label: 'Publish to LinkedIn',
          tool: 'publishLinkedInPostTool',
          args: {}
        });
      }

      // Always show save draft option
      addAction('save_draft', {
        label: 'Save Draft',
        tool: 'saveContentDraft',
        args: {}
      });
    }
  }

  // Scheduling actions (NOVA)
  if (metadata.agentType === 'executive_assistant' || metadata.agentType === 'NOVA') {
    const hasGoogle = connections.some(c => c.serviceName === 'google_workspace');
    const hasZoom = connections.some(c => c.serviceName === 'zoom');
    const hasMicrosoft = connections.some(c => c.serviceName === 'microsoft_365');

    if (lower.includes('meeting') || lower.includes('schedule') || lower.includes('calendar')) {
      if (hasGoogle) {
        addAction('schedule_meeting', {
          label: 'Schedule Meeting',
          tool: 'scheduleGoogleCalendarEventTool',
          args: {},
          suggested: true
        });
      }
      
      if (hasZoom) {
        addAction('create_zoom', {
          label: 'Create Zoom Meeting',
          tool: 'scheduleZoomMeetingTool',
          args: {},
          suggested: true
        });
      }
    }

    if (lower.includes('email') || lower.includes('send') || lower.includes('draft')) {
      // Check if email preview exists
      const hasEmailPreview = responseText.includes('Subject:') || responseText.includes('To:');

      if (hasEmailPreview) {
        // Show send button only after preview
        if (hasGoogle) {
          addAction('send_email', {
            label: 'Send Email',
            tool: 'sendGoogleEmailTool',
            args: {}
          });
        } else if (hasMicrosoft) {
          addAction('send_email', {
            label: 'Send Email',
            tool: 'sendMicrosoftEmailTool',
            args: {}
          });
        }
      } else {
        // Show draft button before preview
        if (hasGoogle) {
          addAction('draft_email', {
            label: 'Draft Email',
            tool: 'sendGoogleEmailTool',
            args: {},
            suggested: true
          });
        } else if (hasMicrosoft) {
          addAction('draft_email', {
            label: 'Draft Email',
            tool: 'sendMicrosoftEmailTool',
            args: {},
            suggested: true
          });
        }
      }
    }

    if (lower.includes('reminder') || lower.includes('remind')) {
      addAction('create_reminder', {
        label: 'Create Reminder',
        tool: 'createTaskTool',
        args: {},
        suggested: true
      });
    }
  }

  // Transaction actions (VEGA)
  if (metadata.agentType === 'transaction_coordinator' || metadata.agentType === 'VEGA') {
    if (lower.includes('upload') || lower.includes('document')) {
      addAction('upload_document', {
        label: 'Upload Document',
        tool: 'uploadSkySlopeDocumentTool',
        args: {},
        suggested: true
      });
    }

    if (lower.includes('transaction') || lower.includes('deal')) {
      addAction('update_transaction', {
        label: 'Update Transaction',
        tool: 'updateTransactionTool',
        args: {},
        suggested: true
      });

      addAction('view_details', {
        label: 'View Details',
        tool: 'getTransactionsTool',
        args: {},
        suggested: true
      });
    }

    if (lower.includes('milestone') || lower.includes('checklist')) {
      addAction('update_milestone', {
        label: 'Update Milestone',
        tool: 'updateTransactionMilestoneTool',
        args: {},
        suggested: true
      });
    }
  }

  // Copilot actions (general assistant)
  if (metadata.agentType === 'copilot') {
    if (lower.includes('research') || lower.includes('find out') || lower.includes('look up')) {
      addAction('research', {
        label: 'Research Topic',
        tool: 'researchTopicTool',
        args: {},
        suggested: true
      });
    }

    if (lower.includes('analyze') || lower.includes('review')) {
      addAction('analyze', {
        label: 'Analyze Performance',
        tool: 'analyzeBusinessPerformanceTool',
        args: {},
        suggested: true
      });
    }

    if (lower.includes('task') || lower.includes('to-do')) {
      addAction('create_task', {
        label: 'Create Task',
        tool: 'createTaskTool',
        args: {},
        suggested: true
      });
    }
  }

  // Convert Map to Array
  return Array.from(actionMap.values());
}

/**
 * Parse content preview from AI response
 * Enhanced for Phase 5 with better detection
 * 
 * @param {string} responseText - AI response
 * @returns {object|null} Preview object or null
 */
export function parseContentPreview(responseText) {
  // Check for social media post
  const captionMatch = responseText.match(/Caption:?\s*["']?([^"'\n]+)["']?/i) ||
                       responseText.match(/here's your (?:draft|caption):?\s*["']?([^"'\n]+)["']?/i) ||
                       responseText.match(/["']([^"']{30,})["']/);

  const hashtagMatch = responseText.match(/(#\w+(?:\s+#\w+)*)/g);
  const imageUrlMatch = responseText.match(/https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)/i);

  if (captionMatch || hashtagMatch || imageUrlMatch) {
    return {
      type: 'content_post',
      imageUrl: imageUrlMatch ? imageUrlMatch[0] : null,
      caption: captionMatch ? captionMatch[1].trim() : null,
      hashtags: hashtagMatch ? hashtagMatch.join(' ') : null,
      actions: [
        { label: 'Publish to Instagram', tool: 'publishInstagramPostTool', args: {} },
        { label: 'Publish to Facebook', tool: 'publishFacebookPostTool', args: {} },
        { label: 'Save Draft', tool: 'saveContentDraft', args: {} }
      ]
    };
  }

  // Check for email preview
  const subjectMatch = responseText.match(/Subject:?\s*["']?([^"'\n]+)["']?/i);
  const toMatch = responseText.match(/To:?\s*["']?([^"'\n]+)["']?/i);
  const emailBodyMatch = responseText.match(/(?:Body|Message):?\s*["']?([^"']+)["']?/is);

  if (subjectMatch && (toMatch || emailBodyMatch)) {
    return {
      type: 'email',
      subject: subjectMatch[1].trim(),
      recipients: toMatch ? toMatch[1].split(',').map(r => r.trim()) : [],
      body: emailBodyMatch ? emailBodyMatch[1].trim() : '',
      actions: [
        { label: 'Send Email', tool: 'sendGoogleEmailTool', args: {} },
        { label: 'Edit Email', type: 'edit' }
      ]
    };
  }

  // Check for document
  const docMatch = responseText.match(/(?:document|file|report).*?(?:ready|created|generated)/i);
  if (docMatch) {
    return {
      type: 'document',
      fileName: 'Generated Document',
      actions: [
        { label: 'Download', tool: 'downloadDocument', args: {} },
        { label: 'Share', tool: 'shareDocument', args: {} }
      ]
    };
  }

  return null;
}

/**
 * Consolidate actions from multiple sources
 * Removes duplicates and prioritizes primary actions
 * 
 * @param {array} actions - Array of action objects
 * @returns {array} Consolidated actions
 */
export function consolidateActions(actions) {
  const actionMap = new Map();
  const priorityOrder = ['Publish', 'Send', 'Schedule', 'Create', 'Save', 'Edit'];

  actions.forEach(action => {
    const key = action.tool || action.label;
    if (!actionMap.has(key)) {
      actionMap.set(key, action);
    }
  });

  // Sort by priority
  const consolidated = Array.from(actionMap.values());
  consolidated.sort((a, b) => {
    const aPriority = priorityOrder.findIndex(p => a.label?.includes(p));
    const bPriority = priorityOrder.findIndex(p => b.label?.includes(p));
    
    if (aPriority === -1 && bPriority === -1) return 0;
    if (aPriority === -1) return 1;
    if (bPriority === -1) return -1;
    
    return aPriority - bPriority;
  });

  return consolidated;
}