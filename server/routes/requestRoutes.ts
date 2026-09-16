import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { validateTitle, validateDescription, validateCategory, validatePriority, validateLocation } from '../validation.js';
import { calculateSlaHours, calculateDeadline } from '../sla.js';
import { createNotification, notifyAdminsAndDepts } from '../notifications.js';
import { RequestStatus, RequestPriority } from '../../src/types.js';

const router = Router();

// Helper to map DB row to ServiceRequest interface
function mapRequest(row: any) {
  return {
    id: row.id,
    requestId: row.request_id,
    title: row.title,
    description: row.description,
    category: row.category,
    department: row.department,
    campusLocation: row.campus_location,
    building: row.building,
    roomNumber: row.room_number || '',
    priority: row.priority as RequestPriority,
    submittedBy: row.submitted_by,
    submittedByName: row.submitted_by_name,
    submittedByEmail: row.submitted_by_email,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffName: row.assigned_staff_name,
    status: row.status as RequestStatus,
    slaDeadline: row.sla_deadline,
    slaHours: row.sla_hours,
    isOverdue: Boolean(row.is_overdue),
    escalated: Boolean(row.escalated),
    escalationReason: row.escalation_reason,
    resolutionDetails: row.resolution_details,
    closedDate: row.closed_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// POST /api/requests - Create a service request
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { title, description, category, department, campusLocation, building, roomNumber, priority } = req.body;

    const titleVal = validateTitle(title);
    if (!titleVal.valid) {
      res.status(400).json({ error: titleVal.message });
      return;
    }

    const descVal = validateDescription(description);
    if (!descVal.valid) {
      res.status(400).json({ error: descVal.message });
      return;
    }

    // Get active categories to validate against
    const categories = await queryAll<{ name: string }>('SELECT name FROM categories WHERE is_active = 1');
    const catNames = categories.map(c => c.name);
    const catVal = validateCategory(category, catNames);
    if (!catVal.valid) {
      res.status(400).json({ error: catVal.message });
      return;
    }

    if (!department || typeof department !== 'string' || !department.trim()) {
      res.status(400).json({ error: 'Please select a valid department.' });
      return;
    }

    const locVal = validateLocation(campusLocation);
    if (!locVal.valid) {
      res.status(400).json({ error: locVal.message });
      return;
    }

    const prioVal = validatePriority(priority);
    if (!prioVal.valid) {
      res.status(400).json({ error: prioVal.message });
      return;
    }

    // SLA Calculation
    const slaHours = await calculateSlaHours(category.trim(), priority.trim());
    const slaDeadline = calculateDeadline(slaHours);
    const now = new Date().toISOString();

    // Generate Request ID (e.g. CP-2026-0045)
    const countRow = await queryOne<{ total: number }>('SELECT COUNT(*) as total FROM service_requests');
    const seqNum = (countRow?.total || 0) + 1;
    const year = new Date().getFullYear();
    const requestId = `CP-${year}-${String(seqNum).padStart(4, '0')}`;

    const insertResult = await execute(
      `INSERT INTO service_requests (
        request_id, title, description, category, department, campus_location,
        building, room_number, priority, submitted_by, assigned_staff_id,
        status, sla_deadline, sla_hours, is_overdue, escalated, escalation_reason,
        resolution_details, closed_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'Submitted', ?, ?, 0, 0, NULL, NULL, NULL, ?, ?)`,
      [
        requestId,
        title.trim(),
        description.trim(),
        category.trim(),
        department.trim(),
        campusLocation.trim(),
        (building || '').trim(),
        (roomNumber || '').trim(),
        priority.trim(),
        user.id,
        slaDeadline,
        slaHours,
        now,
        now
      ]
    );

    const newReqId = insertResult.lastInsertRowid;

    // Log to request_history
    await execute(
      'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
      [newReqId, user.id, 'Created', `Service request created with ${priority} priority. SLA Target: ${slaHours} hours.`, now]
    );

    // Notify user
    await createNotification({
      userId: user.id,
      title: 'Service Request Submitted',
      message: `Your request ${requestId} ("${title.trim()}") was logged. SLA Target: ${slaHours} hours.`,
      type: 'new_request',
      link: `/requests/${newReqId}`,
    });

    // Notify Department Head and Administrators
    await notifyAdminsAndDepts(
      department.trim(),
      'New Service Request Received',
      `New request ${requestId} logged in ${department.trim()} category: ${category.trim()}. Priority: ${priority.trim()}.`,
      'new_request',
      `/requests/${newReqId}`
    );

    const createdRecord = await queryOne(`
      SELECT r.*, u.name as submitted_by_name, u.email as submitted_by_email
      FROM service_requests r
      LEFT JOIN users u ON r.submitted_by = u.id
      WHERE r.id = ?
    `, [newReqId]);

    res.status(201).json({
      message: 'Service request submitted successfully.',
      request: mapRequest(createdRecord),
    });
  } catch (err: any) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'An unexpected error occurred while creating the service request.' });
  }
});

