import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ServiceRequest, RequestStatus, RequestPriority } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import {
  Search,
  Filter,
  PlusCircle,
  Clock,
  Flame,
  ArrowUpDown,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
  onOpenRequest: (id: number) => void;
  onEditRequest?: (id: number) => void;
}

export const RequestListPage: React.FC<Props> = ({ onNavigate, onOpenRequest }) => {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [department, setDepartment] = useState('all');
  const [sort, setSort] = useState('newest');

  const fetchFilters = async () => {
    try {
      const [catRes, deptRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/departments'),
      ]);
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
      if (deptRes.ok) {
        const d = await deptRes.json();
        setDepartments(d.departments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      if (priority !== 'all') params.append('priority', priority);
      if (category !== 'all') params.append('category', category);
      if (department !== 'all') params.append('department', department);
      if (search.trim()) params.append('search', search.trim());
      if (sort) params.append('sort', sort);

      const res = await fetch(`/api/requests?${params.toString()}`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 150);
    return () => clearTimeout(timer);
  }, [status, priority, category, department, search, sort, user]);

  return (
    <div className="space-y-5">
      {/* Header and New Request CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Service Requests & Complaints
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {user?.role === 'Student'
              ? 'Track, review, and manage your personal submitted campus tickets'
              : 'Monitor, assign, update, and resolve campus service incidents'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRequests()}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('submit')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Request</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        {/* Search row */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, ID (e.g. CP-2026-0001), or room number..."
            className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sort Order</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full text-xs py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority (Emergency First)</option>
              <option value="deadline">SLA Deadline Approaching</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading service requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-sm text-slate-700">No Service Requests Found</div>
            <p className="mt-1 text-slate-400 max-w-sm mx-auto">
              No matching requests were found with the active filters. Try adjusting your search or submit a new service ticket.
            </p>
            <button
              onClick={() => onNavigate('submit')}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit New Request</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Incident Title & Scope</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Staff</th>
                  <th className="px-4 py-3">SLA Target</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((r) => {
                  const isOverdue =
                    r.isOverdue ||
                    (new Date(r.slaDeadline).getTime() < Date.now() &&
                      !['Resolved', 'Closed', 'Rejected'].includes(r.status));

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => onOpenRequest(r.id)}
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {r.requestId}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {r.category} • {r.department}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        <div>{r.campusLocation}</div>
                        {r.building && (
                          <div className="text-[11px] text-slate-400">
                            {r.building} {r.roomNumber ? `• ${r.roomNumber}` : ''}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PriorityBadge priority={r.priority} />
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {r.assignedStaffName ? (
                          <span className="font-medium text-slate-800">{r.assignedStaffName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <Flame className="w-3 h-3 text-red-600" />
                            Overdue
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(r.slaDeadline).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenRequest(r.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-md text-slate-700 font-semibold text-xs transition-colors"
                        >
                          Details
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
