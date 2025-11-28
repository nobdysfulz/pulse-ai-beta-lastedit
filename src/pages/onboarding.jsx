import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '../components/context/UserContext';
import { UserOnboarding, UserMarketConfig, UserPreferences } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import MarketConfigForm from '../components/market/MarketConfigForm';
import ProfileSetup from '../components/onboarding/modules/core/ProfileSetup';
import IntelligenceSurvey from './IntelligenceSurvey';
import ProductionPlannerModal from '../components/goal-planner/ProductionPlannerModal';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Target } from 'lucide-react';

export default function OnboardingPage() {
  const { user, refreshUserData, onboarding } = useContext(UserContext);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    coachingStyle: 'balanced',
    activityMode: 'get_moving'
  });
  const [showPlanner, setShowPlanner] = useState(false);

  // Parse URL parameters to determine initial step or redirect if done
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get('step');
    
    // If fully onboarded and no specific step requested, show completion view
    // The 'completed' step is the last one in the array (index 6 -> step 7)
    if (onboarding?.onboardingCompleted && !stepParam) {
        setCurrentStep(7);
        return;
    }
    
    if (stepParam) {
      const stepMap = {
        'profile': 1,
        'market': 2,
        'coaching': 3,
        'preferences': 3,
        'activity': 4,
        'intelligence': 5,
        'goals': 6
      };
      
      const stepNumber = stepMap[stepParam];
      if (stepNumber) {
        setCurrentStep(stepNumber);
      }
    }
  }, [onboarding]);

  const steps = [
    {
      id: 'profile',
      title: 'Profile Information',
      description: 'Tell us about yourself',
      component: (
        <ProfileSetup 
          onComplete={async () => {
            try {
              const currentOnboardings = await UserOnboarding.filter({ userId: user.id });
              if (currentOnboardings.length > 0) {
                await UserOnboarding.update(currentOnboardings[0].id, {
                  profileCompleted: true,
                  profileCompletionDate: new Date().toISOString()
                });
              } else {
                await UserOnboarding.create({
                  userId: user.id,
                  profileCompleted: true,
                  profileCompletionDate: new Date().toISOString()
                });
              }
              toast.success('Profile setup complete');
              await refreshUserData();
              handleNext();
            } catch (error) {
              console.error('Error marking profile setup complete:', error);
              toast.error('Failed to mark profile setup as complete');
            }
          }}
        />
      )
    },
    {
      id: 'market',
      title: 'Define Your Market Area',
      description: 'Help us understand your primary territory so we can provide hyper-local market intelligence.',
      component: (
        <div className="space-y-6">
          <MarketConfigForm
            userId={user?.id}
            onSaveComplete={async () => {
              try {
                const currentOnboardings = await UserOnboarding.filter({ userId: user.id });
                if (currentOnboardings.length > 0) {
                  await UserOnboarding.update(currentOnboardings[0].id, {
                    marketSetupCompleted: true,
                    marketCompletionDate: new Date().toISOString()
                  });
                } else {
                  await UserOnboarding.create({
                    userId: user.id,
                    marketSetupCompleted: true,
                    marketCompletionDate: new Date().toISOString(),
                    preferencesCompleted: false
                  });
                }
                toast.success('Market setup complete!');
                await refreshUserData();
                handleNext();
              } catch (error) {
                console.error('Error marking market setup complete:', error);
                toast.error('Failed to mark market setup as complete.');
              }
            }}
          />
        </div>
      )
    },
    {
      id: 'coaching',
      title: 'Coaching Style',
      description: 'How would you like PULSE to coach you?',
      component: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#7C3AED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Coaching Style</h3>
            <p className="text-sm text-[#475569]">How would you like PULSE to coach you?</p>
          </div>

          <div className="space-y-3">
            {[
              { value: 'supportive', label: 'Supportive', desc: 'Gentle encouragement and positive reinforcement' },
              { value: 'balanced', label: 'Balanced', desc: 'Mix of support and accountability' },
              { value: 'direct', label: 'Direct', desc: 'Straightforward feedback and challenges' }
            ].map((style) => (
              <button
                key={style.value}
                onClick={() => setFormData({ ...formData, coachingStyle: style.value })}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.coachingStyle === style.value
                    ? 'border-[#7C3AED] bg-[#F8FAFC]'
                    : 'border-[#E2E8F0] hover:border-[#7C3AED]/50'
                }`}
              >
                <div className="font-medium text-[#1E293B]">{style.label}</div>
                <div className="text-sm text-[#475569] mt-1">{style.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'activity',
      title: 'Activity Level',
      description: 'How many daily tasks would you like?',
      component: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#7C3AED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Activity Level</h3>
            <p className="text-sm text-[#475569]">How many daily tasks would you like?</p>
          </div>

          <div className="space-y-3">
            {[
              { value: 'get_moving', label: 'Get Moving', desc: '3-5 tasks per day' },
              { value: 'building_momentum', label: 'Building Momentum', desc: '5-7 tasks per day' },
              { value: 'do_the_most', label: 'Do The Most', desc: '7-10 tasks per day' },
              { value: 'tried_it_all', label: 'Tried It All', desc: '10+ tasks per day' }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setFormData({ ...formData, activityMode: mode.value })}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.activityMode === mode.value
                    ? 'border-[#7C3AED] bg-[#F8FAFC]'
                    : 'border-[#E2E8F0] hover:border-[#7C3AED]/50'
                }`}
              >
                <div className="font-medium text-[#1E293B]">{mode.label}</div>
                <div className="text-sm text-[#475569] mt-1">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'intelligence',
      title: 'Intelligence Profile',
      description: 'Help AI understand your business',
      component: (
        <div className="h-[600px] overflow-y-auto -mx-6 px-6">
          <IntelligenceSurvey onComplete={() => handleNext()} />
        </div>
      )
    },
    {
      id: 'goals',
      title: 'Goal Planning',
      description: 'Set your targets for the year',
      component: (
        <div className="text-center py-8 space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-4">
            <Target className="w-10 h-10 text-[#7C3AED]" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Let's Set Your Goals</h3>
            <p className="text-sm text-[#475569] max-w-md mx-auto">
              Create a 12-month production plan to help us track your progress and provide actionable insights.
            </p>
          </div>
          <Button 
            onClick={() => setShowPlanner(true)}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] px-8 py-6 text-lg"
          >
            Launch Goal Planner
          </Button>
          <ProductionPlannerModal 
            isOpen={showPlanner}
            onClose={() => setShowPlanner(false)}
            onPlanSaved={async () => {
              setShowPlanner(false);
              await refreshUserData();
              handleNext();
            }}
          />
        </div>
      )
    },
    {
        id: 'completed',
        title: 'All Set!',
        description: 'Your profile is configured and ready.',
        component: (
            <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Setup Complete</h3>
                    <p className="text-sm text-[#475569] max-w-md mx-auto">
                        You have completed all the necessary steps. You can review or update these settings at any time.
                    </p>
                </div>
                <div className="flex gap-4 justify-center">
                    <Button 
                        variant="outline"
                        onClick={() => navigate(createPageUrl('Settings'))}
                    >
                        Review Settings
                    </Button>
                    <Button 
                        onClick={() => navigate(createPageUrl('ToDo'))}
                        className="bg-[#7C3AED] hover:bg-[#6D28D9]"
                    >
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        )
    }
  ];

  const totalSteps = steps.length;

  const handleNext = async () => {
    if (currentStep === 4) { // Activity/Preferences Step
        await handleComplete(); // Save preferences and advance
        return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final Completion
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
      setSaving(true);
      try {
        // Ensure DB is updated
        let onboardingRecord = null;
        const onboardings = await UserOnboarding.filter({ userId: user.id });
        
        if (onboardings.length > 0) {
            onboardingRecord = onboardings[0];
            await UserOnboarding.update(onboardingRecord.id, {
                onboardingCompleted: true,
                onboardingCompletionDate: new Date().toISOString()
            });
        } else {
             await UserOnboarding.create({
                userId: user.id,
                onboardingCompleted: true,
                onboardingCompletionDate: new Date().toISOString()
            });
        }

        // Explicitly update User entity status for Admin visibility
        await base44.auth.updateMe({
            onboardingStatus: 'core_complete'
        });

        // Verify update before proceeding (Polling)
        let retries = 0;
        while (retries < 10) { // Increased retries
            const check = await UserOnboarding.filter({ userId: user.id });
            if (check[0]?.onboardingCompleted) {
                break;
            }
            await new Promise(r => setTimeout(r, 500));
            retries++;
        }

        // Refresh context strongly
        await refreshUserData();
        
        // Force navigation to ToDo
        window.location.href = '/ToDo'; 
      } catch (error) {
        console.error('Error finishing onboarding:', error);
        toast.error('Failed to finish onboarding. Please try again.');
        setSaving(false);
      }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save preferences
      const preferences = await UserPreferences.filter({ userId: user.id });
      if (preferences.length > 0) {
        await UserPreferences.update(preferences[0].id, {
          coachingStyle: formData.coachingStyle,
          activityMode: formData.activityMode
        });
      } else {
        await UserPreferences.create({
          userId: user.id,
          coachingStyle: formData.coachingStyle,
          activityMode: formData.activityMode
        });
      }

      // Update onboarding status
      const onboardings = await UserOnboarding.filter({ userId: user.id });
      if (onboardings.length > 0) {
        await UserOnboarding.update(onboardings[0].id, {
          preferencesCompleted: true,
          preferencesCompletionDate: new Date().toISOString(),
          // Note: We DO NOT set onboardingCompleted=true here anymore, 
          // as there are more steps (Intelligence, Goals).
          // It should only be set in finishOnboarding.
        });
      } else {
        await UserOnboarding.create({
          userId: user.id,
          preferencesCompleted: true,
          preferencesCompletionDate: new Date().toISOString(),
          marketSetupCompleted: false
        });
      }

      toast.success('Preferences saved!');
      
      // Performance Fix: Do NOT await refreshUserData here to avoid UI lag
      refreshUserData(); 
      
      // Advance to next step immediately
      setCurrentStep(currentStep + 1);

    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <title>Getting Started - PULSE Intelligence</title>
      <meta name="description" content="Complete your PULSE Intelligence setup to unlock all features and personalized insights." />
      
      <Card className="max-w-2xl w-full bg-white border border-[#E2E8F0]">
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-2xl font-bold text-[#1E293B]">Welcome to PULSE Intelligence</h2>
            <p className="text-sm text-[#475569] mt-1">Let's get you set up in a few quick steps</p>
          </div>
          <button onClick={() => navigate(createPageUrl('ToDo'))} className="text-[#475569] hover:text-[#1E293B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="p-6 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#475569]">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-[#7C3AED]">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-[#E2E8F0] rounded-full h-2">
            <div
              className="bg-[#7C3AED] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <CardContent className="p-6">
          {currentStepData && currentStepData.component}
        </CardContent>

        {/* Hide footer buttons for Intelligence Survey (Step 5) and Completed (Step 8) */}
        {currentStep !== 5 && currentStep !== 8 && (
            <div className="flex items-center justify-between p-6 border-t border-[#E2E8F0]">
            <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || saving}
            >
                Back
            </Button>
            <Button
                onClick={handleNext}
                disabled={saving}
            >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {currentStep === 7 ? (saving ? 'Finishing...' : 'Complete Setup') : 'Next'}
            </Button>
            </div>
        )}
      </Card>
    </div>
  );
}