// GET /api/requests - List service requests with search, filter, sort, and role isolation
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, priority, category, department, location, assignedStaff, search, sort } = req.query;

    let sql = `
      SELECT r.*,
             u.name as submitted_by_name, u.email as submitted_by_email,
             m.name as assigned_staff_name
      FROM service_requests r
      LEFT JOIN users u ON r.submitted_by = u.id
      LEFT JOIN users m ON r.assigned_staff_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based visibility isolation
    if (['Student'].includes(user.role)) {
      sql += ` AND r.submitted_by = ?`;
      params.push(user.id);
    } else if (['Faculty', 'Staff'].includes(user.role)) {
      // Faculty & Staff see their own submissions OR any requests assigned to them
      sql += ` AND (r.submitted_by = ? OR r.assigned_staff_id = ?)`;
      params.push(user.id, user.id);
    } else if (user.role === 'Maintenance Staff') {
      // Maintenance Staff see their assigned requests or unassigned in their department
      sql += ` AND (r.assigned_staff_id = ? OR (r.department = ? AND r.assigned_staff_id IS NULL))`;
      params.push(user.id, user.department);
    } else if (user.role === 'Department Head') {
      // Department Heads see requests within their department
      sql += ` AND (r.department = ? OR r.submitted_by = ?)`;
      params.push(user.department, user.id);
    }
    // Administrator, Super Administrator, Principal, Vice Principal see all requests!

    // Filters
    if (status && typeof status === 'string' && status !== 'all') {
      sql += ` AND r.status = ?`;
      params.push(status);
    }
    if (priority && typeof priority === 'string' && priority !== 'all') {
      sql += ` AND r.priority = ?`;
      params.push(priority);
    }
    if (category && typeof category === 'string' && category !== 'all') {
      sql += ` AND r.category = ?`;
      params.push(category);
    }
    if (department && typeof department === 'string' && department !== 'all') {
      sql += ` AND r.department = ?`;
      params.push(department);
    }
    if (location && typeof location === 'string' && location.trim()) {
      sql += ` AND (r.campus_location LIKE ? OR r.building LIKE ?)`;
      params.push(`%${location.trim()}%`, `%${location.trim()}%`);
    }
    if (assignedStaff && typeof assignedStaff === 'string' && assignedStaff !== 'all') {
      if (assignedStaff === 'unassigned') {
        sql += ` AND r.assigned_staff_id IS NULL`;
      } else {
        sql += ` AND r.assigned_staff_id = ?`;
        params.push(Number(assignedStaff));
      }
    }

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (r.title LIKE ? OR r.description LIKE ? OR r.request_id LIKE ? OR r.room_number LIKE ?)`;
      params.push(q, q, q, q);
    }

    // Sorting
    switch (sort) {
      case 'oldest':
        sql += ` ORDER BY r.id ASC`;
        break;
      case 'priority':
        sql += ` ORDER BY CASE r.priority WHEN 'Emergency' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 ELSE 5 END, r.id DESC`;
        break;
      case 'deadline':
        sql += ` ORDER BY r.sla_deadline ASC`;
        break;
      case 'newest':
      default:
        sql += ` ORDER BY r.id DESC`;
        break;
    }

    const rows = await queryAll(sql, params);
    res.status(200).json({
      requests: rows.map(mapRequest),
      count: rows.length,
    });
  } catch (err: any) {
    console.error('List requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve service requests.' });
  }
});

