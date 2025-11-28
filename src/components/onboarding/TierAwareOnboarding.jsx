import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import { validateOnboardingCompletion } from '../utils/onboardingValidator';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

// Core modules
import WelcomeStep from './modules/core/WelcomeStep';
import MarketBusinessSetup from './modules/core/MarketBusinessSetup';
import BrandPreferencesSetup from './modules/core/BrandPreferencesSetup';
import CoreConfirmation from './modules/core/CoreConfirmation';

// Agent modules
import AITeamIntro from './modules/agents/AITeamIntro';
import IntegrationsSetup from './modules/agents/IntegrationsSetup';
import AgentCustomization from './modules/agents/AgentCustomization';
import AgentTestMode from './modules/agents/AgentTestMode';

// Call Center modules
import PhoneNumberSetup from './modules/callcenter/PhoneNumberSetup';
import VoiceSelection from './modules/callcenter/VoiceSelection';
import CallerIdentitySetup from './modules/callcenter/CallerIdentitySetup';
import GoogleWorkspaceSetup from './modules/callcenter/GoogleWorkspaceSetup';
import CallCenterConfirmation from './modules/callcenter/CallCenterConfirmation';

import OnboardingSidebar from './OnboardingSidebar';
import LoadingIndicator from '../ui/LoadingIndicator';

