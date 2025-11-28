import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserContext } from './UserContext';
import { differenceInDays } from 'date-fns';
import { base44 } from '@/api/base44Client';

/**
 * Safe wrapper for async operations with comprehensive error handling
 */
const safeAsyncOperation = async (operation, operationName = 'Operation') => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`[${operationName}] Failed:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

export default function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [marketConfig, setMarketConfig] = useState(null);
    const [agentProfile, setAgentProfile] = useState(null);
    const [preferences, setPreferences] = useState(null);
    const [onboarding, setOnboarding] = useState(null);
    const [actions, setActions] = useState([]);
    const [agentConfig, setAgentConfig] = useState(null);
    const [userAgentSubscription, setUserAgentSubscription] = useState(null);
    const [goals, setGoals] = useState([]);
    const [businessPlan, setBusinessPlan] = useState(null);
    const [pulseHistory, setPulseHistory] = useState([]);
    const [pulseConfig, setPulseConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSupportChatOpen, setSupportChatOpen] = useState(false);
    const [activeSupportAgent, setActiveSupportAgent] = useState('technical_support');
    // Removed isFirstTimeCheckComplete and onboardingRedirectCount as per instructions

    const fetchUserData = useCallback(async (retryCount = 0) => {
        const maxRetries = 3;
        const retryDelay = 1000 * Math.pow(2, retryCount);
        
        console.log(`[UserProvider] Starting fetch attempt ${retryCount + 1}/${maxRetries + 1}`);
        
        // Only set loading on first attempt
        if (retryCount === 0) {
            setLoading(true);
            setError(null);
        }
        
        try {
            // Authenticate user
            console.log('[UserProvider] Attempting to fetch user...');
            let userData;
            try {
                userData = await base44.auth.me();
                console.log('[UserProvider] User loaded:', userData?.email);
            } catch (userError) {
                console.error('[UserProvider] Error fetching user:', userError);
                if (userError.response?.status === 403 || userError.response?.status === 401) {
                    console.log("[UserProvider] User not authenticated, redirecting to login...");
                    await base44.auth.redirectToLogin();
                    return;
                }
                throw userError;
            }

            if (!userData || !userData.id) {
                console.error("[UserProvider] User data is invalid:", userData);
                throw new Error("Invalid user data received");
            }

            setUser(userData);

            // Handle subscription status
            if (userData.subscriptionStatus === 'past_due' && userData.pastDueStartDate) {
                const daysPastDue = differenceInDays(new Date(), new Date(userData.pastDueStartDate));
                if (daysPastDue >= 7 && userData.subscriptionStatus !== 'locked_out') {
                    try {
                        await base44.auth.updateMe({ subscriptionStatus: 'locked_out' });
                        userData.subscriptionStatus = 'locked_out';
                        setUser({ ...userData });
                    } catch (updateError) {
                        console.warn('[UserProvider] Failed to update subscription status:', updateError);
                    }
                }
            }
            
            // Fetch agent context
            console.log('[UserProvider] Fetching agent context...');
            let agentContext = null;
            
            try {
                const { data, error: contextError } = await base44.functions.invoke('getAgentContext');
                
                if (contextError) {
                    throw new Error(contextError.message || "Could not retrieve full user context.");
                }

                if (!data) {
                    throw new Error("No data returned from getAgentContext");
                }

                agentContext = data;
                console.log('[UserProvider] Agent context received successfully');

            } catch (contextFetchError) {
                console.error('[UserProvider] Error fetching agent context:', contextFetchError);
                
                // Create minimal viable context on error
                console.warn('[UserProvider] Using minimal context due to fetch error');
                agentContext = {
                    user: userData,
                    onboarding: { // Onboarding object retained but marked as complete for simplicity since redirect logic is removed.
                        userId: userData.id,
                        onboardingCompleted: true, // Default to true as redirect logic is removed
                        agentOnboardingCompleted: false,
                        callCenterOnboardingCompleted: false,
                        completedSteps: []
                    },
                    marketConfig: null,
                    agentProfile: null,
                    preferences: {
                        userId: userData.id,
                        coachingStyle: 'balanced',
                        activityMode: 'get_moving',
                        dailyReminders: true,
                        weeklyReports: true,
                        marketUpdates: true,
                        emailNotifications: true,
                        timezone: 'America/New_York'
                    },
                    actions: [],
                    agentConfig: null,
                    userAgentSubscription: null,
                    goals: [],
                    businessPlan: null,
                    pulseHistory: [],
                    pulseConfig: null
                };
            }

            // Set all context data with safety checks
            setOnboarding(agentContext.onboarding || {
                userId: userData.id,
                onboardingCompleted: true, // Default to true as redirect logic is removed
                agentOnboardingCompleted: false,
                callCenterOnboardingCompleted: false,
                completedSteps: []
            });
            setMarketConfig(agentContext.marketConfig || null);
            setAgentProfile(agentContext.agentProfile || null);
            setPreferences(agentContext.preferences || {
                userId: userData.id,
                coachingStyle: 'balanced',
                activityMode: 'get_moving',
                dailyReminders: true,
                weeklyReports: true,
                marketUpdates: true,
                emailNotifications: true,
                timezone: 'America/New_York'
            });
            setActions(Array.isArray(agentContext.actions) ? agentContext.actions : []);
            setAgentConfig(agentContext.agentConfig || null);
            setUserAgentSubscription(agentContext.userAgentSubscription || null);
            setGoals(Array.isArray(agentContext.goals) ? agentContext.goals : []);
            setBusinessPlan(agentContext.businessPlan || null);
            setPulseHistory(Array.isArray(agentContext.pulseHistory) ? agentContext.pulseHistory : []);
            setPulseConfig(agentContext.pulseConfig || null);

            console.log('[UserProvider] ✅ All data loaded successfully - setting loading to false');
            
            // CRITICAL: Set loading to false on success
            setLoading(false);
            setError(null);

            // Send to HighLevel if not already sent
            if (agentContext?.onboarding && !agentContext.onboarding.highlevelWebhookSent) {
              try {
                console.log('[UserProvider] Sending user to HighLevel...');
                await base44.functions.invoke('sendUserToHighLevel');
                console.log('[UserProvider] User sent to HighLevel successfully');
              } catch (hlError) {
                console.error('[UserProvider] Failed to send to HighLevel:', hlError);
              }
            }

        } catch (err) {
            console.error(`[UserProvider] ❌ Fetch attempt ${retryCount + 1} failed:`, err);
            
            // Retry with exponential backoff
            if (retryCount < maxRetries) {
                console.log(`[UserProvider] Retrying in ${retryDelay}ms...`);
                setTimeout(() => fetchUserData(retryCount + 1), retryDelay);
            } else {
                console.error("[UserProvider] Max retries reached, setting error state");
                setError("Unable to load your data after multiple attempts. Please refresh the page or contact support if the issue persists.");
                // CRITICAL: Set loading to false even on final error
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // Onboarding Redirect Logic
    useEffect(() => {
        if (!loading && user && onboarding) {
            const isConfiguring = window.location.pathname.includes('onboarding');
            
            // If onboarding is NOT complete and we are NOT on the onboarding page, redirect
            if (onboarding.onboardingCompleted === false && !isConfiguring) {
                console.log('[UserProvider] User has incomplete onboarding, redirecting to /onboarding');
                // Use a hard redirect to ensure they can't escape
                window.location.href = '/onboarding';
            }
        }
    }, [loading, user, onboarding]);

    const refreshUserData = useCallback(() => fetchUserData(0), [fetchUserData]);

    const contextValue = useMemo(() => ({
        user,
        marketConfig,
        agentProfile,
        preferences,
        onboarding,
        actions,
        agentConfig,
        userAgentSubscription,
        goals,
        businessPlan,
        pulseConfig,
        pulseHistory,
        loading,
        error,
        refreshUserData,
        isSupportChatOpen,
        setSupportChatOpen,
        activeSupportAgent,
        setActiveSupportAgent
    }), [
        user, marketConfig, agentProfile, preferences, onboarding, actions,
        agentConfig, userAgentSubscription, goals, businessPlan, pulseConfig,
        pulseHistory, loading, error, refreshUserData, isSupportChatOpen, setSupportChatOpen,
        activeSupportAgent, setActiveSupportAgent
    ]);

    if (error && !loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Connection Error</h2>
                    <p className="text-sm text-[#64748B] mb-6">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setError(null);
                                fetchUserData(0);
                            }}
                            className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Refresh Page
                        </button>
                        <button
                            onClick={() => window.open('mailto:support@pwru.app', '_blank')}
                            className="w-full border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}