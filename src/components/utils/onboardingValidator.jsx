/**
 * Onboarding validation utilities
 * Provides functions to validate and determine onboarding state
 */

/**
 * Validates if user has completed all required onboarding phases
 * @param {Object} user - User object
 * @param {Object} onboarding - UserOnboarding object
 * @param {Object} userAgentSubscription - UserAgentSubscription object
 * @returns {Object} Validation result with details
 */
export const validateOnboardingCompletion = (user, onboarding, userAgentSubscription) => {
  if (!user || !onboarding) {
    console.warn('[onboardingValidator] Missing required data:', { hasUser: !!user, hasOnboarding: !!onboarding });
    return {
      coreComplete: false,
      agentComplete: false,
      callCenterComplete: false,
      isSubscriber: false,
      hasCallCenter: false,
      isFullyComplete: false,
      missingData: true
    };
  }

  const coreComplete = onboarding.onboardingCompleted ?? false;
  const agentComplete = onboarding.agentOnboardingCompleted ?? false;
  const callCenterComplete = onboarding.callCenterOnboardingCompleted ?? false;
  
  const isSubscriber = ['Subscriber', 'Admin'].includes(user.subscriptionTier);
  const hasCallCenter = userAgentSubscription?.planType && userAgentSubscription?.status === 'active';

  // Determine what's required based on user tier
  const agentRequired = isSubscriber;
  const callCenterRequired = hasCallCenter;

  // Calculate if fully complete
  const isFullyComplete = coreComplete && 
                         (!agentRequired || agentComplete) && 
                         (!callCenterRequired || callCenterComplete);

  const validation = {
    coreComplete,
    agentComplete: agentRequired ? agentComplete : true,
    callCenterComplete: callCenterRequired ? callCenterComplete : true,
    isSubscriber,
    hasCallCenter,
    agentRequired,
    callCenterRequired,
    isFullyComplete,
    missingData: false
  };

  return validation;
};

/**
 * Determines which onboarding phase user needs
 * @param {Object} user - User object
 * @param {Object} onboarding - UserOnboarding object
 * @param {Object} userAgentSubscription - UserAgentSubscription object
 * @returns {string|null} Phase name or null if complete
 */
export const determineRequiredPhase = (user, onboarding, userAgentSubscription) => {
  const validation = validateOnboardingCompletion(user, onboarding, userAgentSubscription);
  
  if (validation.missingData) {
    return null;
  }

  if (!validation.coreComplete) {
    return 'core';
  }
  
  if (validation.agentRequired && !onboarding.agentOnboardingCompleted) {
    return 'agents';
  }
  
  if (validation.callCenterRequired && !onboarding.callCenterOnboardingCompleted) {
    return 'callcenter';
  }

  return null;
};

/**
 * Determines if the onboarding button should be shown in the header
 * @param {Object} user - User object
 * @param {Object} onboarding - UserOnboarding object
 * @param {Object} userAgentSubscription - UserAgentSubscription object
 * @returns {boolean} Whether to show the onboarding button
 */
export const shouldShowOnboardingButton = (user, onboarding, userAgentSubscription) => {
  if (!user || !onboarding) {
    return false;
  }

  const coreComplete = onboarding.onboardingCompleted ?? false;
  const agentComplete = onboarding.agentOnboardingCompleted ?? false;
  const callCenterComplete = onboarding.callCenterOnboardingCompleted ?? false;
  
  const isSubscriber = ['Subscriber', 'Admin'].includes(user.subscriptionTier);
  const hasCallCenter = userAgentSubscription?.status === 'active';

  // Show button if core is not complete
  if (!coreComplete) {
    return true;
  }

  // Show button if user is subscriber and agent onboarding not complete
  if (isSubscriber && !agentComplete) {
    return true;
  }

  // Show button if user has call center and call center onboarding not complete
  if (hasCallCenter && !callCenterComplete) {
    return true;
  }

  return false;
};

/**
 * Default export object with all validator functions
 */
const onboardingValidator = {
  validateOnboardingCompletion,
  determineRequiredPhase,
  shouldShowOnboardingButton
};

export default onboardingValidator;