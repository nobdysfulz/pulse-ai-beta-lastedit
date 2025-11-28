import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Info } from 'lucide-react';

export default function ConfidenceIndicator({ confidence, dataHealth, size = 'default' }) {
  if (!confidence && !dataHealth) return null;

  const score = confidence || dataHealth?.score || 0;
  const isSmall = size === 'sm';

  const getConfig = () => {
    if (score >= 85) {
      return {
        icon: Shield,
        label: 'High Confidence',
        color: 'bg-green-100 text-green-800 border-green-200',
        iconColor: 'text-green-600'
      };
    } else if (score >= 70) {
      return {
        icon: Shield,
        label: 'Good Confidence',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        iconColor: 'text-blue-600'
      };
    } else if (score >= 50) {
      return {
        icon: Info,
        label: 'Moderate',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        iconColor: 'text-yellow-600'
      };
    } else {
      return {
        icon: AlertTriangle,
        label: 'Low Data',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        iconColor: 'text-orange-600'
      };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} gap-1.5 border`}
      style={{ fontSize: isSmall ? '0.7rem' : '0.75rem' }}
    >
      <Icon className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${config.iconColor}`} />
      <span>{config.label}</span>
      {!isSmall && <span className="font-semibold">{Math.round(score)}%</span>}
    </Badge>
  );
}