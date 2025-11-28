/**
 * Agent SDK Stub
 * This is a placeholder implementation for the agent SDK.
 * Replace with actual implementation when available.
 */

export const agentSDK = {
  /**
   * List all conversations for a specific agent
   * @param {Object} options - Options including agent_name
   * @returns {Promise<Array>} Array of conversations
   */
  async listConversations(options) {
    console.warn('agentSDK.listConversations is not implemented');
    return [];
  },

  /**
   * Create a new conversation
   * @param {Object} options - Options including agent_name and metadata
   * @returns {Promise<Object>} The created conversation object
   */
  async createConversation(options) {
    console.warn('agentSDK.createConversation is not implemented');
    return {
      id: 'stub-conversation-id',
      agent_name: options.agent_name,
      metadata: options.metadata,
      messages: [],
      created_at: new Date().toISOString()
    };
  },

  /**
   * Subscribe to conversation updates
   * @param {string} conversationId - The conversation ID
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToConversation(conversationId, callback) {
    console.warn('agentSDK.subscribeToConversation is not implemented');
    // Return a no-op unsubscribe function
    return () => {};
  },

  /**
   * Add a message to a conversation
   * @param {Object} conversation - The conversation object
   * @param {Object} message - Message object with role and content
   * @returns {Promise<Object>} The created message
   */
  async addMessage(conversation, message) {
    console.warn('agentSDK.addMessage is not implemented');
    return {
      id: 'stub-message-id',
      conversation_id: conversation.id,
      role: message.role,
      content: message.content,
      created_at: new Date().toISOString()
    };
  }
};
