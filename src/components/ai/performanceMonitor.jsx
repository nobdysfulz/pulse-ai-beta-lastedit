/**
 * Performance Monitor
 * Tracks AI response times, cache hit rates, and system performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.sessionStart = Date.now();
  }

  /**
   * Start tracking an operation
   */
  startOperation(operationId, metadata = {}) {
    this.metrics.set(operationId, {
      startTime: Date.now(),
      metadata,
      status: 'running'
    });
  }

  /**
   * End tracking an operation
   */
  endOperation(operationId, result = {}) {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`[PerformanceMonitor] Operation ${operationId} not found`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.status = result.success !== false ? 'completed' : 'failed';
    metric.result = result;

    this.metrics.set(operationId, metric);

    // Log slow operations
    if (duration > 5000) {
      console.warn(`[PerformanceMonitor] Slow operation detected: ${operationId} took ${duration}ms`);
    }

    return metric;
  }

  /**
   * Get metrics for an operation
   */
  getMetrics(operationId) {
    return this.metrics.get(operationId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(operationType = null) {
    const completed = this.getAllMetrics().filter(m => 
      m.status === 'completed' && 
      (!operationType || m.metadata.type === operationType)
    );

    if (completed.length === 0) return 0;

    const total = completed.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / completed.length);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const withCacheInfo = this.getAllMetrics().filter(m => 
      m.result && m.result.metadata && typeof m.result.metadata.cacheHit === 'boolean'
    );

    if (withCacheInfo.length === 0) return 0;

    const hits = withCacheInfo.filter(m => m.result.metadata.cacheHit === true).length;
    return Math.round((hits / withCacheInfo.length) * 100);
  }

  /**
   * Get error rate
   */
  getErrorRate() {
    const all = this.getAllMetrics();
    if (all.length === 0) return 0;

    const errors = all.filter(m => m.status === 'failed').length;
    return Math.round((errors / all.length) * 100);
  }

  /**
   * Get session duration
   */
  getSessionDuration() {
    return Date.now() - this.sessionStart;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return {
      totalOperations: this.metrics.size,
      averageResponseTime: this.getAverageResponseTime(),
      cacheHitRate: this.getCacheHitRate(),
      errorRate: this.getErrorRate(),
      sessionDuration: this.getSessionDuration(),
      slowOperations: this.getAllMetrics().filter(m => m.duration > 3000).length
    };
  }

  /**
   * Log performance summary
   */
  logSummary() {
    const summary = this.getSummary();
    console.log('[PerformanceMonitor] Session Summary:', summary);
    return summary;
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * Export metrics for analysis
   */
  export() {
    return {
      summary: this.getSummary(),
      operations: Array.from(this.metrics.entries()).map(([id, metric]) => ({
        id,
        ...metric
      }))
    };
  }
}

// Global instance
const globalMonitor = new PerformanceMonitor();

/**
 * Track AI function call
 */
export async function trackAICall(functionName, fn, metadata = {}) {
  const operationId = `${functionName}_${Date.now()}`;
  
  globalMonitor.startOperation(operationId, {
    type: 'ai_call',
    functionName,
    ...metadata
  });

  try {
    const result = await fn();
    
    globalMonitor.endOperation(operationId, {
      success: true,
      metadata: result.metadata || {}
    });

    return result;
  } catch (error) {
    globalMonitor.endOperation(operationId, {
      success: false,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Get global monitor instance
 */
export function getMonitor() {
  return globalMonitor;
}

/**
 * Log performance metrics periodically
 */
export function startPeriodicLogging(intervalMs = 60000) {
  return setInterval(() => {
    const summary = globalMonitor.getSummary();
    
    if (summary.totalOperations > 0) {
      console.log('[PerformanceMonitor] Periodic Summary:', summary);
    }
  }, intervalMs);
}

export default {
  PerformanceMonitor,
  trackAICall,
  getMonitor,
  startPeriodicLogging
};