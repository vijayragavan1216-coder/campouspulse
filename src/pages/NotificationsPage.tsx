import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext.js';
import {
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Check,
  Flame,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface Props {
  onOpenRequest: (id: number) => void;
}

export const NotificationsPage: React.FC<Props> = ({ onOpenRequest }) => {
  const { notifications, unreadCount, markAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Flame className="w-4 h-4 text-red-600" />;
      case 'escalation':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'resolution':
      case 'closure':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  const handleItemClick = (n: any) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    if (n.link && n.link.startsWith('/requests/')) {
      const id = Number(n.link.replace('/requests/', ''));
      if (id) {
        onOpenRequest(id);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Notifications & System Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stay updated on assignment changes, SLA warnings, and request resolutions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAsRead('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-blue-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700 text-sm">No Notifications</div>
            <p className="mt-1 text-slate-400">
              {filter === 'unread'
                ? 'You have caught up with all your unread alerts.'
                : 'No notification records exist for your profile yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                  !n.isRead ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      !n.isRead ? 'bg-blue-100' : 'bg-slate-100'
                    }`}
                  >
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${!n.isRead ? 'text-blue-900' : 'text-slate-900'}`}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      {new Date(n.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {n.link && (
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
