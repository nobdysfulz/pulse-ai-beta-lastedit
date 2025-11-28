import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export default function ConsistencyTrend({ userId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadConsistencyData();
    }
  }, [userId]);

  const loadConsistencyData = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      
      const allActions = await base44.entities.DailyAction.filter({
        userId
      }, '-actionDate', 500);

      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      const dataByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        
        const dayActions = allActions.filter(action => 
          action.actionDate && format(new Date(action.actionDate), 'yyyy-MM-dd') === dayStr
        );
        
        const completed = dayActions.filter(a => a.status === 'completed').length;
        const total = dayActions.length;
        const missed = total - completed;
        
        return {
          date: format(day, 'MMM d'),
          completed,
          missed,
          total
        };
      });

      setChartData(dataByDay);
    } catch (error) {
      console.error('[ConsistencyTrend] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Consistency Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading consistency data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>30-Day Consistency Trend</CardTitle>
        <p className="text-sm text-gray-600">Tasks completed vs. missed per day</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill="#22C55E" name="Completed" />
            <Bar dataKey="missed" fill="#EF4444" name="Missed" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}