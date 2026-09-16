import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Clock,
  RefreshCw,
  Flame,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const SlaManagementPage: React.FC = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      if (res.ok) {
        const d = await res.json();
        setCategories(d.categories || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleRunScan = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch('/api/sla/scan', {
        method: 'POST',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setScanResult(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Service Level Agreement (SLA) & Escalation Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure resolution targets, automated breach scanning, and priority-based turnaround formulas.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Inspecting SLA Targets...' : 'Run SLA Breach Scan Now'}</span>
        </button>
      </div>

      {/* Scan result alert */}
      {scanResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-emerald-900 text-sm">Automated SLA Inspection Succeeded</h3>
            <p className="text-emerald-700 mt-0.5">{scanResult.message}</p>
            <div className="mt-2 flex gap-4 text-[11px] text-emerald-800 font-semibold">
              <span>Scanned Active Tickets: {scanResult.scanned}</span>
              <span>Newly Flagged Overdue: {scanResult.newlyOverdue}</span>
            </div>
          </div>
        </div>
      )}

      {/* Priority Multiplier Rule Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Priority Dynamic Turnaround Multipliers</span>
        </h2>
        <p className="text-xs text-slate-500">
          CampusPulse dynamically scales base category SLA hours according to incident priority to ensure rapid emergency containment.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg">
            <div className="text-xs font-bold text-red-900 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>Emergency (0.25x)</span>
            </div>
            <p className="text-[11px] text-red-700 mt-1">
              Immediate response target. Base hours scaled to 25% (min 2 hours).
            </p>
          </div>

          <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg">
            <div className="text-xs font-bold text-orange-900">
              High Priority (0.75x)
            </div>
            <p className="text-[11px] text-orange-700 mt-1">
              Urgent service interruptions. Base hours scaled to 75% (min 4 hours).
            </p>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
            <div className="text-xs font-bold text-blue-900">
              Medium Priority (1.0x)
            </div>
            <p className="text-[11px] text-blue-700 mt-1">
              Standard operations turnaround according to category base SLA.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-bold text-slate-900">
              Low Priority (1.25x)
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Minor cosmetic or scheduled adjustments. Extended by 25%.
            </p>
          </div>
        </div>
      </div>

      {/* SLA Target Resolution Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Active Service Category SLA Matrix</h2>
          <p className="text-xs text-slate-500">Standard response and resolution timeframes per incident classification</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Base SLA</th>
                <th className="px-4 py-3 text-red-600">Emergency (0.25x)</th>
                <th className="px-4 py-3 text-orange-600">High (0.75x)</th>
                <th className="px-4 py-3 text-blue-600">Medium (1.0x)</th>
                <th className="px-4 py-3 text-slate-600">Low (1.25x)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {categories.map((c) => {
                const base = c.slaHours;
                const em = Math.max(2, Math.round(base * 0.25));
                const hi = Math.max(4, Math.round(base * 0.75));
                const med = base;
                const lo = Math.round(base * 1.25);

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.department}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{base} hrs</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{em} hrs</td>
                    <td className="px-4 py-3 font-semibold text-orange-600">{hi} hrs</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{med} hrs</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{lo} hrs</td>
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
