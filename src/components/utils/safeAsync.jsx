import React from 'react';

/**
 * Safe wrapper for async operations with comprehensive error handling
 * 
 * @param {Function} operation - The async operation to execute
 * @param {string} operationName - Name for logging purposes
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const safeAsyncOperation = async (operation, operationName = 'Operation') => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`[${operationName}] Failed:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      errorObject: error
    };
  }
};

/**
 * React hook for safe async operations with loading and error states
 * 
 * @param {Function} asyncFunction - The async function to execute
 * @param {Array} dependencies - Dependencies for useEffect
 * @returns {[data, loading, error, retry]}
 */
export const useSafeAsync = (asyncFunction, dependencies = []) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await safeAsyncOperation(asyncFunction, 'useSafeAsync');
    
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }, dependencies);

  React.useEffect(() => {
    execute();
  }, [execute]);

  return [data, loading, error, execute];
};

/**
 * Retry an async operation with exponential backoff
 * 
 * @param {Function} operation - The async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>}
 */
export const retryWithBackoff = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Timeout wrapper for promises
 * 
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>}
 */
export const withTimeout = (promise, timeoutMs = 30000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
};