import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';
import { scanAndUpdateSla } from '../sla.js';
import { createNotification, notifyAdminsAndDepts } from '../notifications.js';

const router = Router();

// GET /api/sla/settings
router.get('/settings', requireAuth, async (_req, res: Response): Promise<void> => {
  try {
    const rows = await queryAll<any>('SELECT * FROM sla_settings ORDER BY category_name ASC');
    res.status(200).json({
      settings: rows.map(r => ({
        id: r.id,
        categoryId: r.category_id,
        categoryName: r.category_name,
        slaHours: r.sla_hours,
        escalateAfterHours: r.escalate_after_hours,
        escalateToRole: r.escalate_to_role,
        isActive: Boolean(r.is_active),
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve SLA settings.' });
  }
});

// PUT /api/sla/settings/:id
router.put('/settings/:id', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { slaHours, escalateAfterHours, escalateToRole, isActive } = req.body;

    const existing = await queryOne<any>('SELECT * FROM sla_settings WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'SLA setting not found.' });
      return;
    }

    const hours = Number(slaHours) > 0 ? Number(slaHours) : existing.sla_hours;
    const escHours = Number(escalateAfterHours) > 0 ? Number(escalateAfterHours) : existing.escalate_after_hours;
    const escRole = escalateToRole ? String(escalateToRole).trim() : existing.escalate_to_role;
    const active = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;
    const now = new Date().toISOString();

    await execute(
      'UPDATE sla_settings SET sla_hours = ?, escalate_after_hours = ?, escalate_to_role = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [hours, escHours, escRole, active, now, id]
    );

    // Also update categories table sla_hours
    await execute(
      'UPDATE categories SET sla_hours = ? WHERE id = ?',
      [hours, existing.category_id]
    );

    res.status(200).json({
      message: 'SLA configuration updated successfully.',
      setting: {
        id,
        categoryName: existing.category_name,
        slaHours: hours,
        escalateAfterHours: escHours,
        escalateToRole: escRole,
        isActive: Boolean(active),
        updatedAt: now,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update SLA configuration.' });
  }
});

// PATCH /api/requests/:id/sla - Adjust request SLA deadline
router.patch('/requests/:id/sla', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const reqId = Number(req.params.id);
    const { slaDeadline, reason } = req.body;

    if (!slaDeadline || isNaN(Date.parse(slaDeadline))) {
      res.status(400).json({ error: 'Please provide a valid ISO date string for SLA deadline.' });
      return;
    }

    const current = await queryOne<any>('SELECT * FROM service_requests WHERE id = ?', [reqId]);
    if (!current) {
      res.status(404).json({ error: 'This service request was not found.' });
      return;
    }

    const now = new Date().toISOString();
    const isOverdue = new Date(slaDeadline).getTime() < Date.now() ? 1 : 0;

    await execute(
      'UPDATE service_requests SET sla_deadline = ?, is_overdue = ?, updated_at = ? WHERE id = ?',
      [slaDeadline, isOverdue, now, reqId]
    );

    // History record
    const reasonText = reason ? ` Reason: ${reason}` : '';
    await execute(
      'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
      [reqId, user.id, 'SLA Deadline Adjusted', `SLA deadline updated to ${slaDeadline}.${reasonText}`, now]
    );

    res.status(200).json({
      message: 'SLA deadline updated successfully.',
      slaDeadline,
      isOverdue: Boolean(isOverdue),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update SLA deadline.' });
  }
});

// POST /api/requests/:id/escalate - Escalate overdue or high-priority request
router.post('/requests/:id/escalate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const reqId = Number(req.params.id);
    const { reason } = req.body;

    const current = await queryOne<any>('SELECT * FROM service_requests WHERE id = ?', [reqId]);
    if (!current) {
      res.status(404).json({ error: 'This service request was not found.' });
      return;
    }

    const now = new Date().toISOString();
    const escalationReason = reason || 'Escalation triggered by operator due to critical operational urgency';

    await execute(
      'UPDATE service_requests SET escalated = 1, escalation_reason = ?, priority = ?, updated_at = ? WHERE id = ?',
      [escalationReason, current.priority === 'Low' ? 'High' : current.priority, now, reqId]
    );

    // History log
    await execute(
      'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
      [reqId, user.id, 'Escalated', `Request escalated: ${escalationReason}`, now]
    );

    // Notify Department Head & Admins
    await notifyAdminsAndDepts(
      current.department,
      'URGENT: Service Request Escalation',
      `Service request ${current.request_id} has been escalated by ${user.name}: "${escalationReason}"`,
      'escalation',
      `/requests/${reqId}`
    );

    res.status(200).json({
      message: 'Service request escalated successfully.',
      escalated: true,
      escalationReason,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to escalate service request.' });
  }
});

// POST /api/sla/scan - Scan and flag overdue requests
router.post('/scan', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await scanAndUpdateSla();
    res.status(200).json({
      message: 'SLA scan completed successfully.',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: 'SLA scan execution failed.' });
  }
});

export default router;
