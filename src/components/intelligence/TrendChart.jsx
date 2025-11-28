import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function TrendChart({ userId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadHistoricalData();
    }
  }, [userId]);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      
      // Fetch last 30 days of PGIC records
      const records = await base44.entities.PGICRecord.filter(
        { userId },
        '-timestamp',
        30
      );

      if (records && records.length > 0) {
        const formattedData = records
          .reverse()
          .map(record => ({
            date: format(new Date(record.timestamp), 'MMM d'),
            PULSE: Math.round(record.pulse || 0),
            GANE: Math.round(record.gane || 0),
            MORO: Math.round(record.moro || 0),
            timestamp: record.timestamp
          }));

        setChartData(formattedData);
      }
    } catch (error) {
      console.error('[TrendChart] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>30-Day Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading trend data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>30-Day Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-gray-500">No historical data available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>30-Day Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="PULSE"
              stroke="#7C3AED"
              strokeWidth={2}
              dot={{ fill: '#7C3AED' }}
            />
            <Line
              type="monotone"
              dataKey="GANE"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6' }}
            />
            <Line
              type="monotone"
              dataKey="MORO"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ fill: '#22C55E' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}