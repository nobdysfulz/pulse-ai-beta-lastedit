import React, { useState, useEffect, useContext, useMemo } from "react";
import { UserContext } from '../components/context/UserContext';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Loader2, RefreshCw, Filter, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/components/lib/utils";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import DailyBriefCard from '../components/tasks/DailyBriefCard';
import PriorityTaskCard from '../components/tasks/PriorityTaskCard';
import SecondaryTaskCard from '../components/tasks/SecondaryTaskCard';
import InsightsPanel from '../components/tasks/InsightsPanel';
import OutcomeCaptureModal from '../components/tasks/OutcomeCaptureModal';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { usePGICData } from '../components/intelligence/usePGICData';
import GettingStartedWidget from '../components/onboarding/GettingStartedWidget';

export default function ToDoPage() {
  const { user, actions: allActions, goals, refreshUserData, loading: contextLoading, setSupportChatOpen, setActiveSupportAgent, onboarding } = useContext(UserContext);
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch Real PGIC Data
  const { data: pgicData, loading: pgicLoading } = usePGICData(user?.id);

  // Fetch Daily Brief
  useEffect(() => {
    const fetchBrief = async () => {
      if (!user) return;
      try {
        const today = new Date().toLocaleDateString('en-CA');
        const briefs = await base44.entities.UserDailyBrief.filter({ userId: user.id, date: today });
        if (briefs.length > 0) {
          setBrief(briefs[0]);
        }
      } catch (error) {
        console.error("Error fetching brief:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!contextLoading) fetchBrief();
  }, [user, contextLoading]);

  // Filter Tasks
  const todayFormatted = new Date().toLocaleDateString('en-CA');

  // 1. All tasks for today (for counts)
  const allTodaysTasks = useMemo(() => {
    if (!allActions) return [];
    return allActions.filter((a) => a.actionDate === todayFormatted && a.status !== 'deferred');
  }, [allActions, todayFormatted]);

  // 2. Filtered tasks for display
  const visibleTasks = useMemo(() => {
    let tasks = [...allTodaysTasks];

    if (filter !== "all") {
      if (filter === "completed") tasks = tasks.filter((t) => t.status === 'completed');else
      if (filter === "high_priority") tasks = tasks.filter((t) => t.priority === 'high');else
      if (filter === "in_progress") tasks = tasks.filter((t) => t.status === 'in_progress');
    }

    if (search) {
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort: High Priority first, then by Success Probability
    return tasks.sort((a, b) => {
      // Completed last
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      const priorityScore = { high: 3, medium: 2, low: 1 };
      const diff = (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
      if (diff !== 0) return diff;
      return (b.successProbability || 0) - (a.successProbability || 0);
    });
  }, [allTodaysTasks, filter, search]);

  const priorityTasks = visibleTasks.filter((t) => t.priority === 'high' && t.status !== 'completed');
  const secondaryTasks = visibleTasks.filter((t) => t.priority !== 'high' && t.status !== 'completed');
  const completedTasks = visibleTasks.filter((t) => t.status === 'completed');

  // Stats for Insights Panel (Use allTodaysTasks for accurate daily stats regardless of filter)
  const stats = useMemo(() => {
    const completed = allTodaysTasks.filter((t) => t.status === 'completed').length;
    const total = allTodaysTasks.length;
    const timeInvested = allTodaysTasks.filter((t) => t.status === 'completed').reduce((acc, t) => acc + (t.estimatedDurationMinutes || 30), 0);
    return { completed, total, percent: total > 0 ? Math.round(completed / total * 100) : 0, timeInvested };
  }, [allTodaysTasks]);

  // Goal Progress - Strictly based on Total Sales Volume as requested
  const goalProgress = useMemo(() => {
    if (!goals || goals.length === 0) return { percent: 0, target: 0 };

    // Look strictly for Total Sales Volume (case insensitive to be safe)
    const volumeGoal = goals.find((g) =>
    (g.title?.toLowerCase() === 'total sales volume' || g.title?.toLowerCase() === 'sales volume') &&
    g.status === 'active'
    );

    if (!volumeGoal) return { percent: 0, target: 0 };

    const current = volumeGoal.currentValue || 0;
    const target = volumeGoal.targetValue || 1; // Avoid division by zero

    const percent = Math.round(current / target * 100);

    // Allow percentage to go above 100 if they are over-performing
    return { percent, target: volumeGoal.targetValue };
  }, [goals]);

  // Handlers
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateDailyTasks', { forceRegenerate: true });
      if (res.status && res.status >= 400) throw new Error(res.data?.error || 'Failed');
      if (res.data?.error) throw new Error(res.data.error);
      await refreshUserData();
      toast.success("New personalized tasks generated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate tasks.");
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = (task) => {
    setSelectedTask(task);
    setOutcomeModalOpen(true);
  };

  const handleOutcomeSubmit = async (outcomeData) => {
    if (!selectedTask) return;
    try {
      await base44.entities.DailyAction.update(selectedTask.id, {
        status: 'completed',
        completionDate: new Date().toISOString()
      });
      // Log outcome logic here if needed
      toast.success("Great job! Results recorded.");
      await refreshUserData();
    } catch (error) {
      toast.error("Failed to save progress.");
    }
  };

  const handleSnooze = async (task) => {
    try {
      const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];
      await base44.entities.DailyAction.update(task.id, { actionDate: tomorrow });
      toast.success("Task snoozed to tomorrow");
      await refreshUserData();
    } catch (error) {
      toast.error("Failed to snooze task");
    }
  };

  const isSubscriberOrAdmin = user?.subscriptionTier === 'Subscriber' || user?.subscriptionTier === 'Admin' || user?.role === 'admin';
  const PREMIUM_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/296c6f901_image.png";

  const handleAiAssistant = () => {
    if (!isSubscriberOrAdmin) {
      navigate(createPageUrl('Plans'));
      return;
    }
    setActiveSupportAgent('pgic_intelligence_agent');
    setSupportChatOpen(true);
  };

  if (loading || contextLoading) return <LoadingIndicator />;

  return (
    <div className="min-h-screen bg-muted/30 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Main Layout Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-[3fr,1fr] gap-8 items-start">
                    
                    {/* LEFT COLUMN: Content */}
                    <div className="space-y-6">
                        
                        {/* Onboarding Widget */}
                        {onboarding && !onboarding.onboardingCompleted && (
                            <GettingStartedWidget />
                        )}

                        {/* 1. Header Card */}
                        <DailyBriefCard
              user={user}
              brief={brief}
              pgicData={pgicData?.scores || { pulse: 0, gane: 0, moro: 0 }}
              goalProgress={goalProgress}
              tasksCount={allTodaysTasks.length} />


                        {/* 2. Filters & Toolbar */}
                        <div className="bg-[#ffffff] p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-gray-200 relative z-20">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap">View:</span>
                                    <Select value={filter} onValueChange={setFilter}>
                                        <SelectTrigger className="w-[140px] h-9 rounded-md border-gray-200 text-sm font-medium">
                                            <SelectValue placeholder="All Tasks" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Tasks ({allTodaysTasks.length})</SelectItem>
                                            <SelectItem value="high_priority">High Priority</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                    {['High Priority', 'In Progress'].map((f) =>
                  <button
                    key={f}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all whitespace-nowrap"
                    onClick={() => setFilter(f.toLowerCase().replace(' ', '_'))}>

                                            {f}
                                        </button>
                  )}
                                </div>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                  placeholder="Search tasks..."
                  className="pl-9 h-9 rounded-md border-gray-200 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)} />

                            </div>
                        </div>

                        {/* 3. Tasks List */}
                        {visibleTasks.length === 0 && !generating ?
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                <div className="text-4xl mb-4">🎉</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h3>
                                <Button onClick={handleGenerate} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white mt-4">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Generate New Tasks
                                </Button>
                            </div> :

            <div className="space-y-6">
                                {/* Priority Tasks */}
                                {(priorityTasks.length > 0 || filter === 'high_priority') &&
              <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Priority Tasks</h4>
                                        {priorityTasks.map((task) =>
                <PriorityTaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onSkip={handleSnooze}
                  onHelp={handleAiAssistant}
                  isExpanded={true} // Expanded by default
                  isPremiumUser={isSubscriberOrAdmin}
                />
                )}
                                        {priorityTasks.length === 0 &&
                <div className="text-center p-8 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                                                No high priority tasks pending.
                                            </div>
                }
                                    </div>
              }

                                {/* Secondary Tasks */}
                                {secondaryTasks.length > 0 &&
              <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                            Secondary Tasks
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {secondaryTasks.map((task) =>
                  <SecondaryTaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onSnooze={handleSnooze}
                    onSkip={handleSnooze}
                    onHelp={handleAiAssistant}
                    isPremiumUser={isSubscriberOrAdmin} />

                  )}
                                        </div>
                                    </div>
              }

                                {/* Completed Tasks */}
                                {completedTasks.length > 0 &&
              <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                            Completed Today
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
                                            {completedTasks.map((task) =>
                  <SecondaryTaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => {}} // Disable complete
                    onSnooze={() => {}} // Disable snooze
                    onSkip={() => {}} // Disable skip
                    onHelp={handleAiAssistant} />

                  )}
                                        </div>
                                    </div>
              }
                            </div>
            }

                        {generating &&
            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
                            </div>
            }
                    </div>

                    {/* RIGHT COLUMN: Insights */}
                    <div className="hidden xl:block space-y-6">
                        <InsightsPanel stats={stats} goalProgress={goalProgress} />
                        
                        {/* Additional Tip/Helper Card could go here */}
                        <div className="bg-[#7C3AED] p-6 text-center rounded-xl border border-dashed border-gray-300">
                            <p className="text-slate-50 mb-2 text-sm">Want to break down a strategy step-by-step?</p>
                            <Button variant="outline" className="w-full bg-white gap-2" onClick={handleAiAssistant}>
                                Ask The AI Coach
                                {!isSubscriberOrAdmin && (
                                  <img 
                                    src={PREMIUM_ICON_URL} 
                                    alt="Premium" 
                                    className="w-4 h-4 object-contain" 
                                  />
                                )}
                            </Button>
                        </div>
                    </div>

                </div>
            </div>

            <OutcomeCaptureModal
        isOpen={outcomeModalOpen}
        onClose={() => setOutcomeModalOpen(false)}
        task={selectedTask}
        onSubmit={handleOutcomeSubmit} />

        </div>);

}