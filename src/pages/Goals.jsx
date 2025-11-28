import React, { useState, useEffect, useContext, useMemo } from "react";
import { UserContext } from '../components/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, PlusCircle, Edit, Printer, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import ContextualTopNav from "../components/layout/ContextualTopNav";
import ContextualSidebar from "../components/layout/ContextualSidebar";
import UpdateProgressModal from "../components/goals/UpdateProgressModal";
import ProductionPlannerModal from "../components/goal-planner/ProductionPlannerModal";
import AddGoalModal from "../components/goals/AddGoalModal";
import { calculateConfidencePercentage } from "../components/goals/confidenceCalculator";
import { deduplicateGoals } from "../components/goals/goalDeduplication";
import { startOfQuarter, endOfQuarter, differenceInDays, startOfYear, endOfYear, getQuarter, format as formatDate } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateDailyTasks } from "../components/actions/taskGeneration";
import LoadingIndicator from "../components/ui/LoadingIndicator";
import { base44 } from '@/api/base44Client';
import { CompactText, CacheStatusBadge } from '../components/ui/ChatControls';
import { jsPDF } from 'jspdf';

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(value || 0);

export default function GoalsPage() {
  const navigate = useNavigate();
  const { user, goals: contextGoals, businessPlan, refreshUserData, allActions, preferences } = useContext(UserContext);

  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabFromUrl || 'tracking');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateProgress, setShowUpdateProgress] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [isSyncingCrm, setIsSyncingCrm] = useState(false);

  useEffect(() => {
    if (urlParams.get('openPlanner')) {
      setShowPlannerModal(true);
    }
  }, []);
  const [crmConnected, setCrmConnected] = useState(null);
  const [generatingActions, setGeneratingActions] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsMetadata, setInsightsMetadata] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = isMobile 
    ? [{ id: 'tracking', label: 'Tracking' }]
    : [
        { id: 'tracking', label: 'Tracking' },
        { id: 'insights', label: 'Insights' },
        { id: 'planner', label: 'Planner' }
      ];


  const loadPageData = async () => {
    setLoading(true);
    try {
      const allGoalsWithConfidence = (contextGoals || []).map((goal) => ({
        ...goal,
        confidenceLevel: goal.status === 'active' || goal.status === 'at-risk' ? calculateConfidencePercentage(
          new Date(),
          new Date(goal.deadline),
          goal.targetValue,
          goal.currentValue || 0,
          new Date(goal.created_date)
        ) : null
      }));

      // Use centralized deduplication utility
      const deduplicatedGoals = deduplicateGoals(allGoalsWithConfidence);

      setGoals(deduplicatedGoals);

      if (user) {
        const connections = await base44.entities.CrmConnection.filter({
          userId: user.id,
          connectionStatus: 'connected'
        });

        const loftyConn = connections.find((c) => c.crmType === 'lofty' && c.syncSettings?.syncGoals);
        const fubConn = connections.find((c) => c.crmType === 'follow_up_boss' && c.syncSettings?.syncGoals);

        if (loftyConn && fubConn) {
          setCrmConnected('both');
        } else if (loftyConn) {
          setCrmConnected('lofty');
        } else if (fubConn) {
          setCrmConnected('follow_up_boss');
        } else {
          setCrmConnected(null);
        }
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      toast.error("Failed to load your goals data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadPageData();
  }, [user, contextGoals]);

  const handleSyncFromCrm = async () => {
    setIsSyncingCrm(true);
    try {
      let metricsData = null;

      if (crmConnected === 'lofty' || crmConnected === 'both') {
        const { data } = await base44.functions.invoke('loftySync', { action: 'getGoalMetrics' });
        if (data?.success) metricsData = data.metrics;
      } else if (crmConnected === 'follow_up_boss') {
        const { data } = await base44.functions.invoke('followUpBossSync', { action: 'getGoalMetrics' });
        if (data?.success) metricsData = data.metrics;
      }

      if (metricsData) {
        const updates = [];

        goals.forEach((goal) => {
          let newValue = null;

          if (goal.title === "Total GCI") {
            newValue = metricsData.totalGCI;
          } else if (goal.title === "Total Sales Volume") {
            newValue = metricsData.totalVolume;
          } else if (goal.title === "Total Buyers Closed") {
            newValue = metricsData.buyerDeals;
          } else if (goal.title === "Total Listings Closed") {
            newValue = metricsData.listingDeals;
          }

          if (newValue !== null && newValue !== goal.currentValue) {
            updates.push({ goalId: goal.id, newValue });
          }
        });

        if (updates.length > 0) {
          for (const update of updates) {
            await base44.entities.Goal.update(update.goalId, { currentValue: update.newValue });
          }
          toast.success(`Synced ${updates.length} goal(s) from CRM`);
          await refreshUserData();
        } else {
          toast.info("No updates needed - goals are already current or no relevant metrics found.");
        }
      } else {
        toast.error("Failed to retrieve metrics from CRM.");
      }
    } catch (error) {
      console.error("Failed to sync from CRM:", error);
      toast.error("Failed to sync goals from CRM");
    } finally {
      setIsSyncingCrm(false);
    }
  };

  const handleUpdateProgress = async (goalId, progressData) => {
    try {
      const goalToUpdate = goals.find((g) => g.id === goalId);
      if (!goalToUpdate) {
        toast.error("Goal not found.");
        return;
      }
      const isCompleted = progressData.currentValue >= goalToUpdate.targetValue;
      const finalData = { ...progressData, status: isCompleted ? 'completed' : 'active' };

      await base44.entities.Goal.update(goalId, finalData);
      await refreshUserData();
      setShowUpdateProgress(false);
      setSelectedGoal(null);
      toast.success("Goal progress updated!");
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress.");
    }
  };

  const handleAddGoal = async (goal) => {
    // Goal is already created/updated by AddGoalModal using upsertGoal
    // Just reload the data
    await refreshUserData();
    setShowAddGoal(false);
  };

  const handlePlanSaved = async () => {
    const onboardingRecords = await base44.entities.UserOnboarding.filter({ userId: user.id });
    if (onboardingRecords.length > 0) {
      const currentSteps = onboardingRecords[0].completedSteps || [];
      await base44.entities.UserOnboarding.update(onboardingRecords[0].id, {
        goalsSetupCompleted: true,
        goalsCompletionDate: new Date().toISOString(),
        completedSteps: [...new Set([...currentSteps, 'goals'])]
      });
    } else {
      await base44.entities.UserOnboarding.create({
        userId: user.id,
        goalsSetupCompleted: true,
        goalsCompletionDate: new Date().toISOString(),
        completedSteps: ['goals']
      });
    }

    await refreshUserData();
    setShowPlannerModal(false);
    toast.success("Production plan saved!");
  };

  const handleDownloadGoals = async () => {
    if (goals.length === 0) {
      toast.info("No goals to download.");
      return;
    }

    try {
      toast.info('Generating PDF...');

      const doc = new jsPDF();

      // Load and add logo
      const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/c8406aefd_PWRULogoBlack.png';
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load logo'));
        img.src = logoUrl;
      });

      const logoWidth = 40;
      const logoHeight = img.height / img.width * logoWidth;
      doc.addImage(img, 'PNG', 210 - 20 - logoWidth, 10, logoWidth, logoHeight);

      // Title
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Goals Overview', 20, 20);

      // Divider
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);

      // Subtitle
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Generated: ${formatDate(new Date(), 'MMM d, yyyy')}`, 20, 35);

      let yPosition = 50;

      // Production Goals
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Production Goals', 20, yPosition);
      yPosition += 10;

      const productionGoals = goals.filter((g) => g.category === 'production');
      productionGoals.forEach((goal) => {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(goal.title, 20, yPosition);
        yPosition += 6;

        doc.setFont(undefined, 'normal');
        const current = goal.targetUnit === 'USD' ? formatCurrency(goal.currentValue) : goal.currentValue;
        const target = goal.targetUnit === 'USD' ? formatCurrency(goal.targetValue) : goal.targetValue;
        doc.text(`${current} of ${target}`, 20, yPosition);
        yPosition += 8;
      });

      yPosition += 5;

      // Activity Goals
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Activity Goals', 20, yPosition);
      yPosition += 10;

      const activityGoals = goals.filter((g) => g.category === 'activity');
      activityGoals.forEach((goal) => {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(goal.title, 20, yPosition);
        yPosition += 6;

        doc.setFont(undefined, 'normal');
        doc.text(`${goal.currentValue || 0} of ${goal.targetValue}`, 20, yPosition);
        yPosition += 8;
      });

      doc.save(`Goals_${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Goals PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrintGoals = () => {
    const printContent = document.getElementById('goals-print-area');
    if (!printContent) {
      toast.error("Print content not found");
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Goals - PULSE Intelligence</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #7C3AED; padding-bottom: 10px; }
            .logo { width: 120px; height: auto; }
            h1 { color: #1E293B; margin: 0; font-size: 28px; }
            h2 { color: #475569; margin-top: 20px; font-size: 18px; font-weight: bold; }
            .goal-item { margin-bottom: 15px; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; }
            .goal-title { font-weight: bold; color: #1E293B; margin-bottom: 5px; }
            .goal-progress { color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Goals Overview</h1>
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a795970202102129f19983/c8406aefd_PWRULogoBlack.png" alt="PWRU Logo" class="logo" />
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleGenerateActions = async () => {
    if (!user || !preferences) {
      toast.error("User data or preferences not available.");
      return;
    }

    setGeneratingActions(true);
    try {
      const result = await generateDailyTasks(user, preferences);

      if (Array.isArray(result) && result.length > 0) {
        toast.success(`${result.length} new daily action(s) generated!`);
      } else if (result === 'already_exists') {
        toast.info("Today's actions have already been generated.");
      } else {
        toast.info("No new actions were generated based on your current plan.");
      }
      await refreshUserData();
    } catch (error) {
      console.error("Error generating actions from Goals page:", error);
      toast.error("Could not generate actions.");
    } finally {
      setGeneratingActions(false);
    }
  };

  const activeProductionGoals = useMemo(() => goals.filter((g) => g.status === 'active' && g.category === 'production'), [goals]);
  const activeActivityGoals = useMemo(() => goals.filter((g) => g.status === 'active' && g.category === 'activity'), [goals]);

  const summaryData = useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const quarterStart = startOfQuarter(now);
    const quarterEnd = endOfQuarter(now);

    // Use all active goals (not just production) for overall progress
    const allActiveGoals = goals.filter((g) => g.status === 'active');

    const totalProgressRatio = allActiveGoals.reduce((acc, goal) => {
      const progress = (goal.currentValue || 0) / (goal.targetValue || 1);
      return acc + (isNaN(progress) ? 0 : Math.min(progress, 1));
    }, 0) / (allActiveGoals.length || 1);

    const overallProgress = Math.round(totalProgressRatio * 100);

    const gciGoal = goals.find((g) => g.title === 'Total GCI');
    const annualGciTarget = businessPlan?.gciRequired || gciGoal?.targetValue || 0;
    const currentGci = gciGoal?.currentValue || 0;
    const ytdGciProgress = annualGciTarget > 0 ? currentGci / annualGciTarget * 100 : 0;

    const quarterGoals = allActiveGoals.filter((g) => {
      const deadline = new Date(g.deadline);
      return !isNaN(deadline.getTime()) && deadline >= quarterStart && deadline <= quarterEnd;
    });

    const quarterProgressRatio = quarterGoals.reduce((acc, goal) => {
      const progress = (goal.currentValue || 0) / (goal.targetValue || 1);
      return acc + (isNaN(progress) ? 0 : Math.min(progress, 1));
    }, 0) / (quarterGoals.length || 1);

    const quarterlyProgress = Math.round(quarterProgressRatio * 100);

    const daysInYear = differenceInDays(yearEnd, yearStart);
    const elapsedDays = differenceInDays(now, yearStart);
    const timeElapsedRatio = daysInYear > 0 ? elapsedDays / daysInYear : 0;

    const projectedPace = timeElapsedRatio > 0 ? totalProgressRatio / timeElapsedRatio * 100 : 0;

    return {
      overallProgress: Math.round(overallProgress),
      currentGci: formatCurrency(currentGci),
      annualGciTarget: formatCurrency(annualGciTarget),
      ytdGciProgress: Math.round(ytdGciProgress),
      quarterlyProgress: Math.round(quarterlyProgress),
      currentQuarter: `Q${getQuarter(now)} ${formatDate(now, 'yyyy')}`,
      projectedPace: Math.min(100, Math.round(projectedPace))
    };
  }, [goals, businessPlan]);

  const priorityGoalsData = useMemo(() => {
    const mainTitles = ["Total GCI", "Total Buyers Closed", "Total Listings Closed", "Total Sales Volume"];
    return activeProductionGoals.filter((g) => mainTitles.includes(g.title)).map((goal) => {
      const now = new Date();
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);
      const timeElapsedRatio = differenceInDays(yearEnd, yearStart) > 0 ? differenceInDays(now, yearStart) / differenceInDays(yearEnd, yearStart) : 0;
      const expectedProgress = timeElapsedRatio;
      const actualProgress = goal.targetValue > 0 ? (goal.currentValue || 0) / goal.targetValue : 0;

      const isCurrency = goal.targetUnit === 'USD';

      let status = 'On Track';
      let statusColor = 'bg-green-100 text-green-800';
      let nextStep = `You are on track to meet your goal of ${isCurrency ? formatCurrency(goal.targetValue) : goal.targetValue}.`;

      if (actualProgress < expectedProgress * 0.8) {
        status = 'At Risk';
        statusColor = 'bg-red-100 text-red-800';
        const needed = Math.ceil(goal.targetValue * expectedProgress - goal.currentValue);
        const formattedNeeded = isCurrency ? formatCurrency(needed) : needed;
        nextStep = `You need ${needed > 0 ? formattedNeeded : 'to accelerate'} ${!isCurrency ? goal.targetUnit : ''} to get back on pace.`.trim();
      } else if (actualProgress < expectedProgress) {
        status = 'Slightly Behind';
        statusColor = 'bg-yellow-100 text-yellow-800';
        const needed = Math.ceil(goal.targetValue * expectedProgress - goal.currentValue);
        const formattedNeeded = isCurrency ? formatCurrency(needed) : needed;
        nextStep = `You are slightly behind pace. Aim for ${needed > 0 ? formattedNeeded : 'more'} ${!isCurrency ? goal.targetUnit : ''} soon.`.trim();
      }

      return {
        ...goal,
        progress: Math.round(actualProgress * 100),
        status,
        statusColor,
        nextStep
      };
    });
  }, [activeProductionGoals]);

  const activityDriversData = useMemo(() => {
    return activeActivityGoals.slice(0, 2).map((goal) => {
      const progress = goal.targetValue > 0 ? (goal.currentValue || 0) / goal.targetValue * 100 : 0;
      return {
        ...goal,
        progress: Math.round(progress),
        paceLabel: 'Pace calculation pending'
      };
    });
  }, [activeActivityGoals]);

  const forecastData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: formatDate(new Date(currentYear, i, 1), 'MMM'),
      goal: (i + 1) / 12 * 100
    }));

    const currentMonth = new Date().getMonth();
    const allActiveGoals = goals.filter((g) => g.status === 'active');

    const totalProgressRatio = allActiveGoals.reduce((acc, goal) => {
      const progress = (goal.currentValue || 0) / goal.targetValue;
      return acc + (isNaN(progress) ? 0 : progress);
    }, 0) / (allActiveGoals.length || 1);

    months.forEach((month, i) => {
      if (i <= currentMonth) {
        month.actual = totalProgressRatio / (currentMonth + 1) * (i + 1) * 100;
      } else {
        month.actual = null;
      }
    });
    return months;
  }, [goals]);

  const performanceDiagnostics = useMemo(() => {
    if (!summaryData || !priorityGoalsData) return null;

    const overallProgress = summaryData.overallProgress;
    const laggingGoal = priorityGoalsData.find((g) => g.status === 'At Risk' || g.status === 'Slightly Behind');

    let diagnosticsSummary = `Overall goal progress is ${overallProgress}%.`;
    if (laggingGoal) {
      diagnosticsSummary += ` A key goal, "${laggingGoal.title}", is currently ${laggingGoal.status}. Next step: ${laggingGoal.nextStep}.`;
    } else {
      diagnosticsSummary += ` All priority goals are on track.`;
    }

    return {
      overallProgress: overallProgress,
      ytdGciProgress: summaryData.ytdGciProgress,
      quarterlyProgress: summaryData.quarterlyProgress,
      projectedPace: summaryData.projectedPace,
      laggingGoal: laggingGoal ? { title: laggingGoal.title, status: laggingGoal.status, nextStep: laggingGoal.nextStep } : null,
      diagnostics: diagnosticsSummary
    };
  }, [summaryData, priorityGoalsData]);

  const loadAIInsights = async (forceRefresh = false) => {
    if (!goals || goals.length === 0 || !user || !performanceDiagnostics) {
      setAiInsights(null);
      setInsightsMetadata(null);
      return;
    }

    setInsightsLoading(true);
    try {
      const preparedGoals = goals.map((g) => {
        const matchingPriorityGoal = priorityGoalsData.find((pg) => pg.id === g.id);
        const progressPercentage = matchingPriorityGoal ?
        matchingPriorityGoal.progress :
        g.targetValue > 0 ? Math.round((g.currentValue || 0) / g.targetValue * 100) : 0;

        let trend = 'on-track';
        if (g.status === 'completed') trend = 'completed';else
        if (g.confidenceLevel !== null) {
          if (g.confidenceLevel < 50) trend = 'at-risk';else
          if (g.confidenceLevel < 80) trend = 'behind';else
          trend = 'on-track';
        }
        if (matchingPriorityGoal && matchingPriorityGoal.status) {
          if (matchingPriorityGoal.status === 'At Risk') trend = 'at-risk';else
          if (matchingPriorityGoal.status === 'Slightly Behind') trend = 'behind';else
          if (matchingPriorityGoal.status === 'On Track') trend = 'on-track';
        }

        return {
          title: g.title,
          category: g.category,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          progressPercentage: progressPercentage,
          trend: trend,
          deadline: g.deadline,
          created_date: g.created_date
        };
      });

      const goalsData = {
        totalGoals: preparedGoals.length,
        onTrack: preparedGoals.filter((g) => g.trend === 'on-track').length,
        behind: preparedGoals.filter((g) => g.trend === 'behind').length,
        atRisk: preparedGoals.filter((g) => g.trend === 'at-risk').length,
        goals: preparedGoals
      };

      const activityData = {
        recentActions: allActions?.slice(0, 10).map((a) => ({
          type: a.actionType,
          status: a.status,
          date: a.created_date
        }))
      };

      const pulseData = performanceDiagnostics ? {
        diagnostics: performanceDiagnostics.diagnostics
      } : null;

      const { data } = await base44.functions.invoke('generateGoalsInsights', {
        goalsData,
        activityData,
        pulseData,
        forceRefresh
      });

      if (data) {
        setAiInsights(data);
        setInsightsMetadata(data.metadata);
      }
    } catch (error) {
      console.error('[Goals] Error loading insights:', error);
      setAiInsights({
        performanceAnalysis: 'We could not generate AI insights at this moment. Please try refreshing or check back later.',
        nextSteps: [
        'Ensure your goals are properly set.',
        'Review your tracked activities for completeness.',
        'Try refreshing the insights.'],

        weeklyFocus: 'Maintain consistent data entry for accurate insights.'
      });
      setInsightsMetadata(null);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (goals.length > 0) {
      loadAIInsights();
    } else {
      setAiInsights(null);
      setInsightsMetadata(null);
    }
  }, [goals, user, allActions, performanceDiagnostics, priorityGoalsData]);

  const renderGoalsOverview = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.overallProgress}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all goals</p>
            <Progress value={summaryData.overallProgress} className="bg-secondary mt-2 rounded-full relative w-full overflow-hidden h-3" indicatorClassName="bg-primary" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Year-to-Date GCI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.currentGci}</div>
            <p className="text-xs text-muted-foreground mt-1">of {summaryData.annualGciTarget}</p>
            <Progress value={summaryData.ytdGciProgress} className="h-3 mt-2" indicatorClassName="bg-primary" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Quarterly Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.quarterlyProgress}%</div>
            <p className="text-xs text-muted-foreground mt-1">In {summaryData.currentQuarter}</p>
            <Progress value={summaryData.quarterlyProgress} className="h-3 mt-2" indicatorClassName="bg-primary" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Year-End Pace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{summaryData.projectedPace}%</div>
            <p className="text-xs text-muted-foreground mt-1">Based on current performance</p>
            <div className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>);

  };

  const renderTrackingTabContent = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card h-full">
          <CardHeader><CardTitle>Priority Goals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {priorityGoalsData.map((goal) =>
            <div key={goal.id}>
                <div className="mb-1 flex justify-between items-center">
                  <p className="text-sm font-medium">{goal.title}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${goal.statusColor}`}>{goal.status}</span>
                </div>
                <Progress value={goal.progress} className="bg-secondary my-2 rounded-full relative w-full overflow-hidden h-3" indicatorClassName="bg-primary" />
                <p className="text-xs text-muted-foreground mt-2">
                  {goal.targetUnit === 'USD' ? formatCurrency(goal.currentValue) : goal.currentValue} of {goal.targetUnit === 'USD' ? formatCurrency(goal.targetValue) : goal.targetValue}
                </p>
                <p className="bg-muted text-muted-foreground mt-3 pt-2 pr-2 pb-2 pl-2 p-2 text-xs rounded-md">{goal.nextStep}</p>
                <button
                onClick={() => {
                  setSelectedGoal(goal);
                  setShowUpdateProgress(true);
                }} className="text-primary mt-2 mb-3 text-sm font-medium hover:text-primary/90">

                  Update Progress
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader><CardTitle>Activity Drivers</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activityDriversData.map((goal) =>
              <div key={goal.id}>
                  <p className="text-sm font-medium">{goal.title}</p>
                  <Progress value={goal.progress} className="h-3 mt-2" indicatorClassName="bg-primary" />
                  <p className="text-xs text-muted-foreground mt-2">{goal.currentValue} of {goal.targetValue}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader><CardTitle>Performance Forecast</CardTitle></CardHeader>
            <CardContent style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, padding: '4px 8px' }}
                    formatter={(value) => `${parseFloat(value).toFixed(1)}%`} />

                  <Line type="monotone" dataKey="goal" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} name="Goal Pace" />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Actual Progress" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>);

  };

  const renderInsightsSidebarContent = () => {
    return (
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">AI Goal Insights</h3>
            {insightsMetadata?.cacheHit &&
            <CacheStatusBadge
              cacheHit={insightsMetadata.cacheHit}
              timestamp={insightsMetadata.timestamp}
              className="mt-1" />
            }
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadAIInsights(true)}
            disabled={insightsLoading}
            className="text-muted-foreground hover:text-primary h-8 w-8">
            {insightsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {insightsLoading && !aiInsights ?
        <div className="flex items-center gap-3 text-muted-foreground py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing your goals...</span>
          </div> :
        aiInsights ?
        <div className="space-y-4">
            {aiInsights.performanceAnalysis &&
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                <CompactText
              text={aiInsights.performanceAnalysis}
              maxChars={600}
              className="text-sm text-muted-foreground leading-relaxed" />
              </div>
          }

            {aiInsights.nextSteps && aiInsights.nextSteps.length > 0 &&
          <div>
                <h4 className="font-medium text-foreground mb-3">Recommended Actions</h4>
                <div className="space-y-2">
                  {aiInsights.nextSteps.map((rec, index) =>
              <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{typeof rec === 'string' ? rec : rec.action || rec}</span>
                    </div>
              )}
                </div>
              </div>
          }

            {aiInsights.weeklyFocus &&
          <div className="bg-muted p-4 rounded-lg border border-border">
                <h4 className="font-medium text-foreground mb-2">Weekly Focus</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{aiInsights.weeklyFocus}</p>
              </div>
          }
          </div> :

        <p className="text-muted-foreground text-sm">Add goals to get AI-powered insights.</p>
        }
      </div>);

  };

  const renderSidebarContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-12">
          <LoadingIndicator text="Loading sidebar..." size="md" />
        </div>);

    }

    switch (activeTab) {
      case 'tracking':
        return (
          <div className="space-y-6 p-6">
            <h4 className="text-base font-semibold text-foreground">Activity Goals</h4>
            {activeActivityGoals.length > 0 ?
            <div className="space-y-4">
                {activeActivityGoals.map((goal) => {
                const progressPercentage = goal.targetValue > 0 ? goal.currentValue / goal.targetValue * 100 : 0;

                return (
                  <div key={goal.id} className="pb-4 border-b border-border last:border-0">
                      <h5 className="text-foreground mb-2 text-sm font-medium">{goal.title}</h5>
                      <p className="text-foreground mb-1 text-lg font-medium">{goal.currentValue}</p>
                      <p className="text-xs text-muted-foreground mb-3">of {goal.targetValue}</p>
                      <Progress value={progressPercentage} indicatorClassName="bg-primary" className="h-3 mb-2" />
                      <button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setShowUpdateProgress(true);
                      }}
                      className="text-sm text-primary font-medium hover:text-primary/90">
                        Update
                      </button>
                    </div>);

              })}
              </div> :

            <p className="text-sm text-muted-foreground">No active activity goals set.</p>
            }

            {crmConnected &&
            <div className="pt-4 border-t border-border">
                <Button
                onClick={handleSyncFromCrm}
                disabled={isSyncingCrm}
                variant="outline"
                className="w-full">
                  {isSyncingCrm ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync from CRM
                </Button>
              </div>
            }
          </div>);


      case 'insights':
        return renderInsightsSidebarContent();

      case 'planner':
        return (
          <div className="space-y-6 p-6">
            <h4 className="text-base font-semibold text-foreground">Production Planner</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Use the planner to set up your annual production goals and activity targets.
            </p>
            <Button
              onClick={() => setShowPlannerModal(true)}
              className="w-full">
              Open Production Planner
            </Button>
          </div>);


      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <title>Goals - PULSE Intelligence</title>
      <meta name="description" content="Track your business goals, view AI-powered insights, and plan your real estate production with PULSE Intelligence." />
      
      <ContextualTopNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        <div className="bg-muted/30 pt-6 pr-4 pb-20 pl-4 md:pr-8 md:pb-8 md:pl-8 flex-1 overflow-y-auto">
          <div className="space-y-8" id="goals-print-area">
            <div className="flex items-center justify-between">
              <h1 className="text-[30px] font-semibold text-foreground">Goals Overview</h1>
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="p-2 bg-card hover:bg-muted border border-border rounded transition-colors"
                  title="Add Custom Goal"
                  aria-label="Add Custom Goal">
                  <PlusCircle className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setShowPlannerModal(true)}
                  className="p-2 bg-card hover:bg-muted border border-border rounded transition-colors"
                  title="Edit Goals"
                  aria-label="Edit Goals">
                  <Edit className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={handlePrintGoals}
                  className="p-2 bg-card hover:bg-muted border border-border rounded transition-colors"
                  title="Print Goals"
                  aria-label="Print Goals">
                  <Printer className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={handleDownloadGoals}
                  className="p-2 bg-card hover:bg-muted border border-border rounded transition-colors"
                  title="Download Goals"
                  aria-label="Download Goals">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {loading ?
            <div className="flex items-center justify-center h-64">
                <LoadingIndicator text="Loading your data..." size="lg" />
              </div> :

            <>
                {renderGoalsOverview()}
                {renderTrackingTabContent()}
              </>
            }
          </div>
        </div>

        <ContextualSidebar title={getSidebarTitle(activeTab)}>
          {renderSidebarContent()}
        </ContextualSidebar>
      </div>

      {showUpdateProgress && selectedGoal &&
      <UpdateProgressModal
        isOpen={showUpdateProgress}
        onClose={() => {
          setShowUpdateProgress(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
        onUpdateProgress={handleUpdateProgress} />
      }

      {showAddGoal &&
      <AddGoalModal
        isOpen={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onAddGoal={handleAddGoal}
        userId={user.id} />
      }

      {showPlannerModal &&
      <ProductionPlannerModal
        isOpen={showPlannerModal}
        onClose={() => setShowPlannerModal(false)}
        onPlanSaved={handlePlanSaved} />
      }
    </div>);

}

function getSidebarTitle(tabId) {
  const titles = {
    tracking: 'Tracking',
    insights: 'AI Insights',
    planner: 'Planning Tools'
  };
  return titles[tabId] || 'Details';
}