/**
 * PULSE Intelligence - Session Cache Service
 * Version: 2.0 - Enhanced with Context Memory TTL
 * 
 * Manages caching of user context, AI responses, and conversation history
 * to reduce redundant API calls and improve performance.
 */

const CACHE_TTL = {
  USER_PROFILE: 60 * 60 * 1000, // 1 hour
  PULSE_SCORE: 15 * 60 * 1000, // 15 minutes
  CRM_SNAPSHOT: 10 * 60 * 1000, // 10 minutes
  MARKET_DATA: 6 * 60 * 60 * 1000, // 6 hours
  CALENDAR_EVENTS: 15 * 60 * 1000, // 15 minutes
  AI_INSIGHT: 15 * 60 * 1000, // 15 minutes
  CHAT_HISTORY: 15 * 60 * 1000, // 15 minutes
  CONTEXT_MEMORY: 60 * 60 * 1000, // 60 minutes - conversation context
  CONTENT_DRAFTS: 60 * 60 * 1000, // 1 hour
};

class SessionCacheService {
  constructor() {
    this.storage = sessionStorage;
    this.prefix = 'pulse_cache_';
  }

  /**
   * Generate cache key
   */
  getCacheKey(userId, module, entity) {
    return `${this.prefix}${userId}:${module}:${entity}`;
  }

  /**
   * Get cached data
   */
  get(userId, module, entity) {
    try {
      const key = this.getCacheKey(userId, module, entity);
      const cached = this.storage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      const ttl = CACHE_TTL[entity.toUpperCase().replace(/-/g, '_')] || CACHE_TTL.AI_INSIGHT;
      
      // Check if expired
      if (Date.now() - parsed.timestamp > ttl) {
        this.remove(userId, module, entity);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('[SessionCache] Error getting cache:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  set(userId, module, entity, data) {
    try {
      const key = this.getCacheKey(userId, module, entity);
      const cacheEntry = {
        timestamp: Date.now(),
        data: data
      };
      
      this.storage.setItem(key, JSON.stringify(cacheEntry));
      return true;
    } catch (error) {
      console.error('[SessionCache] Error setting cache:', error);
      return false;
    }
  }

  /**
   * Check if cache is valid
   */
  isValid(userId, module, entity) {
    const cached = this.get(userId, module, entity);
    return cached !== null;
  }

  /**
   * Remove specific cache entry
   */
  remove(userId, module, entity) {
    try {
      const key = this.getCacheKey(userId, module, entity);
      this.storage.removeItem(key);
    } catch (error) {
      console.error('[SessionCache] Error removing cache:', error);
    }
  }

  /**
   * Clear all cache for a user
   */
  clearUser(userId) {
    try {
      const keys = Object.keys(this.storage);
      const userPrefix = `${this.prefix}${userId}:`;
      
      keys.forEach(key => {
        if (key.startsWith(userPrefix)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[SessionCache] Error clearing user cache:', error);
    }
  }

  /**
   * Clear expired cache entries (cleanup)
   */
  clearExpired() {
    try {
      const keys = Object.keys(this.storage);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          try {
            const cached = JSON.parse(this.storage.getItem(key));
            const entityType = key.split(':')[2];
            const ttl = CACHE_TTL[entityType?.toUpperCase().replace(/-/g, '_')] || CACHE_TTL.AI_INSIGHT;
            
            if (Date.now() - cached.timestamp > ttl) {
              this.storage.removeItem(key);
            }
          } catch (e) {
            // Invalid cache entry, remove it
            this.storage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('[SessionCache] Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache metadata (for debugging)
   */
  getCacheStatus(userId, module, entity) {
    try {
      const key = this.getCacheKey(userId, module, entity);
      const cached = this.storage.getItem(key);
      
      if (!cached) {
        return { status: 'miss', age: null };
      }

      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      const ttl = CACHE_TTL[entity.toUpperCase().replace(/-/g, '_')] || CACHE_TTL.AI_INSIGHT;
      
      return {
        status: age < ttl ? 'hit' : 'expired',
        age: Math.floor(age / 1000), // seconds
        ttl: Math.floor(ttl / 1000)
      };
    } catch (error) {
      return { status: 'error', age: null };
    }
  }
}

// Export singleton instance
export const sessionCache = new SessionCacheService();

// Run cleanup on load
if (typeof window !== 'undefined') {
  sessionCache.clearExpired();
  
  // Run cleanup every 5 minutes
  setInterval(() => {
    sessionCache.clearExpired();
  }, 5 * 60 * 1000);
}