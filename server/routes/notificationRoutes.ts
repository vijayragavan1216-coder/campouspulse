import { Router, Response } from 'express';
import { queryAll, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const rows = await queryAll<any>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50',
      [user.id]
    );

    const unreadCount = rows.filter(r => !r.is_read).length;

    res.status(200).json({
      notifications: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        type: r.type,
        isRead: Boolean(r.is_read),
        link: r.link || '',
        createdAt: r.created_at,
      })),
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const idParam = req.params.id;

    if (idParam === 'all') {
      await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.id]);
      res.status(200).json({ message: 'All notifications marked as read.' });
      return;
    }

    const id = Number(idParam);
    if (!id || id <= 0) {
      res.status(400).json({ error: 'Invalid ID parameter.' });
      return;
    }

    await execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, user.id]);
    res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification status.' });
  }
});

export default router;
