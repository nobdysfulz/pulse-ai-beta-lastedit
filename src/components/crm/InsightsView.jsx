import React, { useState, useEffect, useContext, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  CheckCircle,
  ClipboardList,
  DollarSign,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Phone,
  FileText,
  UserPlus } from
'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, differenceInDays } from 'date-fns';
import LoadingIndicator from '../ui/LoadingIndicator';
import { cn } from '@/components/lib/utils';

const COLORS = {
  contacts: '#3B82F6',
  active: '#22C55E',
  tasks: '#F59E0B',
  pipeline: '#A855F7',
  buyer: '#3B82F6',
  seller: '#F59E0B',
  referral: '#A855F7',
  lead: '#6B7280'
};

const STAGE_COLORS = ['#3B82F6', '#F59E0B', '#A855F7', '#22C55E', '#6B7280'];

export default function InsightsView({ contacts }) {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeWindow, setTimeWindow] = useState('30');
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    if (user && contacts.length > 0) {
      loadData();
    }
  }, [user, contacts]);

  const loadData = async () => {
    try {
      setLoading(true);

      const contactIds = contacts.map((c) => c.id);

      const [tasksData, activitiesData] = await Promise.all([
      base44.entities.DailyAction.filter(
        { userId: user.id, associatedContactId: { $in: contactIds } },
        '-created_date',
        500
      ),
      base44.entities.CrmActivity.filter(
        { userId: user.id },
        '-created_date',
        100
      )]
      );

      setTasks(tasksData || []);
      setActivities(activitiesData || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[CRM-Insights] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalContacts = contacts.length;
    const activeContacts = contacts.filter((c) => c.stage === 'active').length;
    const openTasks = tasks.filter((t) => t.status !== 'completed').length;

    const parseBudget = (budgetString) => {
      if (!budgetString) return 0;
      if (typeof budgetString === 'number') return budgetString;
      const cleaned = budgetString.toString().replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const pipelineValue = contacts.
    filter((c) => c.stage !== 'closed' && c.stage !== 'inactive').
    reduce((sum, c) => sum + parseBudget(c.budget), 0);

    const daysAgo = parseInt(timeWindow);
    const cutoffDate = startOfDay(subDays(new Date(), daysAgo));

    const recentContacts = contacts.filter((c) =>
    new Date(c.created_date) >= cutoffDate
    ).length;

    const recentTasks = tasks.filter((t) =>
    new Date(t.created_date) >= cutoffDate
    ).length;

    return {
      totalContacts,
      activeContacts,
      openTasks,
      pipelineValue,
      recentContacts,
      recentTasks
    };
  }, [contacts, tasks, timeWindow]);

  // Contact growth trend
  const contactGrowthData = useMemo(() => {
    const days = parseInt(timeWindow);
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const count = contacts.filter((c) => {
        const createdDate = startOfDay(new Date(c.created_date));
        return createdDate <= date;
      }).length;

      data.push({
        date: format(date, 'MMM d'),
        contacts: count
      });
    }

    return data;
  }, [contacts, timeWindow]);

  // Task completion trend
  const taskCompletionData = useMemo(() => {
    const days = parseInt(timeWindow);
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const endDate = startOfDay(subDays(new Date(), i - 1));

      const completed = tasks.filter((t) => {
        if (!t.completionDate) return false;
        const compDate = startOfDay(new Date(t.completionDate));
        return compDate >= date && compDate < endDate;
      }).length;

      const total = tasks.filter((t) => {
        const actionDate = startOfDay(new Date(t.actionDate));
        return actionDate >= date && actionDate < endDate;
      }).length;

      data.push({
        date: format(date, 'MMM d'),
        completed,
        rate: total > 0 ? Math.round(completed / total * 100) : 0
      });
    }

    return data;
  }, [tasks, timeWindow]);

  // Pipeline stage distribution
  const pipelineStageData = useMemo(() => {
    const stages = [
    { name: 'New', value: contacts.filter((c) => c.stage === 'new').length },
    { name: 'Active', value: contacts.filter((c) => c.stage === 'active').length },
    { name: 'Under Contract', value: contacts.filter((c) => c.stage === 'under_contract').length },
    { name: 'Closed', value: contacts.filter((c) => c.stage === 'closed').length },
    { name: 'Inactive', value: contacts.filter((c) => c.stage === 'inactive').length }];


    return stages.filter((s) => s.value > 0);
  }, [contacts]);

  // Contact type breakdown
  const contactTypeData = useMemo(() => {
    const types = [
    { name: 'Buyers', value: contacts.filter((c) => c.type === 'buyer').length, color: COLORS.buyer },
    { name: 'Sellers', value: contacts.filter((c) => c.type === 'seller').length, color: COLORS.seller },
    { name: 'Referrals', value: contacts.filter((c) => c.type === 'referral').length, color: COLORS.referral },
    { name: 'Leads', value: contacts.filter((c) => c.type === 'lead').length, color: COLORS.lead }];


    return types.filter((t) => t.value > 0);
  }, [contacts]);

  // Stage conversion stats
  const conversionStats = useMemo(() => {
    const stageOrder = ['new', 'active', 'under_contract', 'closed'];
    const stats = [];

    stageOrder.forEach((stage, index) => {
      const stageContacts = contacts.filter((c) => c.stage === stage);
      const count = stageContacts.length;

      let conversionRate = null;
      let avgDays = null;

      if (index < stageOrder.length - 1) {
        const nextStage = stageOrder[index + 1];
        const movedToNext = contacts.filter((c) => c.stage === nextStage).length;
        if (count > 0) {
          conversionRate = Math.round(movedToNext / (count + movedToNext) * 100);
        }
      }

      if (stageContacts.length > 0) {
        const totalDays = stageContacts.reduce((sum, c) => {
          if (!c.created_date) return sum;
          return sum + differenceInDays(new Date(), new Date(c.created_date));
        }, 0);
        avgDays = Math.round(totalDays / stageContacts.length);
      }

      stats.push({
        stage: stage.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
        conversionRate,
        avgDays
      });
    });

    return stats;
  }, [contacts]);

  // Recent activity feed
  const recentActivityFeed = useMemo(() => {
    const filtered = activityFilter === 'all' ?
    activities :
    activities.filter((a) => {
      if (activityFilter === 'calls') return a.activityType === 'call';
      if (activityFilter === 'notes') return a.activityType === 'note';
      if (activityFilter === 'tasks') return a.activityType === 'task_completed';
      if (activityFilter === 'contacts') return a.activityType === 'status_change';
      return true;
    });

    return filtered.slice(0, 10);
  }, [activities, activityFilter]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call':return <Phone className="w-4 h-4" />;
      case 'note':return <FileText className="w-4 h-4" />;
      case 'task_completed':return <CheckCircle className="w-4 h-4" />;
      case 'status_change':return <UserPlus className="w-4 h-4" />;
      default:return <FileText className="w-4 h-4" />;
    }
  };

  const getActivityLabel = (activity) => {
    const contact = contacts.find((c) => c.id === activity.contactId);
    const contactName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown';

    switch (activity.activityType) {
      case 'call':return `Called ${contactName}`;
      case 'note':return `Added Note to ${contactName}`;
      case 'task_completed':return `Completed Task: "${activity.subject}"`;
      case 'status_change':return `${activity.subject}`;
      default:return activity.subject || 'Activity';
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = differenceInDays(now, new Date(date));

    if (diff === 0) {
      const hours = Math.floor((now - new Date(date)) / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor((now - new Date(date)) / (1000 * 60));
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingIndicator text="Loading insights..." size="md" />
      </div>);

  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Insights</h1>
            <p className="text-sm text-gray-500 mt-1">Track your contact growth, activity, and pipeline performance.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Last Updated: {format(lastUpdated, 'MMM d, h:mm a')}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh} className="bg-transparent text-gray-600 px-3 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border hover:bg-accent h-9 gap-2">


              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Row: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Contacts */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalContacts}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.recentContacts > 0 ? '+' : ''}{metrics.recentContacts} this period
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Clients */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.activeContacts}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {Math.round(metrics.activeContacts / metrics.totalContacts * 100)}% of total
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Tasks */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Open Tasks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.openTasks}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {tasks.filter((t) => new Date(t.actionDate) < new Date() && t.status !== 'completed').length} overdue
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(metrics.pipelineValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Active deals</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Window Selector */}
        <div className="flex justify-end">
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Middle Section: Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Growth */}
          <Card className="lg:col-span-2 bg-white">
            <CardHeader>
              <CardTitle>Contact Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={contactGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="contacts"
                    stroke={COLORS.contacts}
                    strokeWidth={2}
                    dot={{ fill: COLORS.contacts }} />

                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline Stage Distribution */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipelineStageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value">

                    {pipelineStageData.map((entry, index) =>
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Completion Trend */}
          <Card className="lg:col-span-3 bg-white">
            <CardHeader>
              <CardTitle>Task Completion Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill={COLORS.tasks} name="Tasks Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Engagement & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Feed */}
          <Card className="lg:col-span-2 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="calls">Calls</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="contacts">Contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivityFeed.map((activity) =>
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.activityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {getActivityLabel(activity)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getTimeAgo(activity.created_date)}
                      </p>
                    </div>
                  </div>
                )}
                {recentActivityFeed.length === 0 &&
                <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                }
              </div>
            </CardContent>
          </Card>

          {/* Contact Engagement Breakdown */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Contact Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={contactTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>

                    {contactTypeData.map((entry, index) =>
                    <Cell key={`cell-${index}`} fill={entry.color} />
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stage Conversion Summary */}
          <Card className="lg:col-span-3 bg-white">
            <CardHeader>
              <CardTitle>Stage Conversion Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Stage</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Count</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Conversion %</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Avg Days in Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversionStats.map((stat, index) =>
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{stat.stage}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{stat.count}</td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {stat.conversionRate !== null ? `${stat.conversionRate}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {stat.avgDays !== null ? `${stat.avgDays} days` : '—'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}