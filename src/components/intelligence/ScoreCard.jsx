import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/components/lib/utils';

export default function ScoreCard({ title, score, trend, status, description }) {
  const isInitializing = score === 0 || score === null || score === undefined;
  const displayScore = isInitializing ? 0 : Math.round(score);
  const trendValue = parseFloat(trend) || 0;
  const isPositive = trendValue > 0;
  const isNegative = trendValue < 0;
  const isNeutral = trendValue === 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const getScoreColor = (score) => {
    if (isInitializing) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    return 'text-orange-500';
  };

  const getProgressBarColor = (score) => {
    if (isInitializing) return 'bg-secondary';
    if (score >= 80) return 'bg-green-600';
    if (score >= 50) return 'bg-blue-600';
    return 'bg-orange-500';
  };

  const getStatusColor = (status) => {
    if (status === 'Optimized' || status === 'Strong') return 'text-green-600 border-green-600 bg-white';
    if (status === 'Stable') return 'text-blue-600 border-blue-600 bg-white';
    return 'text-orange-500 border-orange-500 bg-white';
  };

  const getStatusLabel = (score) => {
    if (isInitializing) return 'Initializing';
    if (score >= 80) return 'Optimized';
    if (score >= 50) return 'Stable';
    return 'Needs Focus';
  };

  const displayStatus = status || getStatusLabel(displayScore);

  return (
    <Card className="bg-white hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Badge variant="outline" className={getStatusColor(displayStatus)}>
            {displayStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className={cn('text-4xl font-bold', getScoreColor(displayScore))}>
              {displayScore}
              {isInitializing && <span className="text-sm text-gray-500 ml-2">(Initializing)</span>}
            </div>
            {!isInitializing &&
            <div className="flex items-center gap-1 mb-1">
              <TrendIcon className={cn(
                'w-4 h-4',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600',
                isNeutral && 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-sm font-medium',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600',
                isNeutral && 'text-muted-foreground'
              )}>
                {trendValue > 0 ? '+' : ''}{trendValue}
              </span>
            </div>
            }
          </div>
          
          <div className="w-full bg-secondary rounded-full h-3">
            <div 
              className={cn("h-3 rounded-full transition-all", getProgressBarColor(displayScore))}
              style={{ width: `${Math.min(displayScore, 100)}%` }} 
            />
          </div>

          {description &&
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
          }
          
          {isInitializing &&
          <p className="text-xs text-muted-foreground italic mt-2">
              Learning Mode: Gathering activity data for first insights
            </p>
          }
        </div>
      </CardContent>
    </Card>);

}