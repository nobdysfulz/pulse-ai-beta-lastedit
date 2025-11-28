import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MessageSquare, FileText, CheckCircle2, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import LoadingIndicator from '../ui/LoadingIndicator';

const activityIcons = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  note: FileText,
  task_completed: CheckCircle2,
  status_change: RefreshCw,
  meeting: Clock
};

const activityColors = {
  call: 'text-black bg-gray-50',
  email: 'text-black bg-gray-50',
  text: 'text-black bg-gray-50',
  note: 'text-black bg-gray-50',
  task_completed: 'text-black bg-gray-50',
  status_change: 'text-black bg-gray-50',
  meeting: 'text-black bg-gray-50'
};

export default function ActivityFeed({ activities, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator size="sm" text="Loading activities..." />
      </div>);

  }

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activityType] || FileText;
        const colorClass = activityColors[activity.activityType] || 'text-gray-600 bg-gray-50';

        return (
          <Card key={activity.id} className="border-l-4 border-l-violet-600">
            <CardContent className="pt-4 pr-4 pb-4 pl-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-gray-900 text-xs font-semibold">
                      {activity.subject}
                    </h4>
                    <time className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                    </time>
                  </div>
                  
                  {activity.description &&
                  <p className="text-gray-600 mb-2 text-xs">
                      {activity.description}
                    </p>
                  }
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {activity.activityType.replace('_', ' ')}
                    </Badge>
                    
                    {activity.direction &&
                    <Badge variant="outline" className="text-xs capitalize">
                        {activity.direction}
                      </Badge>
                    }
                    
                    {activity.outcome &&
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                      activity.outcome === 'completed' ? 'border-green-500 text-green-700' :
                      activity.outcome === 'no_answer' ? 'border-yellow-500 text-yellow-700' :
                      'border-gray-500 text-gray-700'}`
                      }>

                        {activity.outcome.replace('_', ' ')}
                      </Badge>
                    }
                    
                    {activity.duration &&
                    <span className="text-xs text-gray-500">
                        {activity.duration} min
                      </span>
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>);

      })}
    </div>);

}