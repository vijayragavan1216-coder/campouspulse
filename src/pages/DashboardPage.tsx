import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  TrendingUp,
  PlusCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ServiceRequest } from '../types.js';

interface Props {
  onNavigate: (tab: string) => void;
  onOpenRequest: (id: number) => void;
}

export const DashboardPage: React.FC<Props> = ({ onNavigate, onOpenRequest }) => {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningSla, setScanningSla] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};

      const [summaryRes, reqRes] = await Promise.all([
        fetch('/api/reports/summary', { headers }),
        fetch('/api/requests?sort=newest', { headers }),
      ]);

      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData);
      }

      if (reqRes.ok) {
        const rData = await reqRes.json();
        setRecentRequests((rData.requests || []).slice(0, 6));
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleScanSla = async () => {
    try {
      setScanningSla(true);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch('/api/sla/scan', {
        method: 'POST',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('SLA scan error:', err);
    } finally {
      setScanningSla(false);
    }
  };

  const COLORS = ['#2563eb', '#0284c7', '#0d9488', '#d97706', '#10b981', '#64748b', '#e11d48'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {user?.role} Portal
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{user?.department}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Monitor real-time campus operational requests, SLA compliance targets, and maintenance dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('assistant')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pulse Assistant</span>
          </button>
          <button
            onClick={() => onNavigate('submit')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Submit Request</span>
          </button>
        </div>
      </div>

      {/* Overdue Warning Alert Banner if any overdue tickets */}
      {summary?.overdueRequests > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-900">
                {summary.overdueRequests} Service {summary.overdueRequests === 1 ? 'Request is' : 'Requests are'} Currently Overdue
              </h2>
              <p className="text-xs text-red-700 mt-0.5">
                Target resolution deadlines have been breached. Priority dispatch and escalation are recommended.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('requests')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Review Overdue
            </button>
            <button
              onClick={handleScanSla}
              disabled={scanningSla}
              className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanningSla ? 'animate-spin' : ''}`} />
              <span>SLA Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Requests</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '—' : summary?.totalRequests || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Logged in system</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open / Pending</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {loading ? '—' : summary?.openRequests || 0}
          </div>
          <div className="text-[11px] text-blue-500/80 mt-1">
            {summary?.inProgressRequests || 0} in active progress
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Resolved / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {loading ? '—' : (summary?.resolvedRequests || 0) + (summary?.closedRequests || 0)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">
            {summary?.closedRequests || 0} fully closed
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">SLA Compliance</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '—' : `${summary?.slaPerformance?.complianceRate ?? 100}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.slaPerformance?.withinSla || 0} on target
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Requests by Category</h2>
              <p className="text-xs text-slate-500">Distribution across campus service categories</p>
            </div>
          </div>
          <div className="h-64">
            {summary?.requestsByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.requestsByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No categorical request data yet.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Requests by Status</h2>
              <p className="text-xs text-slate-500">Current triage and progress state</p>
            </div>
          </div>
          <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
            {summary?.requestsByStatus?.length > 0 ? (
              <>
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.requestsByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {summary.requestsByStatus.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 min-w-[140px]">
                  {summary.requestsByStatus.map((item: any, i: number) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-slate-600 truncate max-w-[100px]">{item.status}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No status data available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Service Requests Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Service Requests</h2>
            <p className="text-xs text-slate-500">Live operational tickets within your scope</p>
          </div>
          <button
            onClick={() => onNavigate('requests')}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No service requests found in your current workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Title & Category</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SLA Target</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentRequests.map((r) => {
                  const isOverdue = r.isOverdue || (new Date(r.slaDeadline).getTime() < Date.now() && !['Resolved', 'Closed', 'Rejected'].includes(r.status));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600 whitespace-nowrap">
                        {r.requestId}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{r.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{r.category} • {r.department}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.campusLocation}
                        {r.building && ` (${r.building})`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityBadge priority={r.priority} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px]">
                            <Flame className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            {new Date(r.slaDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenRequest(r.id)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-medium transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
