import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { RequestPriority, AssistantDraft } from '../types.js';
import {
  Sparkles,
  Paperclip,
  Clock,
  Send,
  AlertCircle,
  Building,
  MapPin,
  CheckCircle2,
  X,
  Flame,
} from 'lucide-react';

interface Props {
  onCreated: (newId: number) => void;
  onOpenAssistant: () => void;
  initialDraft?: AssistantDraft | null;
  onClearDraft?: () => void;
}

export const SubmitRequestPage: React.FC<Props> = ({
  onCreated,
  onOpenAssistant,
  initialDraft,
  onClearDraft,
}) => {
  const { user, token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [campusLocation, setCampusLocation] = useState('Main Campus');
  const [building, setBuilding] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('Medium');

  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [calculatedSla, setCalculatedSla] = useState<number>(24);

  // Pre-fill from draft if provided by Pulse Assistant
  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.title) setTitle(initialDraft.title);
      if (initialDraft.description) setDescription(initialDraft.description);
      if (initialDraft.category) setCategory(initialDraft.category);
      if (initialDraft.department) setDepartment(initialDraft.department);
      if (initialDraft.campusLocation) setCampusLocation(initialDraft.campusLocation);
      if (initialDraft.building) setBuilding(initialDraft.building);
      if (initialDraft.roomNumber) setRoomNumber(initialDraft.roomNumber);
      if (initialDraft.priority) setPriority(initialDraft.priority);
    }
  }, [initialDraft]);

  // Load categories and departments
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catRes, deptRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/departments'),
        ]);
        if (catRes.ok) {
          const cData = await catRes.json();
          setCategories(cData.categories || []);
          if (!category && cData.categories?.length > 0) {
            setCategory(cData.categories[0].name);
            setDepartment(cData.categories[0].department);
          }
        }
        if (deptRes.ok) {
          const dData = await deptRes.json();
          setDepartments(dData.departments || []);
        }
      } catch (e) {
        console.error('Failed to load categories/departments:', e);
      }
    };
    loadMetadata();
  }, []);

  // When category changes, auto-select associated department if matching
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const match = categories.find((c) => c.name === newCat);
    if (match && match.department) {
      setDepartment(match.department);
    }
  };

  // Calculate dynamic SLA preview
  useEffect(() => {
    const selectedCat = categories.find((c) => c.name === category);
    const baseHours = selectedCat ? selectedCat.slaHours : 24;
    let finalHours = baseHours;
    switch (priority) {
      case 'Emergency':
        finalHours = Math.max(2, Math.round(baseHours * 0.25));
        break;
      case 'High':
        finalHours = Math.max(4, Math.round(baseHours * 0.75));
        break;
      case 'Low':
        finalHours = Math.round(baseHours * 1.25);
        break;
      case 'Medium':
      default:
        finalHours = baseHours;
        break;
    }
    setCalculatedSla(finalHours);
  }, [category, priority, categories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('This file is too large. Maximum size is 10MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || title.trim().length < 5) {
      setErrorMsg('Title must be at least 5 characters.');
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      setErrorMsg('Description must be at least 15 characters.');
      return;
    }

    if (!category.trim()) {
      setErrorMsg('Please select a valid category.');
      return;
    }

    if (!department.trim()) {
      setErrorMsg('Please select a valid department.');
      return;
    }

    if (!campusLocation.trim() || campusLocation.trim().length < 2) {
      setErrorMsg('Location must contain at least 2 characters.');
      return;
    }

    setLoading(true);
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          department: department.trim(),
          campusLocation: campusLocation.trim(),
          building: building.trim(),
          roomNumber: roomNumber.trim(),
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit service request.');
        setLoading(false);
        return;
      }

      const newId = data.request.id;

      // Upload file attachment if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        await fetch(`/api/requests/${newId}/attachments`, {
          method: 'POST',
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
          body: formData,
        });
      }

      if (onClearDraft) onClearDraft();
      onCreated(newId);
    } catch (err) {
      setErrorMsg('An unexpected error occurred while communicating with the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Submit Service Request or Complaint
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Report facility malfunctions, safety incidents, maintenance issues, or academic service disruptions.
        </p>
      </div>

      {/* Pulse Assistant Draft Banner */}
      {initialDraft ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-900">
                Pulse Assistant Draft Transferred
              </div>
              <div className="text-[11px] text-blue-700">
                Form pre-filled with your AI drafted suggestions. You can edit any field before submitting.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearDraft}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold p-1"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Need help drafting your request?
              </div>
              <div className="text-[11px] text-slate-500">
                Pulse Assistant can formulate problem titles, suggest categories, and draft descriptions.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAssistant}
            className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors shrink-0"
          >
            Open Assistant
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-800">
              Request Title *
            </label>
            <span className={`text-[11px] ${title.length < 5 ? 'text-amber-600' : 'text-slate-400'}`}>
              {title.length} / 180 chars (min 5)
            </span>
          </div>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Washroom water fixture leakage in Science Wing"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Service Category *
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.slaHours}h SLA)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Responsible Department *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location / Building / Room */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Campus Location *
            </label>
            <input
              type="text"
              required
              value={campusLocation}
              onChange={(e) => setCampusLocation(e.target.value)}
              placeholder="e.g. Main Campus, North Campus"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Building / Complex
            </label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="e.g. Engineering Block B"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Room / Lab / Area Number
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. Lab 204 or Corridor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Priority & SLA Preview Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Priority Level *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Low', 'Medium', 'High', 'Emergency'] as RequestPriority[]).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{p}</span>
                    {p === 'Emergency' && <Flame className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic SLA Target Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Calculated SLA Target</span>
            </div>
            <div className="text-xl font-extrabold text-blue-600">
              {calculatedSla} Hours
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Based on {category || 'selected'} category and {priority} priority, our operations team targets resolution within {calculatedSla} hours.
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-800">
              Detailed Description *
            </label>
            <span className={`text-[11px] ${description.length < 15 ? 'text-amber-600' : 'text-slate-400'}`}>
              {description.length} chars (min 15)
            </span>
          </div>
          <textarea
            rows={5}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide full details of the issue, symptoms observed, specific spot, and any relevant safety hazards..."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
          />
        </div>

        {/* Attachment Upload Field */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Upload Evidence / Document (Optional)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-lg text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{selectedFile.name}</span>
                  <span className="text-slate-500 shrink-0">({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer block">
                <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-semibold text-blue-600 hover:text-blue-500">
                  Select photo, PDF or document
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supported formats: JPG, JPEG, PNG, PDF, DOC, DOCX (Max 10MB)
                </p>
              </label>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? (
              <span>Submitting Request...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Service Request</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
