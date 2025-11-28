import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertCircle, RefreshCw, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmergencyRecovery() {
  const navigate = useNavigate();

  const handleClearAndReload = () => {
    console.log('[Emergency Recovery] Clearing all storage and reloading...');
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error('[Emergency Recovery] Clear failed:', error);
      window.location.reload();
    }
  };

  const handleGoToDashboard = () => {
    console.log('[Emergency Recovery] Forcing navigation to Dashboard...');
    window.location.href = '/Dashboard?force-dashboard=true&skip-onboarding=true';
  };

  const handleRestartOnboarding = () => {
    console.log('[Emergency Recovery] Restarting onboarding...');
    localStorage.setItem('forceOnboarding', 'true');
    localStorage.removeItem('onboarding_redirect_history');
    window.location.href = '/Onboarding?force=true&phase=core';
  };

  const solutions = [
    {
      title: "Clear Cache & Reload",
      icon: RefreshCw,
      action: handleClearAndReload,
      description: "Clears all temporary data and reloads the application",
      variant: "default"
    },
    {
      title: "Go to Dashboard",
      icon: Home,
      action: handleGoToDashboard,
      description: "Skip any issues and go directly to your dashboard",
      variant: "outline"
    },
    {
      title: "Restart Onboarding",
      icon: Settings,
      action: handleRestartOnboarding,
      description: "Force restart the onboarding process from the beginning",
      variant: "outline"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Recovery</h1>
          <p className="text-gray-600">
            We encountered an issue loading the application. Please try one of these solutions:
          </p>
        </div>

        <div className="space-y-3">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;
            return (
              <button
                key={index}
                onClick={solution.action}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#7C3AED] transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#F8FAFC] rounded-lg flex items-center justify-center group-hover:bg-[#7C3AED] transition-colors">
                    <Icon className="w-5 h-5 text-[#64748B] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-[#7C3AED] transition-colors">
                      {solution.title}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {solution.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-3">
          <p className="text-sm text-gray-600">Still having issues?</p>
          <div className="flex gap-3 justify-center">
            <a
              href="mailto:support@pwru.app"
              className="text-[#7C3AED] hover:text-[#6D28D9] text-sm font-medium"
            >
              Contact Support
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="https://status.base44.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7C3AED] hover:text-[#6D28D9] text-sm font-medium"
            >
              System Status
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}