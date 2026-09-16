import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Category } from '../types.js';
import {
  Tags,
  PlusCircle,
  Clock,
  Edit2,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export const CategoryManagementPage: React.FC = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [catId, setCatId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [slaHours, setSlaHours] = useState(24);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCatId(null);
    setName('');
    setDept(departments[0]?.name || 'Facilities Management');
    setSlaHours(24);
    setDescription('');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: Category) => {
    setModalMode('edit');
    setCatId(c.id);
    setName(c.name);
    setDept(c.department);
    setSlaHours(c.slaHours);
    setDescription(c.description || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dept.trim()) {
      setErrorMsg('Category name and department are required.');
      return;
    }

    setSaving(true);
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const url = modalMode === 'create' ? '/api/categories' : `/api/categories/${catId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          department: dept.trim(),
          slaHours: Number(slaHours),
          description: description.trim(),
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setErrorMsg(d.error || 'Failed to save category.');
        setSaving(false);
        return;
      }

      setShowModal(false);
      await fetchCategories();
    } catch (e) {
      setErrorMsg('Server error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Category) => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      await fetch(`/api/categories/${c.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          name: c.name,
          department: c.department,
          slaHours: c.slaHours,
          isActive: !c.isActive,
        }),
      });
      await fetchCategories();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Service Request Categories & SLA Hours
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure campus incident types, default resolution SLA hours, and responsible department routing.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">{c.name}</h2>
                <button
                  onClick={() => handleToggleActive(c)}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                    c.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {c.department}
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{c.slaHours}h Target</span>
                </span>
              </div>

              {c.description && (
                <p className="text-xs text-slate-500 mt-3 line-clamp-2">{c.description}</p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => handleOpenEdit(c)}
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
              <Tags className="w-5 h-5 text-blue-600" />
              <span>{modalMode === 'create' ? 'Create Service Category' : 'Edit Category'}</span>
            </h3>

            {errorMsg && (
              <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electrical Faults"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsible Department *</label>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default SLA Target (Hours) *</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Issue types and criteria..."
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
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