export default function TierAwareOnboarding() {
  const { user, onboarding, userAgentSubscription, refreshUserData } = useContext(UserContext);
  const navigate = useNavigate();
  
  const [currentPhase, setCurrentPhase] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Detect initial phase from URL or onboarding state
  const initialPhase = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const phaseParam = urlParams.get('phase');
    
    console.log('🔍 [TierAwareOnboarding] Determining initial phase:', {
      urlPhase: phaseParam,
      onboarding: {
        core: onboarding?.onboardingCompleted,
        agents: onboarding?.agentOnboardingCompleted,
        callCenter: onboarding?.callCenterOnboardingCompleted
      },
      user: {
        tier: user?.subscriptionTier,
        hasSubscription: !!userAgentSubscription
      }
    });

    // If URL specifies phase, use it
    if (phaseParam && ['core', 'agents', 'callcenter'].includes(phaseParam)) {
      return phaseParam;
    }

    // Otherwise determine from onboarding state
    if (!onboarding?.onboardingCompleted) {
      return 'core';
    }

    const isSubscriber = ['Subscriber', 'Admin'].includes(user?.subscriptionTier);
    if (isSubscriber && !onboarding?.agentOnboardingCompleted) {
      return 'agents';
    }

    const hasCallCenter = userAgentSubscription?.status === 'active';
    if (hasCallCenter && !onboarding?.callCenterOnboardingCompleted) {
      return 'callcenter';
    }

    return null;
  }, [user, onboarding, userAgentSubscription]);

  // Set initial phase
  useEffect(() => {
    if (initialPhase) {
      console.log(`✅ [TierAwareOnboarding] Setting initial phase: ${initialPhase}`);
      setCurrentPhase(initialPhase);
    }
    setInitializing(false);
  }, [initialPhase]);

  // Mark user as interacted after delay or on actual interaction
  useEffect(() => {
    console.log('⏱️ [TierAwareOnboarding] Starting interaction timer...');
    
    const timer = setTimeout(() => {
      console.log('✅ [TierAwareOnboarding] User considered "interacted" after 3 second delay');
      setUserHasInteracted(true);
    }, 3000);

    const handleInteraction = () => {
      console.log('✅ [TierAwareOnboarding] User interaction detected');
      setUserHasInteracted(true);
      clearTimeout(timer);
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Check if should redirect to dashboard
  useEffect(() => {
    if (initializing || !user || !onboarding || redirectAttempted) {
      console.log('[TierAwareOnboarding] Skipping redirect check:', {
        initializing,
        hasUser: !!user,
        hasOnboarding: !!onboarding,
        redirectAttempted
      });
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const forceDashboard = urlParams.get('force-dashboard');
    const skipOnboarding = urlParams.get('skip-onboarding');

    if (forceDashboard || skipOnboarding) {
      console.log('🚨 [TierAwareOnboarding] Emergency override - forcing dashboard');
      setRedirectAttempted(true);
      navigate(createPageUrl('Dashboard'), { replace: true });
      return;
    }

    const validation = validateOnboardingCompletion(user, onboarding, userAgentSubscription);
    
    console.log('🔍 [TierAwareOnboarding] Redirect decision:', {
      isFullyComplete: validation.isFullyComplete,
      userHasInteracted,
      redirectAttempted,
      currentPhase,
      initialPhase
    });

    const shouldRedirect = validation.isFullyComplete && 
                          (userHasInteracted || !initialPhase) && 
                          !redirectAttempted;

    if (shouldRedirect) {
      console.log('🚀 [TierAwareOnboarding] ALL ONBOARDING COMPLETE - Redirecting to dashboard');
      setRedirectAttempted(true);
      navigate(createPageUrl('Dashboard'), { replace: true });
    } else {
      console.log('📍 [TierAwareOnboarding] Staying on onboarding:', {
        reason: !validation.isFullyComplete ? 'incomplete' : 
                !userHasInteracted ? 'no interaction' : 
                redirectAttempted ? 'already attempted' : 'unknown'
      });
    }
  }, [user, onboarding, userAgentSubscription, userHasInteracted, redirectAttempted, initializing, initialPhase, currentPhase, navigate]);

  const phaseSteps = useMemo(() => {
    const steps = {
      core: [
        { component: WelcomeStep, title: 'Welcome' },
        { component: MarketBusinessSetup, title: 'Market & Business' },
        { component: BrandPreferencesSetup, title: 'Brand Preferences' },
        { component: CoreConfirmation, title: 'Confirmation' }
      ],
      agents: [
        { component: AITeamIntro, title: 'Meet Your AI Team' },
        { component: IntegrationsSetup, title: 'Connect Your Tools' },
        { component: AgentCustomization, title: 'Customize Your Agents' },
        { component: AgentTestMode, title: 'Test & Launch' }
      ],
      callcenter: [
        { component: PhoneNumberSetup, title: 'Get Your Number' },
        { component: VoiceSelection, title: 'Choose Your Voice' },
        { component: CallerIdentitySetup, title: 'Set Your Identity' },
        { component: GoogleWorkspaceSetup, title: 'Connect Calendar' },
        { component: CallCenterConfirmation, title: 'You are All Set!' }
      ]
    };
    return steps[currentPhase] || [];
  }, [currentPhase]);

  const handleNext = useCallback(async () => {
    console.log(`[TierAwareOnboarding] Moving to next step (current: ${currentStepIndex}/${phaseSteps.length})`);
    
    if (currentStepIndex < phaseSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      console.log(`[TierAwareOnboarding] Completing phase: ${currentPhase}`);
      
      try {
        const updates = {};
        if (currentPhase === 'core') updates.onboardingCompleted = true;
        if (currentPhase === 'agents') updates.agentOnboardingCompleted = true;
        if (currentPhase === 'callcenter') updates.callCenterOnboardingCompleted = true;

        console.log('[TierAwareOnboarding] Updating onboarding status:', updates);
        await refreshUserData();
        
        const validation = validateOnboardingCompletion(user, { ...onboarding, ...updates }, userAgentSubscription);
        
        if (validation.isFullyComplete) {
          console.log('🎉 [TierAwareOnboarding] ALL PHASES COMPLETE - Redirecting to dashboard');
          setRedirectAttempted(true);
          navigate(createPageUrl('Dashboard'), { replace: true });
        } else {
          if (!validation.coreComplete) {
            setCurrentPhase('core');
          } else if (validation.agentRequired && !validation.agentComplete) {
            setCurrentPhase('agents');
          } else if (validation.callCenterRequired && !validation.callCenterComplete) {
            setCurrentPhase('callcenter');
          }
          setCurrentStepIndex(0);
        }
      } catch (error) {
        console.error('[TierAwareOnboarding] Error completing phase:', error);
      }
    }
  }, [currentStepIndex, phaseSteps.length, currentPhase, user, onboarding, userAgentSubscription, refreshUserData, navigate]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkipPhase = useCallback(() => {
    console.log(`[TierAwareOnboarding] Skipping phase: ${currentPhase}`);
    navigate(createPageUrl('Dashboard'), { replace: true });
  }, [currentPhase, navigate]);

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <LoadingIndicator text="Initializing onboarding..." size="lg" />
      </div>
    );
  }

  if (!currentPhase || phaseSteps.length === 0) {
    console.log('⚠️ [TierAwareOnboarding] No phase or steps, redirecting to dashboard');
    navigate(createPageUrl('Dashboard'), { replace: true });
    return null;
  }

  const CurrentStepComponent = phaseSteps[currentStepIndex]?.component;

  if (!CurrentStepComponent) {
    console.error('[TierAwareOnboarding] No component for step:', currentStepIndex);
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">Error loading onboarding step</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <OnboardingSidebar
        currentPhase={currentPhase}
        currentStepIndex={currentStepIndex}
        totalSteps={phaseSteps.length}
        steps={phaseSteps}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <CurrentStepComponent
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkipPhase}
              isFirstStep={currentStepIndex === 0}
              isLastStep={currentStepIndex === phaseSteps.length - 1}
            />
          </div>
        </main>
      </div>
    </div>
  );
}