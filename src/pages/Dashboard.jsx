import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { UserContext } from '../components/context/UserContext';
import { DailyAction } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Send, ArrowRight, Sparkles, Target, Loader2, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { generateDailyTasks } from "../components/actions/taskGeneration";
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingIndicator from "../components/ui/LoadingIndicator";
import { startOfWeek, subWeeks, endOfWeek } from 'date-fns';
import { usePGICData } from '../components/intelligence/usePGICData';
import GettingStartedWidget from "../components/onboarding/GettingStartedWidget";
import { sessionCache } from '../components/ai/sessionCache';
import { CacheStatusBadge } from '../components/ui/ChatControls';

export default function DashboardPage() {
  const {
    user,
    preferences,
    loading: contextLoading,
    goals: contextGoals,
    actions: allActions,
    agentProfile,
    businessPlan,
    onboarding,
    refreshUserData
  } = useContext(UserContext);

  const [generating, setGenerating] = useState(false);
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [aiInsight, setAiInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightMetadata, setInsightMetadata] = useState(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    "Loading your business stats...",
    "Getting your daily success plan ready...",
    "Bringing you today's opportunities.",
    "Syncing your pipeline and goals..."
  ];

  const navigate = useNavigate();

  const isSubscriberOrAdmin = user?.subscriptionTier === 'Subscriber' || user?.subscriptionTier === 'Admin';

  const userInitials = useMemo(() => {
    const firstName = user?.firstName || user?.full_name?.split(' ')[0];
    if (firstName) return firstName.charAt(0).toUpperCase();
    return 'U';
  }, [user]);

  const todayFormatted = useMemo(() => {
    const timezone = preferences?.timezone || 'America/New_York';
    return new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone
    });
  }, [preferences]);

  // Cycle through loading messages
  useEffect(() => {
    if (contextLoading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [contextLoading]);

  // Use PGIC Intelligence score as the single source of truth
  const { data: pgicData } = usePGICData(user?.id);
  
  const pulseData = useMemo(() => {
    if (!pgicData?.scores) return { overallPulseScore: 0, diagnostics: [] };
    
    return {
      overallPulseScore: Math.round(pgicData.scores.pulse || 0),
      diagnostics: pgicData.insights || []
    };
  }, [pgicData]);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (!allActions || allActions.length === 0) {
      return { completionRateDelta: 0 };
    }

    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const startOfLastWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const endOfLastWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const actionsThisWeek = allActions.filter((a) => {
      if (!a.created_date) return false;
      return new Date(a.created_date) >= startOfThisWeek;
    });

    const actionsLastWeek = allActions.filter((a) => {
      if (!a.created_date) return false;
      const created = new Date(a.created_date);
      return created >= startOfLastWeek && created <= endOfLastWeek;
    });

    const completionThisWeek = actionsThisWeek.filter((a) => a.status === 'completed').length;
    const completionRateThisWeek = actionsThisWeek.length > 0 ? completionThisWeek / actionsThisWeek.length * 100 : 0;

    const completionLastWeek = actionsLastWeek.filter((a) => a.status === 'completed').length;
    const completionRateLastWeek = actionsLastWeek.length > 0 ? completionLastWeek / actionsLastWeek.length * 100 : 0;

    const completionRateDelta = completionRateThisWeek - completionRateLastWeek;

    return { completionRateDelta };
  }, [allActions]);

  // Function to load AI insight with caching mechanism
  const loadAIInsight = async (forceRefresh = false) => {
    if (!user || contextLoading) {
      console.log('[Dashboard] Skipping insight generation - missing user or loading context.');
      return;
    }

    setInsightLoading(true);
    try {
      const completionRateDelta = analyticsData?.completionRateDelta || 0;

      const { data, metadata } = await base44.functions.invoke('generateDashboardInsight', {
        payload: {
          performanceAnalysis: pulseData,
          completionRateDelta,
          userProfile: {
            experienceLevel: agentProfile?.experienceLevel,
            activityMode: preferences?.activityMode
          }
        },
        cache: {
          key: `dashboard_insight_${user.id}`,
          scope: 'user',
          ttl: 3600,
          forceRefresh: forceRefresh
        }
      });

      setAiInsight(data);
      setInsightMetadata(metadata);
      console.log('[Dashboard] AI insight loaded:', data, metadata);
    } catch (error) {
      console.error('[Dashboard] Error loading AI insight:', error);
      toast.error("Failed to load AI insights. Please try again.");
      setAiInsight(null);
      setInsightMetadata(null);
    } finally {
      setInsightLoading(false);
    }
  };

  // Initial load of AI insight
  useEffect(() => {
    if (user && !contextLoading && !aiInsight && !insightLoading) {
      loadAIInsight();
    }
  }, [user, contextLoading, aiInsight, insightLoading, analyticsData, pulseData, agentProfile, preferences]);

  // All tasks for today
  const allTodaysTasks = useMemo(() => {
    return (allActions || []).filter((a) => a.actionDate === todayFormatted && a.status !== 'completed');
  }, [allActions, todayFormatted]);

  // First 4 tasks to display
  const todaysTasksDisplay = useMemo(() => {
    return allTodaysTasks.slice(0, 4);
  }, [allTodaysTasks]);

  const completedToday = useMemo(() => {
    return (allActions || []).filter((a) =>
    a.status === 'completed' &&
    a.completionDate &&
    new Date(a.completionDate).toDateString() === new Date().toDateString()
    ).length;
  }, [allActions]);

  const overdueTasks = useMemo(() => {
    const today = new Date(todayFormatted);
    return (allActions || []).filter((a) =>
    a.status !== 'completed' &&
    a.actionDate &&
    new Date(a.actionDate) < today
    ).length;
  }, [allActions, todayFormatted]);

  const handleGenerateActions = async () => {
    if (!user || !preferences) {
      toast.error("Unable to generate actions. Please complete your profile setup.");
      return;
    }

    if (!businessPlan) {
      toast.info("Complete your Production Planner to generate personalized actions.");
      navigate(createPageUrl('Goals?tab=planner'));
      return;
    }

    setGenerating(true);
    try {
      const result = await generateDailyTasks(user, preferences);

      if (Array.isArray(result) && result.length > 0) {
        toast.success(`${result.length} new daily action(s) generated!`);
      } else if (result === 'already_exists') {
        toast.info("Today's actions have already been generated.");
      } else if (result === 'no_templates') {
        toast.info("No task templates available. Please contact support.");
      } else {
        toast.info("No new actions to generate based on your current plan.");
      }

      sessionCache.remove(user.id, 'dashboard', 'insight');

      await refreshUserData();
      setTimeout(() => loadAIInsight(true), 1000);

    } catch (error) {
      console.error("Error generating actions from Dashboard:", error);
      toast.error("Could not generate actions. Please try again or contact support.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = useCallback(async (actionId, isCompleted) => {
    const newStatus = isCompleted ? 'completed' : 'not_started';
    try {
      await base44.entities.DailyAction.update(actionId, {
        status: newStatus,
        completionDate: newStatus === 'completed' ? new Date().toISOString() : null
      });

      sessionCache.remove(user.id, 'context', 'pulse_score');
      sessionCache.remove(user.id, 'dashboard', 'insight');

      await refreshUserData();

      setTimeout(() => loadAIInsight(true), 1000);

      toast.success(isCompleted ? "Task completed!" : "Task marked incomplete");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Could not update task.");
    }
  }, [refreshUserData, user?.id]);

  const handleAdvisorSubmit = (e) => {
    e.preventDefault();
    if (!advisorQuery.trim()) return;
    navigate(createPageUrl(`PersonalAdvisor?query=${encodeURIComponent(advisorQuery)}`));
  };

  const handleMyAITeamClick = () => {
    if (isSubscriberOrAdmin) {
      navigate(createPageUrl('Agents'));
    } else {
      navigate(createPageUrl('Plans'));
    }
  };

  const activityGoals = useMemo(() => {
    if (!contextGoals) return [];
    return [
    contextGoals.find((g) => g.title?.toLowerCase() === 'total conversations') || { currentValue: 0, targetValue: 100, title: 'Total Conversations' },
    contextGoals.find((g) => g.title?.toLowerCase() === 'total appointments set') || { currentValue: 0, targetValue: 50, title: 'Total Appointments Set' },
    contextGoals.find((g) => g.title?.toLowerCase() === 'total agreements signed') || { currentValue: 0, targetValue: 25, title: 'Total Agreements Signed' }];

  }, [contextGoals]);

  const productionGoals = useMemo(() => {
    if (!contextGoals) return [];
    return [
    contextGoals.find((g) => g.title?.toLowerCase() === 'total sales volume') || { currentValue: 0, targetValue: 1000000, title: 'Total Sales Volume' },
    contextGoals.find((g) => g.title?.toLowerCase() === 'total gci') || { currentValue: 0, targetValue: 100000, title: 'Total GCI' },
    contextGoals.find((g) => g.title?.toLowerCase() === 'total buyers closed') || { currentValue: 0, targetValue: 10, title: 'Total Buyers Closed' },
    contextGoals.find((g) => g.title?.toLowerCase() === 'total listings closed') || { currentValue: 0, targetValue: 10, title: 'Total Listings Closed' }];

  }, [contextGoals]);

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <LoadingIndicator text={loadingMessages[loadingMessageIndex]} size="lg" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-muted/30">
      <title>Dashboard - PULSE Intelligence</title>
      <meta name="description" content="Your PULSE Intelligence dashboard with daily tasks, AI insights, and performance metrics to help you grow your real estate business." />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GettingStartedWidget />

        <div className="flex justify-between items-center gap-8 mb-6">
          <div className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-foreground">
              Hi, {user?.firstName || user?.full_name?.split(' ')[0] || 'Agent'}
            </h1>
            <p className="text-base font-medium text-muted-foreground mt-1">
              What are your plans for today?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-primary p-6 rounded-lg border border-border flex flex-col h-full">
            <h2 className="text-primary-foreground mb-1 text-base font-semibold">Today's Pulse</h2>
            <p className="text-primary-foreground mb-6 text-sm font-medium">Your daily performance score</p>

            <div className="flex items-center justify-center mb-6 flex-1">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(pulseData?.overallPulseScore || 0) / 100 * 314} 314`}
                    className="transition-all duration-500" />

                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-primary-foreground text-5xl font-bold">{pulseData?.overallPulseScore || 0}</div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate(createPageUrl('Intelligence'))}
              className="bg-card text-primary px-4 py-2 text-sm font-semibold rounded-md w-full h-10 hover:bg-secondary mt-auto">

              VIEW MORE
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Today's Focus</h2>
              <button onClick={() => navigate(createPageUrl('ToDo'))} aria-label="View all tasks">
                <ArrowRight className="w-5 h-5 text-muted-foreground hover:text-[#6D28D9]" />
              </button>
            </div>

            <div className="space-y-3 mb-6 flex-1">
              {todaysTasksDisplay.length > 0 ?
              todaysTasksDisplay.map((task) =>
              <div key={task.id} className="flex items-center gap-3">
                    <Checkbox
                  id={`task-${task.id}`}
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => handleToggleTask(task.id, checked)}
                  className="w-5 h-5" />

                    <label
                  htmlFor={`task-${task.id}`}
                  className="text-foreground text-sm font-medium cursor-pointer">

                      {task.title}
                    </label>
                  </div>
              ) :

              <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No tasks for today.</p>
                  <Button
                  onClick={handleGenerateActions}
                  disabled={generating}
                  size="sm" className="bg-secondary text-muted-foreground px-3 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 hover:bg-primary/90">


                    {generating ?
                  <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </> :

                  <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Tasks
                      </>
                  }
                  </Button>
                </div>
              }
            </div>

            <div className="border-t border-border pt-4 mb-4">
              <h3 className="text-base font-semibold text-foreground mb-4">Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold text-[var(--status-warning)]">{allTodaysTasks.length}</div>
                  <div className="text-tiny font-semibold uppercase text-muted-foreground mt-1">DUE TODAY</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--status-success)]">{completedToday}</div>
                  <div className="text-tiny font-semibold uppercase text-muted-foreground mt-1">COMPLETED</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--status-error)]">{overdueTasks}</div>
                  <div className="text-tiny font-semibold uppercase text-muted-foreground mt-1">OVERDUE</div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate(createPageUrl('ToDo'))}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold mt-auto">

              VIEW ALL
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/af4da936f_PULSEaiicon.png"
                    alt="AI Insights"
                    width="20"
                    height="20"
                    className="w-5 h-5 object-contain" />

                  AI Insights
                </h2>
                {insightMetadata?.cacheHit !== undefined &&
                <CacheStatusBadge
                  cacheHit={insightMetadata.cacheHit}
                  timestamp={insightMetadata.timestamp}
                  className="mt-1" />

                }
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadAIInsight(true)}
                disabled={insightLoading}
                className="text-muted-foreground hover:text-[#6D28D9] h-8 w-8">

                {insightLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            {insightLoading && !aiInsight ?
            <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center flex-1">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating your daily insight...</span>
              </div> :
            aiInsight ?
            <div className="space-y-4 flex-1">
                {aiInsight.summary &&
              <div>
                    <h3 className="text-foreground mb-1 text-sm font-medium">Insight Summary</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{aiInsight.summary}</p>
                  </div>
              }
                
                {aiInsight.reason &&
              <div>
                    <h3 className="text-foreground mb-1 text-sm font-medium">Why It Matters</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{aiInsight.reason}</p>
                  </div>
              }
                
                {aiInsight.actions && aiInsight.actions.length > 0 &&
              <div>
                    <h3 className="text-foreground mb-2 text-sm font-medium">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {aiInsight.actions.map((action, index) =>
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{typeof action === 'string' ? action : action.label || action.action}</span>
                        </li>
                  )}
                    </ul>
                  </div>
              }
              </div> :

            <p className="text-muted-foreground text-sm flex-1">No insights available yet. Complete more actions to get personalized insights!</p>
            }
            <Button
              onClick={() => navigate(createPageUrl('Goals?tab=insights'))}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold mt-4">

              VIEW ALL
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-foreground text-base font-semibold">Ask Me About Your Market</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant insights about your market, trends, and opportunities.
              </p>
            </div>
            <Button
              asChild
              className="bg-primary hover:bg-primary w-full">

              <Link to={createPageUrl('PersonalAdvisor')} className="">START CONVERSATION

              </Link>
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Activities Progress</h2>
              <button onClick={() => navigate(createPageUrl('Goals'))} aria-label="View all activities">
                <ArrowRight className="w-5 h-5 text-muted-foreground hover:text-[#6D28D9]" />
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {activityGoals.map((goal, idx) => {
                const percentage = goal.targetValue > 0 ? Math.min(goal.currentValue / goal.targetValue * 100, 100) : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {goal.title || `Activity ${idx + 1}`}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{Math.round(percentage)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded h-2">
                      <div
                        className="bg-primary h-2 rounded transition-all duration-300"
                        style={{ width: `${percentage}%` }} />

                    </div>
                  </div>);

              })}
            </div>
            <Button
              onClick={() => navigate(createPageUrl('Goals'))}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold mt-4">

              VIEW ALL
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Goals Progress</h2>
              <button onClick={() => navigate(createPageUrl('Goals'))} aria-label="View all goals">
                <ArrowRight className="w-5 h-5 text-muted-foreground hover:text-[#6D28D9]" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              {productionGoals.slice(0, 3).map((goal, idx) => {
                const percentage = goal.targetValue > 0 ? Math.min(goal.currentValue / goal.targetValue * 100, 100) : 0;
                const formattedCurrent =
                goal.title?.toLowerCase().includes('volume') || goal.title?.toLowerCase().includes('gci') ?
                `$${(goal.currentValue / 1000).toFixed(0)}K` :
                goal.currentValue;
                const formattedTarget =
                goal.title?.toLowerCase().includes('volume') || goal.title?.toLowerCase().includes('gci') ?
                `$${(goal.targetValue / 1000).toFixed(0)}K` :
                goal.targetValue;

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        {goal.title || `Goal ${idx + 1}`}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{Math.round(percentage)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formattedCurrent} out of {formattedTarget}
                    </p>
                    <div className="w-full bg-secondary rounded h-2">
                      <div
                        className="bg-primary h-2 rounded transition-all duration-300"
                        style={{ width: `${percentage}%` }} />

                    </div>
                  </div>);

              })}
            </div>

            <Button
              onClick={() => navigate(createPageUrl('Goals'))}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold mt-4">

              VIEW ALL
            </Button>
          </div>
        </div>
      </div>
    </div>);

}