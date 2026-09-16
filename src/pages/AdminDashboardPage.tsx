import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Flame,
  Users,
  Building2,
  Tags,
  RefreshCw,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const AdminDashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch('/api/reports/summary', {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setSummary(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleScanSla = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch('/api/sla/scan', {
        method: 'POST',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(`SLA Scan Completed: ${data.newlyOverdue} new overdue tickets flagged, ${data.scanned} active tickets inspected.`);
        await fetchSummary();
      }
    } catch (e) {
      setScanResult('SLA scan failed to execute.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Administrative Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            System Administration & Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Campus-wide operational queue control, SLA automated triage, user accounts, and department routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanSla}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning SLA...' : 'Run Automated SLA Scan'}</span>
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{scanResult}</span>
        </div>
      )}

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Incidents</span>
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {loading ? '—' : summary?.overdueRequests || 0}
          </div>
          <div className="text-[11px] text-red-700/80 mt-1">Breached resolution target</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Global SLA Compliance</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '—' : `${summary?.slaPerformance?.complianceRate ?? 100}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.slaPerformance?.withinSla || 0} within deadline
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Campus Open Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {loading ? '—' : summary?.openRequests || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires resolution</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">High / Emergency Triage</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-2">
            {loading ? '—' : summary?.highPriorityRequests || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Priority dispatch required</div>
        </div>
      </div>

      {/* Quick Administrative Management Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('users')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            User Accounts
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage student, faculty, staff roles, permissions, and active statuses.
          </p>
          <div className="mt-3 text-xs font-semibold text-blue-600 flex items-center gap-1">
            <span>Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('departments')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Departments
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure campus departments, department heads, and contact routing.
          </p>
          <div className="mt-3 text-xs font-semibold text-indigo-600 flex items-center gap-1">
            <span>Manage Departments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('categories')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Tags className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Service Categories
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Maintain issue categories, default SLA hours, and associated departments.
          </p>
          <div className="mt-3 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <span>Manage Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('sla')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
            SLA Configuration
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Define SLA thresholds, escalation timeframes, and automated breach warnings.
          </p>
          <div className="mt-3 text-xs font-semibold text-amber-600 flex items-center gap-1">
            <span>Configure SLA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Department Workload Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Departmental Workload Distribution</h2>
            <p className="text-xs text-slate-500">Live request allocation across academic and maintenance units</p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Full Analytics Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned Incidents</th>
                <th className="px-4 py-3">Share of Total</th>
                <th className="px-4 py-3 text-right">Quick Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(summary?.requestsByDepartment || []).map((dept: any) => {
                const total = summary?.totalRequests || 1;
                const pct = Math.round((dept.count / total) * 100);
                return (
                  <tr key={dept.department} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{dept.department}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{dept.count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onNavigate('requests')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                      >
                        View Queue
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
