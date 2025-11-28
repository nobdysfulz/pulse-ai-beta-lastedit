/**
 * Safe MutationObserver wrapper to prevent errors from invalid target nodes
 * This wraps the native MutationObserver to add validation before observation
 */
export const safeMutationObserver = {
  init() {
    // Check if already initialized
    if (window._safeMutationObserverInitialized) {
      console.warn('[safeMutationObserver] Already initialized');
      return;
    }

    // Backup original MutationObserver
    const OriginalMutationObserver = window.MutationObserver;
    
    if (!OriginalMutationObserver) {
      console.error('[safeMutationObserver] MutationObserver not available in this environment');
      return;
    }

    // Safe wrapper class
    window.MutationObserver = class SafeMutationObserver extends OriginalMutationObserver {
      observe(target, options) {
        // Validate target is a Node
        if (!target || !(target instanceof Node)) {
          console.warn('[SafeMutationObserver] Invalid target node, skipping observation:', target);
          return;
        }

        // Validate options
        if (!options || typeof options !== 'object') {
          console.warn('[SafeMutationObserver] Invalid options, using defaults');
          options = { childList: true, subtree: true };
        }
        
        try {
          return super.observe(target, options);
        } catch (error) {
          console.error('[SafeMutationObserver] Observation failed:', error);
          // Don't throw - just log and continue
        }
      }
    };

    window._safeMutationObserverInitialized = true;
    console.log('[safeMutationObserver] Initialized successfully');
  },

  /**
   * Create a safe observer instance with automatic retry logic
   * @param {string} targetId - The ID of the element to observe
   * @param {Function} callback - The callback function for mutations
   * @param {Object} options - MutationObserver options
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Object} - Observer instance and cleanup function
   */
  createWithRetry(targetId, callback, options = {}, maxRetries = 5) {
    let observer = null;
    let retryCount = 0;
    let retryTimeout = null;

    const defaultOptions = {
      childList: true,
      subtree: true,
      attributes: false,
      ...options
    };

    const tryObserve = () => {
      const targetNode = document.getElementById(targetId);
      
      if (!targetNode) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`[safeMutationObserver] Target #${targetId} not found, retry ${retryCount}/${maxRetries}`);
          retryTimeout = setTimeout(tryObserve, 1000);
        } else {
          console.error(`[safeMutationObserver] Target #${targetId} not found after ${maxRetries} attempts`);
        }
        return;
      }

      try {
        observer = new MutationObserver(callback);
        observer.observe(targetNode, defaultOptions);
        console.log(`[safeMutationObserver] Successfully observing #${targetId}`);
      } catch (error) {
        console.error(`[safeMutationObserver] Failed to observe #${targetId}:`, error);
      }
    };

    // Start observation
    tryObserve();

    // Return cleanup function
    return {
      disconnect: () => {
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    };
  }
};