import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Sparkles,
  PlusCircle,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useNotifications } from '../context/NotificationContext.js';

interface Props {
  onOpenSidebar?: () => void;
  onToggleSidebar?: () => void;
  setCurrentTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenRequestDetails?: (id: number) => void;
  onOpenRequest?: (id: number) => void;
}

export const TopNavbar: React.FC<Props> = ({
  onOpenSidebar,
  onToggleSidebar,
  setCurrentTab,
  onNavigate,
  onOpenRequestDetails,
  onOpenRequest,
}) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const navigate = (tab: string) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const openSidebar = () => {
    if (onOpenSidebar) onOpenSidebar();
    if (onToggleSidebar) onToggleSidebar();
  };

  const openRequest = (id: number) => {
    if (onOpenRequestDetails) onOpenRequestDetails(id);
    if (onOpenRequest) onOpenRequest(id);
  };

  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const demoAccounts = [
    { name: 'Alex Student', email: 'student@campuspulse.edu', role: 'Student' },
    { name: 'Elena Vance', email: 'admin@campuspulse.edu', role: 'Administrator' },
    { name: 'Dave Miller', email: 'maintenance@campuspulse.edu', role: 'Maintenance Staff' },
    { name: 'Dr. Sarah Torres', email: 'depthead@campuspulse.edu', role: 'Department Head' },
    { name: 'Prof. Marcus Chen', email: 'faculty@campuspulse.edu', role: 'Faculty' },
    { name: 'Principal Arthur Vance', email: 'principal@campuspulse.edu', role: 'Principal' },
  ];

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={openSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Workspace
          </span>
          <h1 className="text-sm font-bold text-slate-800 leading-tight">
            {user.department} Operations
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Pulse Assistant Quick Action */}
        <button
          onClick={() => navigate('assistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/70 transition-colors"
          title="Open Pulse Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">Pulse Assistant</span>
        </button>

        {/* Submit Request Quick Action */}
        <button
          onClick={() => navigate('submit')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Request</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead('all')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 6).map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                        if (n.link && n.link.startsWith('/requests/')) {
                          const reqId = Number(n.link.replace('/requests/', ''));
                          if (reqId) {
                            openRequest(reqId);
                          } else {
                            navigate('requests');
                          }
                        }
                        setShowNotifMenu(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold ${!n.isRead ? 'text-blue-900' : 'text-slate-800'}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    navigate('notifications');
                    setShowNotifMenu(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown (Easy Multi-Role Verification) */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">
                {user.name}
              </div>
              <div className="text-[10px] text-blue-600 font-medium leading-tight">
                {user.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Signed in as
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>

              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Quick Switch Role (Testing)
                </div>
                <div className="space-y-0.5">
                  {demoAccounts.map(account => (
                    <button
                      key={account.email}
                      onClick={async () => {
                        await switchDemoUser(account.email);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                        user.email === account.email
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{account.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{account.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    navigate('profile');
                    setShowRoleMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md font-medium"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowRoleMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
