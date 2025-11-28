/**
 * Utility to validate onboarding data consistency and detect potential issues
 */

export const onboardingDataValidator = {
  /**
   * Validate that all required data is present and consistent
   * @param {object} user - User object from UserContext
   * @param {object} onboarding - UserOnboarding object from UserContext
   * @param {object} userAgentSubscription - UserAgentSubscription object from UserContext
   * @returns {object} - { isValid: boolean, issues: string[] }
   */
  validateConsistency(user, onboarding, userAgentSubscription) {
    const issues = [];
    
    if (!user) {
      issues.push('User data missing');
    }
    
    if (!onboarding) {
      issues.push('Onboarding data missing');
    }
    
    if (onboarding) {
      const expectedFields = [
        'onboardingCompleted', 
        'agentOnboardingCompleted', 
        'callCenterOnboardingCompleted'
      ];
      
      for (const field of expectedFields) {
        if (onboarding[field] === undefined) {
          issues.push(`Onboarding field ${field} is undefined`);
        }
      }
    }
    
    if (userAgentSubscription === undefined) {
      issues.push('userAgentSubscription is undefined (should be null or object)');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  },

  /**
   * Log detailed state for debugging
   */
  logState(componentName, user, onboarding, userAgentSubscription) {
    console.log(`[${componentName}] Data State:`, {
      user: {
        id: user?.id,
        email: user?.email,
        subscriptionTier: user?.subscriptionTier,
        firstLoginCompleted: user?.firstLoginCompleted
      },
      onboarding: {
        onboardingCompleted: onboarding?.onboardingCompleted,
        agentOnboardingCompleted: onboarding?.agentOnboardingCompleted,
        callCenterOnboardingCompleted: onboarding?.callCenterOnboardingCompleted,
        completedSteps: onboarding?.completedSteps?.length || 0
      },
      userAgentSubscription: {
        exists: !!userAgentSubscription,
        status: userAgentSubscription?.status,
        planType: userAgentSubscription?.planType
      }
    });
    
    const validation = this.validateConsistency(user, onboarding, userAgentSubscription);
    if (!validation.isValid) {
      console.warn(`[${componentName}] Data consistency issues:`, validation.issues);
    }
  }
};