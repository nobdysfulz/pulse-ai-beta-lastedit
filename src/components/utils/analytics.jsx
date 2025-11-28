/**
 * Unified Analytics Manager for Facebook Pixel and other tracking
 * Ensures single initialization and prevents duplicate tracking
 */
class PixelManager {
  constructor() {
    this.initialized = false;
    this.pixelId = '2102574843552117';
    this.queue = [];
  }

  /**
   * Initialize Facebook Pixel
   * Safe to call multiple times - will only initialize once
   */
  initialize() {
    // Check if already initialized
    if (this.initialized) {
      console.warn('[PixelManager] Pixel already initialized, skipping');
      return;
    }

    // Check if fbq already exists (loaded by another script)
    if (window.fbq) {
      console.warn('[PixelManager] Facebook Pixel already loaded externally');
      this.initialized = true;
      this.processQueue();
      return;
    }

    // Validate pixel ID
    if (!this.pixelId) {
      console.error('[PixelManager] No Pixel ID configured');
      return;
    }

    try {
      // Initialize Facebook Pixel
      !function(f,b,e,v,n,t,s) {
        if(f.fbq) return;
        n=f.fbq=function(){
          n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)
        };
        if(!f._fbq) f._fbq=n;
        n.push=n;
        n.loaded=!0;
        n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s);
      }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
      
      // Initialize with pixel ID
      window.fbq('init', this.pixelId);
      
      // Track initial page view
      window.fbq('track', 'PageView');
      
      this.initialized = true;
      console.log('[PixelManager] Facebook Pixel initialized successfully');
      
      // Process any queued events
      this.processQueue();
    } catch (error) {
      console.error('[PixelManager] Failed to initialize Facebook Pixel:', error);
    }
  }

  /**
   * Process any events that were queued before initialization
   */
  processQueue() {
    if (this.queue.length > 0) {
      console.log(`[PixelManager] Processing ${this.queue.length} queued events`);
      this.queue.forEach(({ eventName, parameters }) => {
        this.trackEvent(eventName, parameters);
      });
      this.queue = [];
    }
  }

  /**
   * Track a standard Facebook event
   * @param {string} eventName - Standard event name (e.g., 'Purchase', 'Lead', 'CompleteRegistration')
   * @param {Object} parameters - Event parameters
   */
  trackStandardEvent(eventName, parameters = {}) {
    if (!this.initialized) {
      console.warn('[PixelManager] Pixel not initialized yet, queueing event:', eventName);
      this.queue.push({ eventName, parameters, type: 'standard' });
      return;
    }

    try {
      window.fbq('track', eventName, parameters);
      console.log('[PixelManager] Tracked standard event:', eventName, parameters);
    } catch (error) {
      console.error('[PixelManager] Failed to track standard event:', error);
    }
  }

  /**
   * Track a custom Facebook event
   * @param {string} eventName - Custom event name
   * @param {Object} parameters - Event parameters
   */
  trackCustomEvent(eventName, parameters = {}) {
    if (!this.initialized) {
      console.warn('[PixelManager] Pixel not initialized yet, queueing custom event:', eventName);
      this.queue.push({ eventName, parameters, type: 'custom' });
      return;
    }

    try {
      window.fbq('trackCustom', eventName, parameters);
      console.log('[PixelManager] Tracked custom event:', eventName, parameters);
    } catch (error) {
      console.error('[PixelManager] Failed to track custom event:', error);
    }
  }

  /**
   * Generic track event - delegates to standard or custom based on eventName
   * @param {string} eventName - Event name
   * @param {Object} parameters - Event parameters
   */
  trackEvent(eventName, parameters = {}) {
    // Standard Facebook events
    const standardEvents = [
      'PageView', 'Purchase', 'Lead', 'CompleteRegistration', 'AddToCart',
      'InitiateCheckout', 'AddPaymentInfo', 'ViewContent', 'Search', 'Contact'
    ];

    if (standardEvents.includes(eventName)) {
      this.trackStandardEvent(eventName, parameters);
    } else {
      this.trackCustomEvent(eventName, parameters);
    }
  }
}

// Create singleton instance
export const pixelManager = new PixelManager();

/**
 * Initialize Facebook Pixel (exported for convenience)
 * Safe to call multiple times
 */
export const initializeFacebookPixel = () => {
  pixelManager.initialize();
};

/**
 * Track an event (exported for convenience)
 */
export const trackEvent = (eventName, parameters) => {
  pixelManager.trackEvent(eventName, parameters);
};