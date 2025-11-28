import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from 'date-fns';
import { cn } from '@/components/lib/utils';

export default function ActivityHeatmap({ userId }) {
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadActivityData();
    }
  }, [userId]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      
      const startDate = startOfMonth(subMonths(new Date(), 2));
      const endDate = endOfMonth(new Date());
      
      const actions = await base44.entities.DailyAction.filter({
        userId,
        status: 'completed'
      }, '-completionDate', 200);

      const activityMap = {};
      actions.forEach(action => {
        if (action.completionDate) {
          const date = format(new Date(action.completionDate), 'yyyy-MM-dd');
          activityMap[date] = (activityMap[date] || 0) + 1;
        }
      });

      setActivityData(activityMap);
    } catch (error) {
      console.error('[ActivityHeatmap] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMonth = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });

    const weeks = [];
    let currentWeek = [];

    const firstDayOfWeek = start.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    // Flatten the weeks into a single array of days (including padding)
    const allDays = [];
    weeks.forEach(week => allDays.push(...week));

    return (
      <div key={format(monthDate, 'yyyy-MM')} className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          {format(monthDate, 'MMMM yyyy')}
        </h4>
        <div className="grid grid-cols-7 gap-1">
          {/* Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-gray-500 mb-1 h-6 flex items-center justify-center">{day}</div>
          ))}
          {/* Days */}
          {allDays.map((day, dayIdx) => {
            if (!day) {
              return <div key={`pad-${dayIdx}`} className="w-8 h-8" />;
            }

            const dateKey = format(day, 'yyyy-MM-dd');
            const count = activityData[dateKey] || 0;
            const intensity = 
              count === 0 ? 'bg-gray-100' :
              count <= 2 ? 'bg-green-200' :
              count <= 5 ? 'bg-green-400' :
              'bg-green-600';

            return (
              <div
                key={`day-${dayIdx}`}
                className={cn(
                  'w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors',
                  intensity,
                  count > 0 ? 'text-white' : 'text-gray-400'
                )}
                title={`${format(day, 'MMM d')}: ${count} tasks completed`}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading activity data...</div>
        </CardContent>
      </Card>
    );
  }

  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);
  const twoMonthsAgo = subMonths(currentMonth, 2);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Activity Heatmap</CardTitle>
        <p className="text-sm text-gray-600">Daily task completion over the last 90 days</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {renderMonth(twoMonthsAgo)}
          {renderMonth(lastMonth)}
          {renderMonth(currentMonth)}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded" />
              <div className="w-4 h-4 bg-green-200 rounded" />
              <div className="w-4 h-4 bg-green-400 rounded" />
              <div className="w-4 h-4 bg-green-600 rounded" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}