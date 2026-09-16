import { execute, queryAll } from './db.js';

export interface CreateNotificationParams {
  userId: number;
  title: string;
  message: string;
  type:
    | 'new_request'
    | 'assignment'
    | 'status_update'
    | 'resolution'
    | 'closure'
    | 'rejection'
    | 'attachment'
    | 'overdue'
    | 'escalation'
    | 'profile_update';
  link?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<number> {
  const now = new Date().toISOString();
  const res = await execute(
    `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [params.userId, params.title, params.message, params.type, params.link || null, now]
  );

  // Track delivery
  await execute(
    `INSERT INTO notification_deliveries (notification_id, channel, status, delivered_at)
     VALUES (?, 'in_app', 'delivered', ?)`,
    [res.lastInsertRowid, now]
  );

  return res.lastInsertRowid;
}

export async function notifyAdminsAndDepts(departmentName: string, title: string, message: string, type: any, link: string): Promise<void> {
  // Find department heads and admins
  const recipients = await queryAll<{ id: number }>(`
    SELECT id FROM users
    WHERE (role IN ('Administrator', 'Super Administrator')
       OR (role = 'Department Head' AND department = ?))
      AND is_active = 1
  `, [departmentName]);

  for (const r of recipients) {
    await createNotification({
      userId: r.id,
      title,
      message,
      type,
      link,
    });
  }
}
