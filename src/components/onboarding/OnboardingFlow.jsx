import React, { useState, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MarketConfigForm from '../market/MarketConfigForm';
import ProfileSetup from './modules/core/ProfileSetup';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function OnboardingFlow({ isOpen, onComplete }) {
  const { user, refreshUserData, onboarding } = useContext(UserContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    coachingStyle: 'balanced',
    activityMode: 'get_moving'
  });

  // Helper function to update completedSteps array
  const updateCompletedSteps = async (stepKey) => {
    try {
      const onboardingRecords = await base44.entities.UserOnboarding.filter({ userId: user.id });
      if (onboardingRecords.length > 0) {
        const currentOnboarding = onboardingRecords[0];
        const currentSteps = currentOnboarding.completedSteps || [];
        
        // Only add if not already in the array
        if (!currentSteps.includes(stepKey)) {
          await base44.entities.UserOnboarding.update(currentOnboarding.id, {
            completedSteps: [...currentSteps, stepKey]
          });
        }
      }
    } catch (error) {
      console.error('Error updating completedSteps:', error);
    }
  };

  const steps = [
    {
      id: 'profileSetup',
      title: 'Profile Information',
      description: 'Tell us about yourself',
      component: (
        <ProfileSetup 
          onComplete={async () => {
            try {
              const currentOnboardings = await base44.entities.UserOnboarding.filter({ userId: user.id });
              if (currentOnboardings.length > 0) {
                await base44.entities.UserOnboarding.update(currentOnboardings[0].id, {
                  profileCompleted: true,
                  profileCompletionDate: new Date().toISOString(),
                  completedSteps: [...(currentOnboardings[0].completedSteps || []), 'profile']
                });
              } else {
                await base44.entities.UserOnboarding.create({
                  userId: user.id,
                  profileCompleted: true,
                  profileCompletionDate: new Date().toISOString(),
                  completedSteps: ['profile']
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
      id: 'profile',
      title: 'Get Started',
      description: 'We just need a few details to tailor your experience.',
      component: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#7C3AED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E293B] mb-2">Welcome Aboard!</h3>
            <p className="text-sm text-[#475569]">Let's set up your profile for a personalized experience.</p>
          </div>
        </div>
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
                const currentOnboardings = await base44.entities.UserOnboarding.filter({ userId: user.id });
                if (currentOnboardings.length > 0) {
                  await base44.entities.UserOnboarding.update(currentOnboardings[0].id, {
                    marketSetupCompleted: true,
                    marketCompletionDate: new Date().toISOString(),
                    completedSteps: [...(currentOnboardings[0].completedSteps || []), 'market']
                  });
                } else {
                  await base44.entities.UserOnboarding.create({
                    userId: user.id,
                    marketSetupCompleted: true,
                    marketCompletionDate: new Date().toISOString(),
                    preferencesCompleted: false,
                    completedSteps: ['market']
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
      id: 'coachingStyle',
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
      id: 'activityLevel',
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
    }
  ];

  const totalSteps = steps.length;

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const preferences = await base44.entities.UserPreferences.filter({ userId: user.id });
      if (preferences.length > 0) {
        await base44.entities.UserPreferences.update(preferences[0].id, {
          coachingStyle: formData.coachingStyle,
          activityMode: formData.activityMode
        });
      } else {
        await base44.entities.UserPreferences.create({
          userId: user.id,
          coachingStyle: formData.coachingStyle,
          activityMode: formData.activityMode
        });
      }

      const onboardings = await base44.entities.UserOnboarding.filter({ userId: user.id });
      if (onboardings.length > 0) {
        const currentSteps = onboardings[0].completedSteps || [];
        const updatedSteps = [...new Set([...currentSteps, 'preferences', 'pulse'])];
        
        await base44.entities.UserOnboarding.update(onboardings[0].id, {
          preferencesCompleted: true,
          preferencesCompletionDate: new Date().toISOString(),
          onboardingCompleted: true,
          onboardingCompletionDate: new Date().toISOString(),
          completedSteps: updatedSteps
        });
      } else {
        await base44.entities.UserOnboarding.create({
          userId: user.id,
          preferencesCompleted: true,
          preferencesCompletionDate: new Date().toISOString(),
          onboardingCompleted: true,
          onboardingCompletionDate: new Date().toISOString(),
          marketSetupCompleted: false,
          completedSteps: ['preferences', 'pulse']
        });
      }

      toast.success('Onboarding completed!');
      await refreshUserData();
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[step - 1];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full bg-white border border-[#E2E8F0]">
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-2xl font-bold text-[#1E293B]">Welcome to PULSE Intelligence</h2>
            <p className="text-sm text-[#475569] mt-1">Let's get you set up in a few quick steps</p>
          </div>
          <button onClick={() => navigate(createPageUrl('Dashboard'))} className="text-[#475569] hover:text-[#1E293B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#475569]">Step {step} of {totalSteps}</span>
            <span className="text-sm font-medium text-[#7C3AED]">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-[#E2E8F0] rounded-full h-2">
            <div
              className="bg-[#7C3AED] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <CardContent className="p-6">
          {currentStepData && currentStepData.component}
        </CardContent>

        <div className="flex items-center justify-between p-6 border-t border-[#E2E8F0]">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || saving}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={saving}
          >
            {step === totalSteps ? (saving ? 'Saving...' : 'Complete Setup') : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
}