// GET /api/requests/:id - View single request with history and attachments
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const reqId = Number(req.params.id);
    if (!reqId || reqId <= 0) {
      res.status(400).json({ error: 'Invalid ID parameter.' });
      return;
    }

    const row = await queryOne(`
      SELECT r.*,
             u.name as submitted_by_name, u.email as submitted_by_email,
             m.name as assigned_staff_name
      FROM service_requests r
      LEFT JOIN users u ON r.submitted_by = u.id
      LEFT JOIN users m ON r.assigned_staff_id = m.id
      WHERE r.id = ?
    `, [reqId]);

    if (!row) {
      res.status(404).json({ error: 'This service request was not found.' });
      return;
    }

    // Check authorization
    const isOwner = (row as any).submitted_by === user.id;
    const isAssigned = (row as any).assigned_staff_id === user.id;
    const isDeptHead = user.role === 'Department Head' && (row as any).department === user.department;
    const isElevated = ['Administrator', 'Super Administrator', 'Principal', 'Vice Principal'].includes(user.role);
    const isMaintenance = user.role === 'Maintenance Staff' && ((row as any).department === user.department || isAssigned);

    if (!isOwner && !isAssigned && !isDeptHead && !isElevated && !isMaintenance) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }

    // Fetch history
    const history = await queryAll(`
      SELECT h.*, u.name as changed_by_name
      FROM request_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.request_id = ?
      ORDER BY h.id ASC
    `, [reqId]);

    // Fetch attachments
    const attachments = await queryAll(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.request_id = ?
      ORDER BY a.id ASC
    `, [reqId]);

    res.status(200).json({
      request: mapRequest(row),
      history: history.map((h: any) => ({
        id: h.id,
        requestId: h.request_id,
        changedBy: h.changed_by,
        changedByName: h.changed_by_name || 'System / Auto',
        action: h.action,
        details: h.details,
        timestamp: h.timestamp,
      })),
      attachments: attachments.map((a: any) => ({
        id: a.id,
        requestId: a.request_id,
        fileName: a.file_name,
        fileType: a.file_type,
        fileSize: a.file_size,
        filePath: a.file_path,
        uploadedBy: a.uploaded_by,
        uploadedByName: a.uploaded_by_name || 'User',
        createdAt: a.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Get request details error:', err);
    res.status(500).json({ error: 'Failed to retrieve service request details.' });
  }
});

// PUT /api/requests/:id & PATCH /api/requests/:id - Update request
router.all('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    next();
    return;
  }

  try {
    const user = req.user!;
    const reqId = Number(req.params.id);
    if (!reqId || reqId <= 0) {
      res.status(400).json({ error: 'Invalid ID parameter.' });
      return;
    }

    const current = await queryOne<any>('SELECT * FROM service_requests WHERE id = ?', [reqId]);
    if (!current) {
      res.status(404).json({ error: 'This service request was not found.' });
      return;
    }

    const isAdmin = ['Administrator', 'Super Administrator'].includes(user.role);
    const isDeptHead = user.role === 'Department Head' && current.department === user.department;
    const isAssignedTech = user.role === 'Maintenance Staff' && current.assigned_staff_id === user.id;
    const isOwner = current.submitted_by === user.id;

    // Rule: "Users must not edit closed requests unless they have administrator permission."
    if (current.status === 'Closed' && !isAdmin) {
      res.status(403).json({ error: 'Closed requests cannot be edited without administrator permission.' });
      return;
    }

    // Role checks:
    // Students can edit basic info if submitted/under review
    if (user.role === 'Student' && !isOwner) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }

    const {
      title,
      description,
      category,
      department,
      campusLocation,
      building,
      roomNumber,
      priority,
      status,
      assignedStaffId,
      resolutionDetails,
      workNotes,
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    const historyActions: string[] = [];
    const now = new Date().toISOString();

    // Editable text fields
    if (title !== undefined) {
      const titleVal = validateTitle(title);
      if (!titleVal.valid) {
        res.status(400).json({ error: titleVal.message });
        return;
      }
      updates.push('title = ?');
      params.push(title.trim());
      historyActions.push(`Updated title to "${title.trim()}"`);
    }

    if (description !== undefined) {
      const descVal = validateDescription(description);
      if (!descVal.valid) {
        res.status(400).json({ error: descVal.message });
        return;
      }
      updates.push('description = ?');
      params.push(description.trim());
      historyActions.push('Updated problem description');
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category.trim());
      historyActions.push(`Changed category to ${category.trim()}`);
    }

    if (department !== undefined) {
      updates.push('department = ?');
      params.push(department.trim());
      historyActions.push(`Routed department to ${department.trim()}`);
    }

    if (campusLocation !== undefined) {
      updates.push('campus_location = ?');
      params.push(campusLocation.trim());
    }

    if (building !== undefined) {
      updates.push('building = ?');
      params.push(building.trim());
    }

    if (roomNumber !== undefined) {
      updates.push('room_number = ?');
      params.push(roomNumber.trim());
    }

    // Priority change (Admin, Dept Head, or Tech)
    if (priority !== undefined && priority !== current.priority) {
      if (!isAdmin && !isDeptHead) {
        res.status(403).json({ error: 'Only department coordinators and administrators can change priority.' });
        return;
      }
      const pVal = validatePriority(priority);
      if (!pVal.valid) {
        res.status(400).json({ error: pVal.message });
        return;
      }
      updates.push('priority = ?');
      params.push(priority.trim());
      historyActions.push(`Priority changed from ${current.priority} to ${priority.trim()}`);
    }

    // Status change
    if (status !== undefined && status !== current.status) {
      // Students cannot change status directly except to 'Closed' if resolved
      if (user.role === 'Student' && status !== 'Closed') {
        res.status(403).json({ error: 'You do not have permission to change the status of this request.' });
        return;
      }
      updates.push('status = ?');
      params.push(status);
      historyActions.push(`Status changed from ${current.status} to ${status}`);

      if (status === 'Closed') {
        updates.push('closed_date = ?');
        params.push(now);
      }
    }

    // Assignment change (Admin or Dept Head)
    if (assignedStaffId !== undefined && assignedStaffId !== current.assigned_staff_id) {
      if (!isAdmin && !isDeptHead) {
        res.status(403).json({ error: 'You do not have permission to assign staff.' });
        return;
      }
      const staffUser = assignedStaffId ? await queryOne<any>('SELECT name FROM users WHERE id = ?', [assignedStaffId]) : null;
      updates.push('assigned_staff_id = ?');
      params.push(assignedStaffId || null);

      if (assignedStaffId) {
        historyActions.push(`Assigned to ${staffUser ? staffUser.name : `Staff #${assignedStaffId}`}`);
        // Notify assigned staff
        await createNotification({
          userId: Number(assignedStaffId),
          title: 'New Service Request Assignment',
          message: `You have been assigned to service request ${current.request_id} ("${current.title}").`,
          type: 'assignment',
          link: `/requests/${current.id}`,
        });
      } else {
        historyActions.push('Unassigned maintenance staff');
      }
    }

    // Resolution Details
    if (resolutionDetails !== undefined) {
      updates.push('resolution_details = ?');
      params.push(resolutionDetails.trim());
      historyActions.push('Updated resolution details');
    }

    // Work Notes
    if (workNotes && typeof workNotes === 'string' && workNotes.trim()) {
      historyActions.push(`Work Note: ${workNotes.trim()}`);
    }

    if (updates.length === 0 && (!workNotes || !workNotes.trim())) {
      res.status(400).json({ error: 'No fields provided for update.' });
      return;
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(reqId);

    if (updates.length > 1) {
      await execute(`UPDATE service_requests SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Insert history
    for (const action of historyActions) {
      await execute(
        'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
        [reqId, user.id, 'Update', action, now]
      );
    }

    // Notify request owner of update
    if (current.submitted_by !== user.id) {
      await createNotification({
        userId: current.submitted_by,
        title: 'Service Request Updated',
        message: `Your request ${current.request_id} was updated: ${historyActions.join(', ')}.`,
        type: status === 'Resolved' ? 'resolution' : status === 'Closed' ? 'closure' : status === 'Rejected' ? 'rejection' : 'status_update',
        link: `/requests/${current.id}`,
      });
    }

    const updatedRow = await queryOne(`
      SELECT r.*,
             u.name as submitted_by_name, u.email as submitted_by_email,
             m.name as assigned_staff_name
      FROM service_requests r
      LEFT JOIN users u ON r.submitted_by = u.id
      LEFT JOIN users m ON r.assigned_staff_id = m.id
      WHERE r.id = ?
    `, [reqId]);

    res.status(200).json({
      message: 'Service request updated successfully.',
      request: mapRequest(updatedRow),
    });
  } catch (err: any) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'An unexpected error occurred while updating the service request.' });
  }
});

// DELETE /api/requests/:id - Delete a service request (Authorized administrators only)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!['Administrator', 'Super Administrator'].includes(user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }

    const reqId = Number(req.params.id);
    if (!reqId || reqId <= 0) {
      res.status(400).json({ error: 'Invalid ID parameter.' });
      return;
    }

    const existing = await queryOne<any>('SELECT * FROM service_requests WHERE id = ?', [reqId]);
    if (!existing) {
      res.status(404).json({ error: 'This service request was not found.' });
      return;
    }

    await execute('DELETE FROM service_requests WHERE id = ?', [reqId]);
    res.status(200).json({ message: 'Service request deleted successfully.' });
  } catch (err: any) {
    console.error('Delete request error:', err);
    res.status(500).json({ error: 'Failed to delete service request.' });
  }
});

export default router;
