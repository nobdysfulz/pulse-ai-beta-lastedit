/**
 * PULSE Intelligence - Chat Controls & Session Management
 * Manages chat sessions, abort controllers, and conversation context
 * 
 * Version: 2.0 - Enhanced with Context Memory Threading
 */

import { sessionCache } from './sessionCache';

export class ChatSessionManager {
  constructor(agentType, userId) {
    this.agentType = agentType;
    this.userId = userId;
    this.sessionId = `${userId}_${agentType}_${Date.now()}`;
    this.abortController = null;
    this.lastActivity = Date.now();
    
    // Context Memory Threading - stores conversation context
    this.contextMemory = this.loadContextMemory();
  }

  /**
   * Create abort controller for stopping generation
   */
  createAbortController() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    return this.abortController;
  }

  /**
   * Stop current generation
   */
  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
    this.saveContextMemory();
  }

  /**
   * Check if session is still active (within 60 minutes)
   */
  isActive() {
    const inactivityLimit = 60 * 60 * 1000; // 60 minutes
    return (Date.now() - this.lastActivity) < inactivityLimit;
  }

  /**
   * Save messages to session cache
   */
  saveMessages(messages) {
    sessionCache.set(this.userId, this.agentType, 'messages', messages);
  }

  /**
   * Load messages from session cache
   */
  loadMessages() {
    return sessionCache.get(this.userId, this.agentType, 'messages') || [];
  }

  /**
   * Clear conversation and context
   */
  clearConversation() {
    sessionCache.remove(this.userId, this.agentType, 'messages');
    sessionCache.remove(this.userId, this.agentType, 'context_memory');
    this.contextMemory = this.getDefaultContextMemory();
  }

  /**
   * Get default context memory structure
   */
  getDefaultContextMemory() {
    return {
      current_project: null,
      connected_accounts: [],
      posting_schedule: null,
      active_goal: null,
      last_intent: null,
      last_output_type: null,
      preferences: {},
      recent_entities: []
    };
  }

  /**
   * Load context memory from session cache
   */
  loadContextMemory() {
    const cached = sessionCache.get(this.userId, this.agentType, 'context_memory');
    
    if (cached && this.isActive()) {
      return cached;
    }
    
    return this.getDefaultContextMemory();
  }

  /**
   * Save context memory to session cache
   */
  saveContextMemory() {
    sessionCache.set(this.userId, this.agentType, 'context_memory', this.contextMemory);
  }

  /**
   * Update context memory with new information
   * @param {object} updates - Context updates
   */
  updateContext(updates) {
    this.contextMemory = {
      ...this.contextMemory,
      ...updates,
      last_updated: Date.now()
    };
    this.saveContextMemory();
  }

  /**
   * Get current context for injection into prompts
   */
  getContext() {
    // Clear expired context
    if (!this.isActive()) {
      this.contextMemory = this.getDefaultContextMemory();
      this.saveContextMemory();
    }
    
    return this.contextMemory;
  }

  /**
   * Set current project context
   * @param {string} projectName - Name of current project/campaign
   * @param {object} projectData - Additional project data
   */
  setProject(projectName, projectData = {}) {
    this.updateContext({
      current_project: projectName,
      project_data: projectData
    });
  }

  /**
   * Set last intent for context-aware follow-ups
   * @param {string} intent - The intent that was just executed
   * @param {object} context - Associated context
   */
  setLastIntent(intent, context = {}) {
    this.updateContext({
      last_intent: intent,
      last_context: context
    });
  }

  /**
   * Set last output type for pronoun resolution
   * @param {string} outputType - Type of last output (post/email/document/etc)
   */
  setLastOutputType(outputType) {
    this.updateContext({
      last_output_type: outputType
    });
  }

  /**
   * Add connected account to context
   * @param {string} platform - Platform name
   */
  addConnectedAccount(platform) {
    const accounts = this.contextMemory.connected_accounts || [];
    if (!accounts.includes(platform)) {
      accounts.push(platform);
      this.updateContext({ connected_accounts: accounts });
    }
  }

  /**
   * Set posting schedule context
   * @param {string} schedule - Schedule description
   */
  setPostingSchedule(schedule) {
    this.updateContext({ posting_schedule: schedule });
  }

  /**
   * Set active goal context
   * @param {string} goal - Current active goal
   */
  setActiveGoal(goal) {
    this.updateContext({ active_goal: goal });
  }

  /**
   * Add recently mentioned entity (for "that deal", "that lead" references)
   * @param {string} entityType - Type of entity (lead/transaction/contact)
   * @param {string} entityId - Entity ID
   * @param {string} entityName - Human-readable name
   */
  addRecentEntity(entityType, entityId, entityName) {
    const recent = this.contextMemory.recent_entities || [];
    
    // Add to front, keep last 5
    recent.unshift({ type: entityType, id: entityId, name: entityName });
    
    this.updateContext({
      recent_entities: recent.slice(0, 5)
    });
  }

  /**
   * Get system prompt injection with context memory
   * @returns {string} Context to inject into system prompt
   */
  getContextInjection() {
    const ctx = this.getContext();
    
    if (!ctx.current_project && !ctx.active_goal && ctx.recent_entities?.length === 0) {
      return '';
    }
    
    let injection = '\n\n## Current Conversation Context:\n';
    
    if (ctx.current_project) {
      injection += `- Working on: ${ctx.current_project}\n`;
    }
    
    if (ctx.connected_accounts?.length > 0) {
      injection += `- Connected platforms: ${ctx.connected_accounts.join(', ')}\n`;
    }
    
    if (ctx.posting_schedule) {
      injection += `- Posting schedule: ${ctx.posting_schedule}\n`;
    }
    
    if (ctx.active_goal) {
      injection += `- Active goal: ${ctx.active_goal}\n`;
    }
    
    if (ctx.recent_entities?.length > 0) {
      injection += `- Recent entities: ${ctx.recent_entities.map(e => `${e.name} (${e.type})`).join(', ')}\n`;
    }
    
    if (ctx.last_intent) {
      injection += `- Last action: ${ctx.last_intent}\n`;
    }
    
    return injection;
  }

  /**
   * Save content draft to session cache
   * @param {object} draft - Draft content object
   */
  saveContentDraft(draft) {
    const drafts = sessionCache.get(this.userId, 'contentDrafts', 'all') || [];
    drafts.unshift({
      id: Date.now(),
      ...draft,
      createdAt: new Date().toISOString()
    });
    
    // Keep last 10 drafts
    sessionCache.set(this.userId, 'contentDrafts', 'all', drafts.slice(0, 10));
  }

  /**
   * Get last content draft
   */
  getLastContentDraft() {
    const drafts = sessionCache.get(this.userId, 'contentDrafts', 'all') || [];
    return drafts[0] || null;
  }
}