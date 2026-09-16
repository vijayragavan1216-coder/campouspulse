import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Department } from '../types.js';
import {
  Building2,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail,
  User,
  Phone,
} from 'lucide-react';

export const DepartmentManagementPage: React.FC = () => {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deptId, setDeptId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [headName, setHeadName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/departments');
      if (res.ok) {
        const d = await res.json();
        setDepartments(d.departments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setDeptId(null);
    setName('');
    setCode('');
    setHeadName('');
    setContactEmail('');
    setContactPhone('');
    setDescription('');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEdit = (d: Department) => {
    setModalMode('edit');
    setDeptId(d.id);
    setName(d.name);
    setCode(d.code);
    setHeadName(d.headName || '');
    setContactEmail(d.contactEmail || '');
    setContactPhone(d.contactPhone || '');
    setDescription(d.description || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setErrorMsg('Department Name and Code are required.');
      return;
    }

    setSaving(true);
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const url = modalMode === 'create' ? '/api/departments' : `/api/departments/${deptId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          headName: headName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          description: description.trim(),
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setErrorMsg(d.error || 'Failed to save department.');
        setSaving(false);
        return;
      }

      setShowModal(false);
      await fetchDepartments();
    } catch (e) {
      setErrorMsg('Server error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          name: dept.name,
          code: dept.code,
          isActive: !dept.isActive,
        }),
      });
      await fetchDepartments();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Departments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure academic departments, facilities, hostel offices, and IT support divisions.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {d.code}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1.5">{d.name}</h2>
                </div>
                <button
                  onClick={() => handleToggleActive(d)}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                    d.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {d.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              {d.description && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{d.description}</p>
              )}

              <div className="space-y-1 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                {d.headName && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Head: {d.headName}</span>
                  </div>
                )}
                {d.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.contactEmail}</span>
                  </div>
                )}
                {d.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => handleOpenEdit(d)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition-colors inline-flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>{modalMode === 'create' ? 'Create New Department' : 'Edit Department'}</span>
            </h3>

            {errorMsg && (
              <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electrical & Utilities"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. ELEC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Head Name</label>
                <input
                  type="text"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="e.g. Dr. Robert Vance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="dept@campus.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="555-0100"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope of campus operations..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
