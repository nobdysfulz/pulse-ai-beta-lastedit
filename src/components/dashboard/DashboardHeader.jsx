
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import WelcomeVideoModal from '../onboarding/WelcomeVideoModal';
import { UserOnboarding } from '@/api/entities';
import { toast } from 'sonner';
import { sessionCache } from '../ai/sessionCache'; // New import
import { Button } from '@/components/ui/button'; // Assuming Shadcn UI button component
import { RefreshCw } from 'lucide-react'; // Assuming lucide-react for icons

export default function DashboardHeader({ user, pulseScore, onRefresh }) {
  // The original welcome video logic is being replaced by the new header design,
  // so the state and effects related to it are no longer needed for this component.
  // The `UserContext` and `UserOnboarding` imports are kept as they might be used elsewhere
  // or could be part of a larger change not fully captured here, but for this specific
  // component's new functionality, they are not directly used.

  // The original component had state and effects for the welcome video:
  // const { onboarding, refreshUserData } = useContext(UserContext);
  // const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  // useEffect(() => { ... }, [onboarding]);
  // const handleDismissVideo = async () => { ... };
  // These are removed as per the new component structure.

  // The original `getGreeting` function is also removed as it's no longer used.
  // const getGreeting = () => { ... };

  const handleRefresh = async () => {
    // Clear relevant caches
    if (user) {
      sessionCache.remove(user.id, 'context', 'pulse_score');
      sessionCache.remove(user.id, 'dashboard', 'insight');
    }
    
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <div className="bg-white border-b border-[#E2E8F0] p-4 flex items-center"> {/* Updated outer div styles to be a flex container */}
      <div className="flex items-center space-x-4"> {/* Grouping the welcome text and pulse score */}
        <div>
          <h1 className="text-xl font-bold text-gray-900"> {/* Adjusted text styles for new background */}
            Welcome back, {user?.firstName || 'there'}! 👋
          </h1>
          <p className="text-sm text-gray-600"> {/* Adjusted text styles for new background */}
            Here's your business overview for today
          </p>
        </div>
        
        {pulseScore !== null && (
          <div className="text-center bg-gray-100 rounded-lg p-2 px-3 text-gray-800 flex-shrink-0"> {/* Adjusted styles for new background */}
            <div className="text-lg font-bold">{pulseScore}</div>
            <div className="text-xs text-gray-500">PULSE Score</div>
          </div>
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        className="ml-auto" // Pushes the button to the right
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}
