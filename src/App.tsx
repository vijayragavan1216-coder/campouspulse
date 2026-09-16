import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { NotificationProvider, useNotifications } from './context/NotificationContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { RequestListPage } from './pages/RequestListPage.js';
import { SubmitRequestPage } from './pages/SubmitRequestPage.js';
import { RequestDetailsPage } from './pages/RequestDetailsPage.js';
import { AssistantPage } from './pages/AssistantPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { UserManagementPage } from './pages/UserManagementPage.js';
import { DepartmentManagementPage } from './pages/DepartmentManagementPage.js';
import { CategoryManagementPage } from './pages/CategoryManagementPage.js';
import { SlaManagementPage } from './pages/SlaManagementPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { Sidebar } from './components/Sidebar.js';
import { TopNavbar } from './components/TopNavbar.js';
import { AssistantDraft } from './types.js';
import { RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [assistantDraft, setAssistantDraft] = useState<AssistantDraft | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <div className="text-sm font-bold text-slate-800">Starting CampusPulse...</div>
        <div className="text-xs text-slate-400 mt-1">Connecting to campus operational database</div>
      </div>
    );
  }

  // If not logged in, render authentication screens
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onGoToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onGoToRegister={() => setAuthView('register')} />;
  }

  const handleOpenRequest = (id: number) => {
    setSelectedRequestId(id);
    setActiveTab('details');
  };

  const handleTransferDraft = (draft: AssistantDraft) => {
    setAssistantDraft(draft);
    setActiveTab('submit');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        setCurrentTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenSidebar={() => setSidebarOpen((prev) => !prev)}
          onNavigate={(tab) => setActiveTab(tab)}
          setCurrentTab={(tab) => setActiveTab(tab)}
          onOpenRequest={handleOpenRequest}
          onOpenRequestDetails={handleOpenRequest}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardPage
                onNavigate={setActiveTab}
                onOpenRequest={handleOpenRequest}
              />
            )}

            {activeTab === 'requests' && (
              <RequestListPage
                onNavigate={setActiveTab}
                onOpenRequest={handleOpenRequest}
              />
            )}

            {activeTab === 'submit' && (
              <SubmitRequestPage
                initialDraft={assistantDraft}
                onClearDraft={() => setAssistantDraft(null)}
                onCreated={handleOpenRequest}
                onOpenAssistant={() => setActiveTab('assistant')}
              />
            )}

            {activeTab === 'details' && selectedRequestId && (
              <RequestDetailsPage
                requestId={selectedRequestId}
                onBack={() => setActiveTab('requests')}
              />
            )}

            {activeTab === 'assistant' && (
              <AssistantPage onTransferDraft={handleTransferDraft} />
            )}

            {activeTab === 'notifications' && (
              <NotificationsPage onOpenRequest={handleOpenRequest} />
            )}

            {activeTab === 'profile' && <ProfilePage />}

            {/* Administrative Views */}
            {activeTab === 'admin' && (
              <AdminDashboardPage onNavigate={setActiveTab} />
            )}

            {activeTab === 'users' && <UserManagementPage />}

            {activeTab === 'departments' && <DepartmentManagementPage />}

            {activeTab === 'categories' && <CategoryManagementPage />}

            {activeTab === 'sla' && <SlaManagementPage />}

            {activeTab === 'reports' && <ReportsPage />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainLayout />
      </NotificationProvider>
    </AuthProvider>
  );
}
