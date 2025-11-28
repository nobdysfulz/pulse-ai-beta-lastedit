import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award } from 'lucide-react';

export default function ProvenMethodBadge({ successRate, twinCount, size = 'default' }) {
  if (!successRate || successRate < 60) return null;

  const isSmall = size === 'sm';

  return (
    <Badge 
      className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 gap-1.5"
      style={{ fontSize: isSmall ? '0.7rem' : '0.75rem' }}
    >
      <Award className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="font-semibold">PROVEN METHOD</span>
      {successRate && (
        <>
          <TrendingUp className={isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          <span>{Math.round(successRate)}%</span>
        </>
      )}
      {twinCount > 0 && (
        <span className="opacity-90 text-xs">
          ({twinCount} similar agents)
        </span>
      )}
    </Badge>
  );
}