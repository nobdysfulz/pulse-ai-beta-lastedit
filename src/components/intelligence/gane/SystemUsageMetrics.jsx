import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { Activity, Zap, Users, Link } from 'lucide-react';

export default function SystemUsageMetrics({ userId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadMetrics();
    }
  }, [userId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      const [activities, actions, connections] = await Promise.all([
      base44.entities.CrmActivity.filter({ userId }, '-created_date', 100),
      base44.entities.DailyAction.filter({ userId }, '-created_date', 100),
      base44.entities.ExternalServiceConnection.filter({ userId })]
      );

      const crmUsageRate = activities.length > 0 ?
      Math.round(activities.length / 30 * 10) : 0;

      const automationRate = actions.length > 0 ?
      Math.round(actions.filter((a) => a.generated).length / actions.length * 100) : 0;

      const activeConnections = connections.filter((c) => c.status === 'connected').length;
      const integrationRate = Math.min(activeConnections * 20, 100);

      const aiAgentUsage = Math.round(
        actions.filter((a) => a.category === 'pulse_based').length / Math.max(actions.length, 1) * 100
      );

      setMetrics({
        crmUsage: crmUsageRate,
        automation: automationRate,
        aiAgent: aiAgentUsage,
        integration: integrationRate,
        totalConnections: connections.length,
        activeConnections
      });
    } catch (error) {
      console.error('[SystemUsageMetrics] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>System Usage Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading system metrics...</div>
        </CardContent>
      </Card>);

  }

  const metricsData = [
  {
    label: 'CRM Activity Rate',
    value: metrics.crmUsage,
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    label: 'Automation Engagement',
    value: metrics.automation,
    icon: Zap,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50'
  },
  {
    label: 'AI Agent Usage',
    value: metrics.aiAgent,
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    label: 'Integration Activity',
    value: metrics.integration,
    icon: Link,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }];


  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>System Usage Metrics</CardTitle>
        <p className="text-sm text-gray-600">
          {metrics.activeConnections} of {metrics.totalConnections} integrations active
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {metricsData.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="relative w-full overflow-hidden rounded-full bg-secondary h-3" />
            </div>);

        })}
      </CardContent>
    </Card>);

}