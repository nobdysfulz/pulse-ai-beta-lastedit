import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/lib/utils';

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'high':
      return {
        color: 'bg-red-100 text-red-800 border-red-200'
      };
    case 'medium':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    case 'low':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};

export default function InsightsFeed({ insights, onActionClick }) {
  if (!insights || insights.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="py-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Insights Yet</h3>
          <p className="text-sm text-gray-500">
            Intelligence insights will appear here as your data accumulates
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const config = getPriorityConfig(insight.priority);

        return (
          <Card key={index} className="bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    <Badge variant="outline" className={config.color}>
                      {insight.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{insight.message}</p>
                  
                  {insight.category && (
                    <Badge variant="outline" className="text-xs capitalize mb-3">
                      {insight.category}
                    </Badge>
                  )}

                  {insight.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onActionClick && onActionClick(insight)}
                    >
                      <span>{insight.action}</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}