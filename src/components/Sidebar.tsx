import React from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Sparkles,
  Bell,
  BarChart3,
  Users,
  Building2,
  Tags,
  Clock,
  HelpCircle,
  User,
  ShieldCheck,
  LogOut,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useNotifications } from '../context/NotificationContext.js';

interface Props {
  currentTab?: string;
  activeTab?: string;
  setCurrentTab?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  isOpen: boolean;
  setIsOpen?: (open: boolean) => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  activeTab,
  setCurrentTab,
  onSelectTab,
  isOpen,
  setIsOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const selectedTab = activeTab || currentTab || 'dashboard';

  if (!user) return null;

  const isAdmin = ['Administrator', 'Super Administrator'].includes(user.role);
  const isElevated = ['Administrator', 'Super Administrator', 'Principal', 'Vice Principal', 'Department Head'].includes(user.role);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'main' },
    { id: 'requests', label: 'Service Requests', icon: FileText, category: 'main' },
    { id: 'submit', label: 'Submit Request', icon: PlusCircle, category: 'main' },
    { id: 'assistant', label: 'Pulse Assistant', icon: Sparkles, category: 'main', badge: 'AI' },
    { id: 'notifications', label: 'Notifications', icon: Bell, category: 'main', count: unreadCount },
    ...(isElevated
      ? [
          { id: 'admin-dashboard', label: 'Admin Dashboard', icon: ShieldCheck, category: 'admin' },
          { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, category: 'admin' },
        ]
      : []),
    ...(isAdmin
      ? [
          { id: 'users', label: 'User Management', icon: Users, category: 'admin' },
          { id: 'departments', label: 'Departments', icon: Building2, category: 'admin' },
          { id: 'categories', label: 'Categories', icon: Tags, category: 'admin' },
          { id: 'sla', label: 'SLA Configuration', icon: Clock, category: 'admin' },
        ]
      : []),
    { id: 'help', label: 'Help Center', icon: HelpCircle, category: 'footer' },
    { id: 'profile', label: 'My Profile', icon: User, category: 'footer' },
  ];

  const handleClose = () => {
    setIsOpen?.(false);
    onClose?.();
  };

  const handleSelect = (id: string) => {
    const targetId = id === 'admin-dashboard' ? 'admin' : id;
    if (setCurrentTab) {
      setCurrentTab(targetId);
    }
    if (onSelectTab) {
      onSelectTab(targetId);
    }
    handleClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={handleClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelect('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                CampusPulse
              </div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Service Management
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card info */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold flex items-center justify-center text-sm uppercase">
              {user.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-blue-300 font-medium truncate">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Campus Operations
            </div>
            <div className="space-y-1">
              {navItems
                .filter(item => item.category === 'main')
                .map(item => {
                  const Icon = item.icon;
                  const isActive = selectedTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                          {item.badge}
                        </span>
                      )}
                      {item.count !== undefined && item.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500 text-white">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {isElevated && (
            <div>
              <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Administration
              </div>
              <div className="space-y-1">
                {navItems
                  .filter(item => item.category === 'admin')
                  .map(item => {
                    const Icon = item.icon;
                    const isActive = selectedTab === item.id || (item.id === 'admin-dashboard' && selectedTab === 'admin');
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div>
            <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Preferences & Info
            </div>
            <div className="space-y-1">
              {navItems
                .filter(item => item.category === 'footer')
                .map(item => {
                  const Icon = item.icon;
                  const isActive = selectedTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </nav>

        {/* Footer logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
