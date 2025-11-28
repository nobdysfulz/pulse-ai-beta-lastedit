import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { getSetupNotifications } from './setupNotifications';
import { Progress } from '@/components/ui/progress';
import { createPageUrl } from '@/utils';

export default function GettingStartedWidget() {
  const { user, onboarding, userAgentSubscription } = useContext(UserContext);
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('gettingStartedDismissed') === 'true';
  });

  const pendingNotifications = useMemo(() => {
    return getSetupNotifications(user, onboarding, userAgentSubscription);
  }, [user, onboarding, userAgentSubscription]);

  // Only show high priority items on dashboard (max 5)
  const topPrioritySteps = useMemo(() => {
    return pendingNotifications.filter(n => n.priority === 'high').slice(0, 5);
  }, [pendingNotifications]);

  // Calculate total setup progress
  const totalSteps = 7; // Total possible setup steps
  const completedSteps = totalSteps - pendingNotifications.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('gettingStartedDismissed', 'true');
  };

  const handleStepClick = (actionUrl) => {
    navigate(createPageUrl(actionUrl));
  };

  // Don't show if dismissed or no pending notifications
  if (isDismissed || pendingNotifications.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6 relative overflow-hidden border border-[#E2E8F0]">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-[#64748B] hover:text-[#1E293B] transition-colors z-10"
        aria-label="Dismiss getting started widget"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#1E293B]">Getting Started with PULSE</h3>
            <p className="text-[#64748B] text-sm">Complete these steps to unlock the full experience</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#475569] text-sm font-medium">Setup Progress</span>
            <span className="text-[#1E293B] font-semibold" aria-live="polite">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-[#E2E8F0] rounded-full h-2" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin="0" aria-valuemax="100" aria-label="Setup progress">
            <div
              className="bg-[#22C55E] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list">
          {topPrioritySteps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.actionUrl)}
              className="bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-lg p-4 text-left transition-all group border border-[#E2E8F0]"
              role="listitem"
              aria-label={`${step.title}: ${step.description}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl" aria-hidden="true">{step.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[#1E293B] font-semibold text-sm mb-1 group-hover:translate-x-1 transition-transform">
                    {step.title}
                  </h4>
                  <p className="text-[#64748B] text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#7C3AED] group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>

        {pendingNotifications.length > topPrioritySteps.length && (
          <div className="mt-4 text-center" role="status">
            <p className="text-[#64748B] text-xs">
              + {pendingNotifications.length - topPrioritySteps.length} more steps available in notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}