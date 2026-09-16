import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ServiceRequest, RequestStatus, RequestPriority, Attachment, RequestHistoryItem } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import {
  ArrowLeft,
  Clock,
  Flame,
  AlertTriangle,
  User,
  Building,
  MapPin,
  Calendar,
  Paperclip,
  CheckCircle2,
  Trash2,
  Send,
  Upload,
  FileText,
  ShieldCheck,
  History,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface Props {
  requestId: number;
  onBack: () => void;
  onNavigateToEdit?: (id: number) => void;
}

export const RequestDetailsPage: React.FC<Props> = ({ requestId, onBack }) => {
  const { user, token } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals & Action States
  const [newStatus, setNewStatus] = useState<RequestStatus>('Under Review');
  const [resolutionText, setResolutionText] = useState('');
  const [workNoteText, setWorkNoteText] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState<string>('');
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  // Escalate modal
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // SLA edit modal
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [newSlaDate, setNewSlaDate] = useState('');

  // Attachment upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};

      const res = await fetch(`/api/requests/${requestId}`, { headers });
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error || 'This service request was not found.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setRequest(data.request);
      setHistory(data.history || []);
      setAttachments(data.attachments || []);
      setNewStatus(data.request.status);
      setResolutionText(data.request.resolutionDetails || '');
      setAssignedStaffId(data.request.assignedStaffId ? String(data.request.assignedStaffId) : '');
      setNewSlaDate(data.request.slaDeadline ? new Date(data.request.slaDeadline).toISOString().slice(0, 16) : '');
    } catch (e) {
      setErrorMsg('Failed to load request details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch('/api/users?role=Maintenance Staff', {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setStaffUsers(d.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchStaffUsers();
  }, [requestId]);

  const handleStatusUpdate = async (targetStatus: RequestStatus) => {
    if (!request) return;
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const body: any = { status: targetStatus };
      if (targetStatus === 'Resolved' && resolutionText.trim()) {
        body.resolutionDetails = resolutionText.trim();
      }
      if (workNoteText.trim()) {
        body.workNotes = workNoteText.trim();
      }

      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setWorkNoteText('');
        await fetchDetails();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update status.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          assignedStaffId: staffId ? Number(staffId) : null,
          status: staffId && request?.status === 'Submitted' ? 'Assigned' : request?.status,
        }),
      });

      if (res.ok) {
        await fetchDetails();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to assign staff.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWorkNote = async () => {
    if (!workNoteText.trim()) return;
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ workNotes: workNoteText.trim() }),
      });
      if (res.ok) {
        setWorkNoteText('');
        await fetchDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEscalate = async () => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch(`/api/requests/${requestId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ reason: escalateReason.trim() }),
      });
      if (res.ok) {
        setShowEscalateModal(false);
        setEscalateReason('');
        await fetchDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjustSla = async () => {
    if (!newSlaDate) return;
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch(`/api/requests/${requestId}/sla`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ slaDeadline: new Date(newSlaDate).toISOString() }),
      });
      if (res.ok) {
        setShowSlaModal(false);
        await fetchDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        onBack();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete request.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    if (uploadFile.size > 10 * 1024 * 1024) {
      alert('This file is too large. Maximum size is 10MB.');
      return;
    }

    try {
      setUploading(true);
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch(`/api/requests/${requestId}/attachments`, {
        method: 'POST',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        body: formData,
      });

      if (res.ok) {
        setUploadFile(null);
        await fetchDetails();
      } else {
        const d = await res.json();
        alert(d.error || 'Upload failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId: number) => {
    try {
      const activeToken = token || localStorage.getItem('campuspulse_token');
      const res = await fetch(`/api/attachments/${attId}`, {
        method: 'DELETE',
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        await fetchDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
        Loading service request details...
      </div>
    );
  }

  if (errorMsg || !request) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h2 className="text-sm font-bold text-slate-800">Request Not Accessible</h2>
        <p className="text-xs text-slate-500 mt-1">{errorMsg || 'This service request was not found.'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          Back to Request List
        </button>
      </div>
    );
  }

  const isAdmin = ['Administrator', 'Super Administrator'].includes(user?.role || '');
  const isDeptHead = user?.role === 'Department Head' && user.department === request.department;
  const isAssignedTech = user?.role === 'Maintenance Staff' && request.assignedStaffId === user.id;
  const isOwner = request.submittedBy === user?.id;

  const isOverdue =
    request.isOverdue ||
    (new Date(request.slaDeadline).getTime() < Date.now() &&
      !['Resolved', 'Closed', 'Rejected'].includes(request.status));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top navigation row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Escalate button */}
          {!request.escalated && !['Resolved', 'Closed'].includes(request.status) && (
            <button
              onClick={() => setShowEscalateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Escalate Request</span>
            </button>
          )}

          {/* Admin delete */}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete request"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Request Card Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
              {request.requestId}
            </span>
            <StatusBadge status={request.status} size="lg" />
            <PriorityBadge priority={request.priority} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs font-bold border border-red-200 animate-pulse">
                <Flame className="w-3.5 h-3.5 text-red-600" />
                SLA Breached (Overdue)
              </span>
            )}
            {request.escalated && (
              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Escalated
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Logged on {new Date(request.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {request.title}
          </h1>
          <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Category:</strong> {request.category}</span>
            <span><strong>Department:</strong> {request.department}</span>
            <span><strong>Location:</strong> {request.campusLocation} {request.building ? `(${request.building})` : ''} {request.roomNumber ? `• Room ${request.roomNumber}` : ''}</span>
          </div>
        </div>

        {/* Escalation note if active */}
        {request.escalated && request.escalationReason && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Escalation Notice:</strong> {request.escalationReason}
            </div>
          </div>
        )}

        {/* SLA Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
            <div>
              <span className="font-semibold text-slate-800">SLA Target Resolution:</span>{' '}
              <span className={isOverdue ? 'text-red-700 font-bold' : 'text-slate-600'}>
                {new Date(request.slaDeadline).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {' '}(Base: {request.slaHours}h)
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowSlaModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium self-start sm:self-auto"
            >
              Adjust SLA Deadline
            </button>
          )}
        </div>
      </div>

      {/* Description & Resolution Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Detailed Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Problem Description
            </h2>
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {request.description}
            </div>

            {request.resolutionDetails && (
              <div className="mt-6 pt-5 border-t border-slate-100 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Resolution Details
                </div>
                <p className="text-xs text-emerald-950 whitespace-pre-wrap">
                  {request.resolutionDetails}
                </p>
                {request.closedDate && (
                  <div className="text-[11px] text-emerald-700 mt-2">
                    Closed: {new Date(request.closedDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Evidence & Attachments ({attachments.length})</span>
              </h2>
            </div>

            {attachments.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
                No attachments uploaded for this service request yet.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate">{att.fileName}</div>
                        <div className="text-[10px] text-slate-400">
                          {Math.round(att.fileSize / 1024)} KB • Uploaded by {att.uploadedByName} on{' '}
                          {new Date(att.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={att.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        View / Open
                      </a>
                      {(isAdmin || att.uploadedBy === user?.id) && (
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Delete attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload form */}
            <form onSubmit={handleUploadAttachment} className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              <input
                type="file"
                id="details-upload"
                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 hover:file:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
              </button>
            </form>
          </div>

          {/* Timeline & Audit History */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <History className="w-3.5 h-3.5" />
              <span>Activity History & Audit Trail</span>
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((h, index) => (
                <div key={h.id || index} className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-2xs" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">{h.action}</span>
                    <span className="text-slate-400 text-[11px] ml-2">
                      by {h.changedByName} • {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(h.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{h.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Action Controls */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Request Metadata
            </h3>

            <div>
              <span className="text-[11px] text-slate-400 block">Submitted By</span>
              <div className="text-xs font-semibold text-slate-900 mt-0.5">{request.submittedByName || 'Student'}</div>
              <div className="text-[11px] text-slate-500">{request.submittedByEmail}</div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">Assigned Technician</span>
              <div className="text-xs font-semibold text-slate-900 mt-0.5">
                {request.assignedStaffName || 'Unassigned'}
              </div>
            </div>

            {/* Staff Assignment Control (Admin or Dept Head) */}
            {(isAdmin || isDeptHead) && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assign Maintenance Technician
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => {
                    setAssignedStaffId(e.target.value);
                    handleAssignStaff(e.target.value);
                  }}
                  className="w-full text-xs py-1.5 px-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.department})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Workflow & Status Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Workflow Actions
            </h3>

            {/* Quick status transitions based on role */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-500 font-semibold block">Change Status:</span>

              {/* Maintenance Staff workflow: In Progress / Resolved */}
              {(isAssignedTech || isAdmin || isDeptHead) && (
                <>
                  {request.status !== 'In Progress' && request.status !== 'Resolved' && request.status !== 'Closed' && (
                    <button
                      onClick={() => handleStatusUpdate('In Progress')}
                      className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors text-left flex items-center justify-between"
                    >
                      <span>Mark In Progress</span>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  )}

                  {request.status !== 'Resolved' && request.status !== 'Closed' && (
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Mark as Resolved:
                      </label>
                      <textarea
                        rows={2}
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Resolution summary or work done notes..."
                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleStatusUpdate('Resolved')}
                        className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        Confirm Resolution
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Student or Admin verification: Mark Closed */}
              {(isOwner || isAdmin) && request.status === 'Resolved' && (
                <button
                  onClick={() => handleStatusUpdate('Closed')}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors text-left flex items-center justify-between"
                >
                  <span>Close Ticket (Verified Fixed)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Admin full status override */}
              {isAdmin && (
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Admin Status Override</span>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {(['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'] as RequestStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          disabled={request.status === st}
                          onClick={() => handleStatusUpdate(st)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border text-left transition-colors ${
                            request.status === st
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Add Work Note / Technician log */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Add Work Note / Internal Update
              </label>
              <textarea
                rows={2}
                value={workNoteText}
                onChange={(e) => setWorkNoteText(e.target.value)}
                placeholder="Log parts used, site notes, or delay reason..."
                className="w-full p-2 border border-slate-200 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
              />
              <button
                onClick={handleAddWorkNote}
                disabled={!workNoteText.trim()}
                className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                <span>Save Work Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Escalate Service Request</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Escalation notifies department heads and administrators, accelerates priority, and flags the incident as urgent.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Escalation
              </label>
              <textarea
                rows={3}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="e.g. Critical classroom interruption, safety hazard, or prolonged delay..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalate}
                disabled={!escalateReason.trim()}
                className="px-3.5 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust SLA Modal */}
      {showSlaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Adjust SLA Target Deadline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Override the target resolution deadline with an approved operational extension.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Target Deadline (Date & Time)
              </label>
              <input
                type="datetime-local"
                value={newSlaDate}
                onChange={(e) => setNewSlaDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSlaModal(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustSla}
                className="px-3.5 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
              >
                Save New Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Service Request"
        message={`Are you sure you want to permanently delete service request ${request.requestId}? This action cannot be undone.`}
        confirmText="Delete Request"
        variant="danger"
        onConfirm={handleDeleteRequest}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
