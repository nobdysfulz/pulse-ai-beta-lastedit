import { base44 } from '@/api/base44Client';

/**
 * Centralized onboarding state management
 * Handles saving step data and tracking completion across different onboarding phases
 */

export const onboardingStateManager = {
  /**
   * Save data from an onboarding step to the appropriate entity
   * @param {string} stepName - Identifier for the step (e.g., 'market_setup', 'agent_intelligence')
   * @param {object} data - Data to save
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveStepData(stepName, data, userId) {
    try {
      // Route to appropriate save function based on step name
      switch(stepName) {
        case 'market_setup':
        case 'market_business_setup':
          await this.saveMarketConfig(data, userId);
          break;
        
        case 'agent_intelligence':
        case 'agent_intelligence_setup':
          await this.saveAgentProfile(data, userId);
          break;
        
        case 'preferences':
        case 'brand_preferences_setup':
          await this.savePreferences(data, userId);
          break;
        
        case 'goals_setup':
        case 'goals_planning':
          // Goals are saved via the ProductionPlannerModal, no action needed here
          break;
        
        default:
          console.warn(`[onboardingStateManager] Unknown step: ${stepName}, skipping entity save`);
      }
      
      // Mark step as completed in UserOnboarding
      await this.markStepCompleted(stepName, userId);
      
      return { success: true };
    } catch (error) {
      console.error(`[onboardingStateManager] Failed to save ${stepName}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save market configuration data
   */
  async saveMarketConfig(data, userId) {
    const serviceClient = base44.asServiceRole;
    
    // Check for existing market config
    const existing = await serviceClient.entities.UserMarketConfig.filter({ userId });
    
    const marketData = {
      userId,
      primaryTerritory: data.primaryTerritory || data.territory,
      state: data.state,
      city: data.city,
      zipCodes: data.zipCodes || [],
      priceRangeMin: data.priceRangeMin || 0,
      priceRangeMax: data.priceRangeMax || 0,
      propertyTypes: data.propertyTypes || [],
      clientTypes: data.clientTypes || [],
      experienceLevel: data.experienceLevel || 'mid',
      yearsExperience: data.yearsExperience || 0,
      specializations: data.specializations || [],
      averageClosingsPerYear: data.averageClosingsPerYear || 0,
      averageCommission: data.averageCommission || 0,
      marketAreas: data.marketAreas || [],
      teamRole: data.teamRole || 'individual'
    };
    
    if (existing && existing.length > 0) {
      await serviceClient.entities.UserMarketConfig.update(existing[0].id, marketData);
    } else {
      await serviceClient.entities.UserMarketConfig.create(marketData);
    }
  },

  /**
   * Save agent intelligence profile data
   */
  async saveAgentProfile(data, userId) {
    const serviceClient = base44.asServiceRole;
    
    // Check for existing profile
    const existing = await serviceClient.entities.AgentIntelligenceProfile.filter({ userId });
    
    const profileData = {
      userId,
      experienceLevel: data.experienceLevel,
      workCommitment: data.workCommitment,
      businessStructure: data.businessStructure,
      workSchedule: data.workSchedule,
      databaseSize: data.databaseSize,
      sphereWarmth: data.sphereWarmth,
      previousYearTransactions: data.previousYearTransactions || 0,
      previousYearVolume: data.previousYearVolume || 0,
      averagePricePoint: data.averagePricePoint || 0,
      businessConsistency: data.businessConsistency,
      biggestChallenges: data.biggestChallenges || [],
      growthTimeline: data.growthTimeline,
      learningPreference: data.learningPreference,
      agentTier: data.agentTier,
      networkStrengthScore: data.networkStrengthScore || 1,
      capacityMultiplier: data.capacityMultiplier || 1,
      complexityPreference: data.complexityPreference || 2,
      surveyCompletedAt: new Date().toISOString()
    };
    
    if (existing && existing.length > 0) {
      await serviceClient.entities.AgentIntelligenceProfile.update(existing[0].id, profileData);
    } else {
      await serviceClient.entities.AgentIntelligenceProfile.create(profileData);
    }
  },

  /**
   * Save user preferences data
   */
  async savePreferences(data, userId) {
    const serviceClient = base44.asServiceRole;
    
    // Check for existing preferences
    const existing = await serviceClient.entities.UserPreferences.filter({ userId });
    
    const preferencesData = {
      userId,
      coachingStyle: data.coachingStyle || 'balanced',
      activityMode: data.activityMode || 'get_moving',
      dailyReminders: data.dailyReminders !== undefined ? data.dailyReminders : true,
      weeklyReports: data.weeklyReports !== undefined ? data.weeklyReports : true,
      marketUpdates: data.marketUpdates !== undefined ? data.marketUpdates : true,
      emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : true,
      timezone: data.timezone || 'America/New_York',
      selectedPaletteId: data.selectedPaletteId
    };
    
    if (existing && existing.length > 0) {
      await serviceClient.entities.UserPreferences.update(existing[0].id, preferencesData);
    } else {
      await serviceClient.entities.UserPreferences.create(preferencesData);
    }
  },

  /**
   * Mark a step as completed and update UserOnboarding
   * @param {string} stepName - Step identifier
   * @param {string} userId - User ID
   */
  async markStepCompleted(stepName, userId) {
    const serviceClient = base44.asServiceRole;
    const onboardingRecords = await serviceClient.entities.UserOnboarding.filter({ userId });
    
    if (onboardingRecords.length > 0) {
      const currentOnboarding = onboardingRecords[0];
      const existingSteps = currentOnboarding.completedSteps || [];
      
      // Only add if not already in the list
      const completedSteps = existingSteps.includes(stepName) 
        ? existingSteps 
        : [...existingSteps, stepName];
      
      // Calculate phase completion based on completed steps
      const phaseUpdates = this.calculatePhaseCompletion(completedSteps, currentOnboarding);
      
      await serviceClient.entities.UserOnboarding.update(currentOnboarding.id, {
        completedSteps,
        ...phaseUpdates
      });
    } else {
      console.warn(`[onboardingStateManager] No UserOnboarding record found for user ${userId}`);
    }
  },

  /**
   * Calculate which onboarding phases should be marked complete based on completed steps
   * @param {Array<string>} completedSteps - Array of completed step identifiers
   * @param {object} currentOnboarding - Current UserOnboarding record
   * @returns {object} - Updates to apply to UserOnboarding
   */
  calculatePhaseCompletion(completedSteps, currentOnboarding) {
    const updates = {};
    
    // Define which steps are required for each phase
    const coreRequiredSteps = ['welcome', 'market_setup', 'market_business_setup', 'agent_intelligence', 'agent_intelligence_setup', 'preferences', 'brand_preferences_setup'];
    const agentRequiredSteps = ['agent_intro', 'integrations_setup', 'agent_customization', 'agent_disclosure'];
    const callCenterRequiredSteps = ['phone_number_setup', 'voice_selection', 'caller_identity', 'google_workspace', 'call_center_confirmation'];
    
    // Check if core onboarding should be marked complete
    const hasCoreSteps = coreRequiredSteps.some(step => completedSteps.includes(step));
    if (hasCoreSteps && !currentOnboarding.onboardingCompleted) {
      updates.onboardingCompleted = true;
      updates.onboardingCompletionDate = new Date().toISOString();
    }
    
    // Check if agent onboarding should be marked complete
    const hasAgentSteps = agentRequiredSteps.some(step => completedSteps.includes(step));
    if (hasAgentSteps && !currentOnboarding.agentOnboardingCompleted) {
      updates.agentOnboardingCompleted = true;
    }
    
    // Check if call center onboarding should be marked complete
    const hasCallCenterSteps = callCenterRequiredSteps.some(step => completedSteps.includes(step));
    if (hasCallCenterSteps && !currentOnboarding.callCenterOnboardingCompleted) {
      updates.callCenterOnboardingCompleted = true;
    }
    
    return updates;
  }
};