import React from 'react';
import { RequestStatus } from '../types.js';

interface Props {
  status: RequestStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const getStyle = (s: RequestStatus) => {
    switch (s) {
      case 'Submitted':
        return 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200/50';
      case 'Under Review':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200/50';
      case 'Assigned':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200/50';
      case 'In Progress':
        return 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-200/50';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200/50';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-200/50';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200/50';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDotColor = (s: RequestStatus) => {
    switch (s) {
      case 'Submitted': return 'bg-sky-500';
      case 'Under Review': return 'bg-blue-500';
      case 'Assigned': return 'bg-indigo-500';
      case 'In Progress': return 'bg-amber-500';
      case 'Resolved': return 'bg-emerald-500';
      case 'Closed': return 'bg-slate-500';
      case 'Rejected': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses[size]} ${getStyle(
        status
      )}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(status)}`} />
      {status}
    </span>
  );
};
