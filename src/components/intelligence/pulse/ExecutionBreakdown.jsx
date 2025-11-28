import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function ExecutionBreakdown({ userId }) {
  const [breakdownData, setBreakdownData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadBreakdownData();
    }
  }, [userId]);

  const loadBreakdownData = async () => {
    try {
      setLoading(true);
      
      const actions = await base44.entities.DailyAction.filter({
        userId,
        aiGenerated: true
      }, '-created_date', 500);

      const typeBreakdown = {};
      
      actions.forEach(action => {
        const type = action.actionType || 'other';
        if (!typeBreakdown[type]) {
          typeBreakdown[type] = {
            type,
            total: 0,
            completed: 0,
            avgLag: []
          };
        }
        
        typeBreakdown[type].total++;
        
        if (action.status === 'completed') {
          typeBreakdown[type].completed++;
          
          if (action.dueDate && action.completionDate) {
            const due = new Date(action.dueDate);
            const completed = new Date(action.completionDate);
            const lagDays = Math.floor((completed - due) / (1000 * 60 * 60 * 24));
            typeBreakdown[type].avgLag.push(lagDays);
          }
        }
      });

      const breakdown = Object.values(typeBreakdown).map(item => ({
        type: item.type,
        count: item.total,
        completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
        avgLag: item.avgLag.length > 0 
          ? Math.round(item.avgLag.reduce((a, b) => a + b, 0) / item.avgLag.length)
          : 0
      })).sort((a, b) => b.count - a.count);

      setBreakdownData(breakdown);
    } catch (error) {
      console.error('[ExecutionBreakdown] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Execution Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading execution data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Execution Breakdown by Task Type</CardTitle>
        <p className="text-sm text-gray-600">Performance metrics across different activity types</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Task Type</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Count</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Completion Rate</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Avg Lag (days)</th>
              </tr>
            </thead>
            <tbody>
              {breakdownData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <Badge variant="outline" className="capitalize">
                      {item.type.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="text-center py-3 px-2 font-medium text-gray-900">
                    {item.count}
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className={`font-semibold ${getCompletionColor(item.completionRate)}`}>
                      {item.completionRate}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-gray-700">
                    {item.avgLag > 0 ? `+${item.avgLag}` : item.avgLag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}