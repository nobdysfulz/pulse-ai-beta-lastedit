/**
 * Setup Notifications Helper
 * Determines which onboarding steps are pending for a user
 */

export const getSetupNotifications = (user, onboarding, userAgentSubscription) => {
  if (!user || !onboarding) return [];

  const notifications = [];
  const isSubscriber = ['Subscriber', 'Admin'].includes(user?.subscriptionTier);
  const hasCallCenter = userAgentSubscription?.status === 'active';

  // 1. Profile Setup (High Priority)
  if (!onboarding.profileCompleted) {
    notifications.push({
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your basic information to personalize your experience',
      icon: '👤',
      priority: 'high',
      actionUrl: 'onboarding?step=profile',
      actionLabel: 'Complete Profile',
      category: 'core',
      dismissible: false
    });
  }

  // 2. Market Setup (High Priority)
  if (!onboarding.marketSetupCompleted) {
    notifications.push({
      id: 'market',
      title: 'Set Up Your Market',
      description: 'Define your territory to get personalized insights',
      icon: '📍',
      priority: 'high',
      actionUrl: 'onboarding?step=market',
      actionLabel: 'Set Up Market',
      category: 'core',
      dismissible: false
    });
  }

  // 3. Preferences (Medium Priority)
  if (!onboarding.preferencesCompleted) {
    notifications.push({
      id: 'preferences',
      title: 'Configure Preferences',
      description: 'Set your coaching style and notification preferences',
      icon: '⚙️',
      priority: 'medium',
      actionUrl: 'onboarding?step=preferences',
      actionLabel: 'Configure Preferences',
      category: 'core',
      dismissible: false
    });
  }

  // 4. Goals Setup (High Priority)
  if (!onboarding.goalsSetupCompleted) {
    notifications.push({
      id: 'goals',
      title: 'Set Your Annual Goals',
      description: 'Plan your business targets and track progress',
      icon: '🎯',
      priority: 'high',
      actionUrl: 'Goals?tab=planner',
      actionLabel: 'Set Goals',
      category: 'core',
      dismissible: false
    });
  }

  // 5. Agent Intelligence Survey (Medium Priority)
  if (!onboarding.agentIntelligenceCompleted) {
    notifications.push({
      id: 'agent-intelligence',
      title: 'Complete Intelligence Survey',
      description: 'Help us understand your business to provide better guidance',
      icon: '🧠',
      priority: 'medium',
      actionUrl: 'IntelligenceSurvey',
      actionLabel: 'Take Survey',
      category: 'core',
      dismissible: false
    });
  }

  // 6. AI Agents Setup (For Subscribers Only)
  if (isSubscriber && !onboarding.agentOnboardingCompleted) {
    notifications.push({
      id: 'ai-agents',
      title: 'Setup AI Agents',
      description: 'Configure your AI assistants to automate tasks',
      icon: '🤖',
      priority: 'high',
      actionUrl: 'Agents',
      actionLabel: 'Setup Agents',
      category: 'subscriber',
      dismissible: false
    });
  }

  // 7. Call Center Setup (For Call Center Subscribers Only)
  if (hasCallCenter && !onboarding.callCenterOnboardingCompleted) {
    notifications.push({
      id: 'call-center',
      title: 'Setup Call Center',
      description: 'Configure team calling and lead management features',
      icon: '📞',
      priority: 'high',
      actionUrl: 'Agents?tab=leads_agent',
      actionLabel: 'Setup Call Center',
      category: 'callcenter',
      dismissible: false
    });
  }

  // Sort by priority: high first, then medium
  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

/**
 * Get count of high-priority pending notifications
 */
export const getHighPriorityCount = (notifications) => {
  return notifications.filter(n => n.priority === 'high').length;
};

/**
 * Get count of all pending notifications
 */
export const getTotalNotificationCount = (notifications) => {
  return notifications.length;
};