import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function AutomationUtilization({ userId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAutomationData();
    }
  }, [userId]);

  const loadAutomationData = async () => {
    try {
      setLoading(true);

      const actions = await base44.entities.DailyAction.filter({
        userId,
        status: 'completed'
      }, '-completionDate', 200);

      const aiActions = actions.filter((a) => a.generated === true).length;
      const manualActions = actions.filter((a) => !a.generated).length;

      const activities = await base44.entities.CrmActivity.filter({
        userId
      }, '-created_date', 100);

      const aiActivities = activities.filter((a) =>
      a.metadata && a.metadata.includes('automated')
      ).length;
      const manualActivities = activities.length - aiActivities;

      const data = [
      { name: 'AI-Generated Tasks', value: aiActions, color: '#7C3AED' },
      { name: 'Manual Tasks', value: manualActions, color: '#94A3B8' },
      { name: 'AI Activities', value: aiActivities, color: '#3B82F6' },
      { name: 'Manual Activities', value: manualActivities, color: '#CBD5E1' }];


      setChartData(data);
    } catch (error) {
      console.error('[AutomationUtilization] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Automation Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading automation data...</p>
          </div>
        </CardContent>
      </Card>);

  }

  const totalActions = chartData.reduce((sum, item) => sum + item.value, 0);
  const aiTotal = chartData.
  filter((item) => item.name.includes('AI')).
  reduce((sum, item) => sum + item.value, 0);
  const aiPercentage = totalActions > 0 ? Math.round(aiTotal / totalActions * 100) : 0;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Automation Utilization</CardTitle>
        <p className="text-sm text-gray-600">AI-powered vs. manual actions</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-gray-800 text-3xl font-bold">{aiPercentage}%</div>
            <div className="text-sm text-gray-600">AI-Powered Actions</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-2xl font-semibold">{totalActions}</div>
            <div className="text-sm text-gray-600">Total Actions</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value">

              {chartData.map((entry, index) =>
              <Cell key={`cell-${index}`} fill={entry.color} />
              )}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>);

}