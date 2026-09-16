import { execute, queryAll, queryOne } from './db.js';
import { createNotification } from './notifications.js';

export async function calculateSlaHours(categoryName: string, priority: string): Promise<number> {
  const cat = await queryOne<{ sla_hours: number }>(
    'SELECT sla_hours FROM categories WHERE name = ? AND is_active = 1',
    [categoryName]
  );
  let baseHours = cat ? cat.sla_hours : 24;

  switch (priority) {
    case 'Emergency':
      return Math.max(2, Math.round(baseHours * 0.25));
    case 'High':
      return Math.max(4, Math.round(baseHours * 0.75));
    case 'Low':
      return Math.round(baseHours * 1.25);
    case 'Medium':
    default:
      return baseHours;
  }
}

export function calculateDeadline(slaHours: number, fromDate: Date = new Date()): string {
  return new Date(fromDate.getTime() + slaHours * 3600 * 1000).toISOString();
}

export async function scanAndUpdateSla(): Promise<{ scanned: number; newlyOverdue: number; escalatedCount: number }> {
  const now = new Date().toISOString();

  // Find all active requests past deadline that aren't marked overdue yet
  const openRequests = await queryAll<{
    id: number;
    request_id: string;
    title: string;
    sla_deadline: string;
    status: string;
    is_overdue: number;
    escalated: number;
    assigned_staff_id: number | null;
    submitted_by: number;
  }>(`
    SELECT id, request_id, title, sla_deadline, status, is_overdue, escalated, assigned_staff_id, submitted_by
    FROM service_requests
    WHERE status NOT IN ('Resolved', 'Closed', 'Rejected')
  `);

  let newlyOverdue = 0;
  let escalatedCount = 0;

  for (const req of openRequests) {
    const isPastDeadline = new Date(req.sla_deadline).getTime() < Date.now();

    if (isPastDeadline && req.is_overdue === 0) {
      newlyOverdue++;
      await execute(
        'UPDATE service_requests SET is_overdue = 1, updated_at = ? WHERE id = ?',
        [now, req.id]
      );

      // Log to history
      await execute(
        'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
        [req.id, 0, 'Overdue Alert', `SLA deadline expired on ${req.sla_deadline}. Request flagged as overdue.`, now]
      );

      // Notify assigned staff if exists
      if (req.assigned_staff_id) {
        await createNotification({
          userId: req.assigned_staff_id,
          title: 'SLA Overdue Warning',
          message: `Request ${req.request_id} ("${req.title}") has breached its SLA target. Immediate action required.`,
          type: 'overdue',
          link: `/requests/${req.id}`,
        });
      }

      // Notify administrators
      const admins = await queryAll<{ id: number }>(
        "SELECT id FROM users WHERE role IN ('Administrator', 'Super Administrator') AND is_active = 1"
      );
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: 'Overdue Incident Escalation Alert',
          message: `Service request ${req.request_id} ("${req.title}") is overdue.`,
          type: 'overdue',
          link: `/requests/${req.id}`,
        });
      }
    }
  }

  return { scanned: openRequests.length, newlyOverdue, escalatedCount };
}
