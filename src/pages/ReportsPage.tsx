import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
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
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Flame,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { token } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const activeToken = token || localStorage.getItem('campuspulse_token');
        const res = await fetch('/api/reports/summary', {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        });
        if (res.ok) {
          const d = await res.json();
          setReport(d);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const COLORS = ['#2563eb', '#0284c7', '#0d9488', '#d97706', '#10b981', '#64748b', '#e11d48'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Operations & SLA Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Operational throughput, departmental load distribution, and resolution performance audit.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Total Incident Volume</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '—' : report?.totalRequests || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Logged tickets across campus</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">SLA Compliance Rate</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {loading ? '—' : `${report?.slaPerformance?.complianceRate ?? 100}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {report?.slaPerformance?.withinSla || 0} / {report?.totalRequests || 0} on target
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Active Open Incidents</div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {loading ? '—' : report?.openRequests || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {report?.inProgressRequests || 0} currently in progress
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Overdue Escalations</div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {loading ? '—' : report?.overdueRequests || 0}
          </div>
          <div className="text-[11px] text-red-600/80 mt-1">Breached resolution deadline</div>
        </div>
      </div>

      {/* Chart Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Volume by Service Category</h2>
          <p className="text-xs text-slate-500 mb-4">Total requests filed by operational category</p>
          <div className="h-64">
            {report?.requestsByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.requestsByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
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
                No categorical request data.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Status Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Current stage across ticket lifecycles</p>
          <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-6">
            {report?.requestsByStatus?.length > 0 ? (
              <>
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.requestsByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {report.requestsByStatus.map((_: any, index: number) => (
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
                  {report.requestsByStatus.map((item: any, i: number) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-slate-600 truncate max-w-[110px]">{item.status}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No status data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Departmental Incident Distribution</h2>
          <p className="text-xs text-slate-500">Breakdown of operational workload per college division</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Total Requests</th>
                <th className="px-4 py-3">Workload Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(report?.requestsByDepartment || []).map((dept: any) => {
                const total = report?.totalRequests || 1;
                const pct = Math.round((dept.count / total) * 100);
                return (
                  <tr key={dept.department} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{dept.department}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{dept.count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-36 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-600">{pct}%</span>
                      </div>
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
