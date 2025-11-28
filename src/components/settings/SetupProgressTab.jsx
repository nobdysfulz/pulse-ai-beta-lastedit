import React, { useContext, useMemo, useEffect, useState } from 'react';
import { UserContext } from '@/components/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  LayoutDashboard, 
  User, 
  MapPin, 
  Settings2, 
  Target, 
  Bot, 
  Phone, 
  CreditCard 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function SetupProgressTab() {
  const { user, onboarding, userAgentSubscription, refreshUserData } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Force refresh on mount to ensure data consistency
  useEffect(() => {
    refreshUserData();
  }, []);

  // Define all possible steps with their logic locally to avoid external dependency issues
  const allSteps = useMemo(() => {
    if (!user) return [];

    const steps = [
      {
        id: 'profile',
        title: 'Complete Profile',
        description: 'Personal details and brokerage info',
        icon: <User className="w-5 h-5" />,
        completed: onboarding?.profileCompleted,
        actionUrl: 'Settings?tab=profile',
        category: 'Core'
      },
      {
        id: 'market',
        title: 'Market Configuration',
        description: 'Define your territory and coverage',
        icon: <MapPin className="w-5 h-5" />,
        completed: onboarding?.marketSetupCompleted,
        actionUrl: 'Settings?tab=market',
        category: 'Core'
      },
      {
        id: 'preferences',
        title: 'User Preferences',
        description: 'Customize your PULSE experience',
        icon: <Settings2 className="w-5 h-5" />,
        completed: onboarding?.preferencesCompleted,
        actionUrl: 'Settings?tab=preferences',
        category: 'Core'
      },
      {
        id: 'goals',
        title: '12-Month Goals',
        description: 'Set production and activity targets',
        icon: <Target className="w-5 h-5" />,
        completed: onboarding?.goalsSetupCompleted,
        actionUrl: 'GoalPlanner',
        category: 'Core'
      },
      {
        id: 'agent_intelligence',
        title: 'Agent Intelligence',
        description: 'Train your AI on your business model',
        icon: <Bot className="w-5 h-5" />,
        completed: onboarding?.agentIntelligenceCompleted,
        actionUrl: 'Settings?tab=agent_intelligence',
        category: 'AI Agents'
      }
    ];

    // Add AI Agent specific steps if subscribed or accessible
    if (user.subscriptionTier !== 'Basic') {
      steps.push({
        id: 'agent_onboarding',
        title: 'AI Agent Setup',
        description: 'Configure your AI workforce guidelines',
        icon: <Bot className="w-5 h-5" />,
        completed: onboarding?.agentOnboardingCompleted,
        actionUrl: 'AgentOnboarding',
        category: 'AI Agents'
      });
    }

    // Add Call Center steps if subscribed
    if (userAgentSubscription?.hasCallCenter) {
      steps.push({
        id: 'call_center',
        title: 'Call Center Config',
        description: 'Setup voice and phone numbers',
        icon: <Phone className="w-5 h-5" />,
        completed: onboarding?.callCenterOnboardingCompleted,
        actionUrl: 'Settings?tab=voice',
        category: 'Call Center'
      });
    }

    return steps;
  }, [user, onboarding, userAgentSubscription]);

  const completedCount = allSteps.filter(s => s.completed).length;
  const totalCount = allSteps.length;
  const progress = Math.round((completedCount / totalCount) * 100) || 0;

  const handleStepClick = (url) => {
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      navigate(createPageUrl(url));
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header & Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Setup Progress</h2>
            <p className="text-slate-500 mt-1">Complete these steps to get the most out of PULSE</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-primary">{progress}%</span>
            <span className="text-sm text-slate-500 block">Completed</span>
          </div>
        </div>
        
        <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex justify-between text-sm text-slate-500">
          <span>{completedCount} of {totalCount} steps finished</span>
          {progress === 100 && (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> All systems go!
            </span>
          )}
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid gap-6">
        {['Core', 'AI Agents', 'Call Center'].map(category => {
          const categorySteps = allSteps.filter(s => s.category === category);
          if (categorySteps.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {category === 'Core' && <LayoutDashboard className="w-5 h-5 text-slate-400" />}
                {category === 'AI Agents' && <Bot className="w-5 h-5 text-slate-400" />}
                {category === 'Call Center' && <Phone className="w-5 h-5 text-slate-400" />}
                {category} Setup
              </h3>
              
              <div className="grid gap-4 md:grid-cols-1">
                {categorySteps.map((step) => (
                  <div 
                    key={step.id}
                    onClick={() => handleStepClick(step.actionUrl)}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer
                      ${step.completed 
                        ? 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-md' 
                        : 'bg-white border-slate-200 shadow-sm hover:border-primary/50 hover:shadow-md'
                      }`}
                  >
                    {/* Icon State */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      ${step.completed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="w-6 h-6" /> : step.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-base ${step.completed ? 'text-slate-700' : 'text-slate-900'}`}>
                          {step.title}
                        </h4>
                        {step.completed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
                    </div>

                    {/* Action Arrow */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {progress === 100 && (
        <div className="text-center py-8">
            <p className="text-slate-500">Everything is configured correctly.</p>
            <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))} className="mt-4">
                Go to Dashboard
            </Button>
        </div>
      )}
    </div>
  );
}