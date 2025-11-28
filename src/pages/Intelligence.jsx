import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../components/context/UserContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import ContextualTopNav from '../components/layout/ContextualTopNav';
import { usePGICData } from '../components/intelligence/usePGICData';
import ScoreCard from '../components/intelligence/ScoreCard';
import TrendChart from '../components/intelligence/TrendChart';
import InsightsFeed from '../components/intelligence/InsightsFeed';
import ForecastCard from '../components/intelligence/ForecastCard';

import ActivityHeatmap from '../components/intelligence/pulse/ActivityHeatmap';
import ConsistencyTrend from '../components/intelligence/pulse/ConsistencyTrend';
import ExecutionBreakdown from '../components/intelligence/pulse/ExecutionBreakdown';
import AutomationUtilization from '../components/intelligence/gane/AutomationUtilization';
import SystemUsageMetrics from '../components/intelligence/gane/SystemUsageMetrics';
import MarketSnapshot from '../components/intelligence/moro/MarketSnapshot';
import PerformanceVsMarket from '../components/intelligence/moro/PerformanceVsMarket';

export default function IntelligencePage() {
  const { user, goals } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [businessPlan, setBusinessPlan] = useState(null);
  const [goalMetrics, setGoalMetrics] = useState({
    gciTarget: 0,
    gciCurrent: 0,
    dealsTarget: 0,
    dealsCurrent: 0
  });

  const {
    data: pgicData,
    loading,
    error,
    lastRefreshed,
    refreshing,
    refresh
  } = usePGICData(user?.id);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = isMobile 
    ? [{ id: 'overview', label: 'Overview' }]
    : [
        { id: 'overview', label: 'Overview' },
        { id: 'pulse', label: 'PULSE Details' },
        { id: 'gane', label: 'GANE Details' },
        { id: 'moro', label: 'MORO Details' }
      ];


  useEffect(() => {
    if (user) {
      loadBusinessPlan();
    }
  }, [user]);

  useEffect(() => {
    if (goals && goals.length > 0) {
      const gciGoal = goals.find((g) => g.title === 'Total GCI' && g.status === 'active');
      const buyerGoal = goals.find((g) => g.title === 'Total Buyers Closed' && g.status === 'active');
      const listingGoal = goals.find((g) => g.title === 'Total Listings Closed' && g.status === 'active');

      setGoalMetrics({
        gciTarget: gciGoal?.targetValue || 0,
        gciCurrent: gciGoal?.currentValue || 0,
        dealsTarget: (buyerGoal?.targetValue || 0) + (listingGoal?.targetValue || 0),
        dealsCurrent: (buyerGoal?.currentValue || 0) + (listingGoal?.currentValue || 0)
      });
    }
  }, [goals]);

  const loadBusinessPlan = async () => {
    try {
      const plans = await base44.entities.BusinessPlan.filter(
        { userId: user.id, isActive: true },
        '-created_date',
        1
      );

      if (plans && plans.length > 0) {
        setBusinessPlan(plans[0]);
      }
    } catch (error) {
      console.error('[Intelligence] Error loading business plan:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      toast.success('Intelligence data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh intelligence data');
    }
  };

  const handleInsightAction = async (insight) => {
    console.log('[Intelligence] Action clicked for insight:', insight);
    if (insight.category === 'behavior') {
      window.location.href = '/dashboard';
    } else if (insight.category === 'system') {
      window.location.href = '/settings';
    }
  };

  const getOverallScore = () => {
    if (!pgicData?.scores) return 0;
    return Math.round(pgicData.scores.overall || 0);
  };

  const getOverallTrend = () => {
    if (!pgicData?.scores?.trend) return 0;
    return pgicData.scores.trend.overall || 0;
  };

  const hasMinimalData = () => {
    if (!pgicData?.scores) return false;
    const { pulse, gane, moro } = pgicData.scores;
    return pulse > 0 || gane > 0 || moro > 0;
  };

  const renderOverview = () => {
    const scores = pgicData?.scores || { pulse: 0, gane: 0, moro: 0, overall: 0, trend: {}, rawMetrics: {} };
    const insights = pgicData?.insights || [];
    const forecast = pgicData?.forecast || { growthProbability: 0, nextPeriodScore: 0 };
    const hasData = hasMinimalData();

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Overall Intelligence Score</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-slate-800 text-5xl font-bold">
                  {getOverallScore()}
                </h2>
                {hasData && getOverallTrend() !== 0 &&
                <span className={`text-lg font-medium ${getOverallTrend() > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {getOverallTrend() > 0 ? '+' : ''}{getOverallTrend()}
                  </span>
                }
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {hasData ? 'Composite of PULSE, GANE, and MORO scores' : 'Initializing - Activity data being collected'}
              </p>
            </div>
            <div className="w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8" />

                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - getOverallScore() / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500" />

              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScoreCard
            title="PULSE"
            description="Execution & Consistency"
            score={scores.pulse}
            trend={scores.trend?.pulse || 0} />

          <ScoreCard
            title="GANE"
            description="Predictability & System Usage"
            score={scores.gane}
            trend={scores.trend?.gane || 0} />

          <ScoreCard
            title="MORO"
            description="Market Opportunity"
            score={scores.moro}
            trend={scores.trend?.moro || 0} />

        </div>

        {!hasData &&
        <div className="bg-[hsl(var(--status-info))]/10 rounded-lg p-4">
            <div>
              <h3 className="font-semibold text-[hsl(var(--status-info))] mb-1">Learning Mode Active</h3>
              <p className="text-sm text-[hsl(var(--status-info))]/80">
                We're gathering your activity and market data. Your first insights will appear once enough actions are logged. 
                Continue using the platform to build your intelligence profile.
              </p>
            </div>
          </div>
        }

        <TrendChart userId={user.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">AI Insights & Recommendations</h2>
                <InsightsFeed
                  insights={insights}
                  onActionClick={handleInsightAction} />

              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ForecastCard
              forecast={forecast}
              businessPlan={businessPlan}
              goalMetrics={goalMetrics} />



          </div>
        </div>
      </div>);

  };

  const renderPulseDetails = () => {
    const scores = pgicData?.scores || { pulse: 0, trend: {} };
    const insights = pgicData?.insights || [];
    const executionInsights = insights.filter((i) => i.category === 'behavior') || [];

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">PULSE: Execution & Consistency</h2>
              <p className="text-muted-foreground mt-1">
                Measures your daily execution consistency and goal progress. Higher scores indicate strong habits and reliable performance.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{Math.round(scores.pulse)}</div>
              <div className="text-sm text-muted-foreground mt-1">Current Score</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${Math.min(scores.pulse, 100)}%` }} />

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityHeatmap userId={user.id} />
          <ConsistencyTrend userId={user.id} />
        </div>

        <ExecutionBreakdown userId={user.id} />

        {executionInsights.length > 0 &&
        <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Execution Insights</h3>
            <InsightsFeed
            insights={executionInsights}
            onActionClick={handleInsightAction} />

          </div>
        }
      </div>);

  };

  const renderGaneDetails = () => {
    const scores = pgicData?.scores || { gane: 0, trend: {} };
    const insights = pgicData?.insights || [];
    const systemInsights = insights.filter((i) => i.category === 'system') || [];

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">GANE: Predictability & System Usage</h2>
              <p className="text-muted-foreground mt-1">
                Tracks how effectively you leverage systems and technology. Higher scores show strong adoption of productivity tools.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">{Math.round(scores.gane)}</div>
              <div className="text-sm text-muted-foreground mt-1">Current Score</div>
            </div>
          </div>
          
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(Number(scores.gane || 0), 100)}%` }} />

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemUsageMetrics userId={user.id} />
          <AutomationUtilization userId={user.id} />
        </div>

        <TrendChart userId={user.id} />

        {systemInsights.length > 0 &&
        <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">System Intelligence Insights</h3>
            <InsightsFeed
            insights={systemInsights}
            onActionClick={handleInsightAction} />

          </div>
        }
      </div>);

  };

  const renderMoroDetails = () => {
    const scores = pgicData?.scores || { moro: 0, trend: {} };
    const insights = pgicData?.insights || [];
    const marketInsights = insights.filter((i) => i.category === 'market') || [];

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">MORO: Market Opportunity</h2>
              <p className="text-muted-foreground mt-1">
                Analyzes current market conditions in your territory. Higher scores indicate favorable market dynamics for transactions.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-green-600">{Math.round(scores.moro)}</div>
              <div className="text-sm text-muted-foreground mt-1">Current Score</div>
            </div>
          </div>
          
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(Number(scores.moro || 0), 100)}%` }} />

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketSnapshot userId={user.id} />
          <PerformanceVsMarket userId={user.id} />
        </div>

        <TrendChart userId={user.id} />

        {marketInsights.length > 0 &&
        <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Market Opportunity Insights</h3>
            <InsightsFeed
            insights={marketInsights}
            onActionClick={handleInsightAction} />

          </div>
        }
      </div>);

  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingIndicator text="Loading intelligence data..." size="lg" />
      </div>);

  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">Failed to Load Intelligence Data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>);

  }

  return (
    <>
      <ContextualTopNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButton={
        <div className="flex items-center gap-4">
            {lastRefreshed &&
          <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
              </span>
          }
            <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2">

              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        } />


      <div className="flex-1 overflow-y-auto bg-muted/30 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Business Intelligence Dashboard</h1>
            <p className="text-muted-foreground">
              Pulse Graph Intelligence Core - AI-powered performance analytics and insights
            </p>
          </div>

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'pulse' && renderPulseDetails()}
          {activeTab === 'gane' && renderGaneDetails()}
          {activeTab === 'moro' && renderMoroDetails()}

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">Powered by PGIC Intelligence Agent</p>
          </div>
        </div>
      </div>
    </>);

}