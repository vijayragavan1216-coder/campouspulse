import React from 'react';
import { RequestPriority } from '../types.js';
import { AlertTriangle, AlertCircle, Clock, Flame } from 'lucide-react';

interface Props {
  priority: RequestPriority;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<Props> = ({ priority, showIcon = true }) => {
  const getStyle = (p: RequestPriority) => {
    switch (p) {
      case 'Emergency':
        return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-300 animate-pulse';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getIcon = (p: RequestPriority) => {
    switch (p) {
      case 'Emergency':
        return <Flame className="w-3.5 h-3.5 text-red-600" />;
      case 'High':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />;
      case 'Medium':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'Low':
      default:
        return <Clock className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getStyle(
        priority
      )}`}
    >
      {showIcon && getIcon(priority)}
      {priority}
    </span>
  );
};
