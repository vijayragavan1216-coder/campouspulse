import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { UserRole } from '../../src/types.js';

const router = Router();

// GET /api/users - List users (supports search and role filter)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, department, search } = req.query;
    let sql = 'SELECT id, name, email, role, department, phone, employee_id, hostel, bio, is_active, created_at, last_login FROM users WHERE 1=1';
    const params: any[] = [];

    if (role && typeof role === 'string' && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (department && typeof department === 'string' && department !== 'all') {
      sql += ' AND department = ?';
      params.push(department);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
      params.push(q, q, q);
    }

    sql += ' ORDER BY id ASC';

    const rows = await queryAll<any>(sql, params);
    res.status(200).json({
      users: rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role as UserRole,
        department: r.department,
        phone: r.phone || '',
        employeeId: r.employee_id || '',
        hostel: r.hostel || '',
        bio: r.bio || '',
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        lastLogin: r.last_login,
      })),
      count: rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const row = await queryOne<any>(
      'SELECT id, name, email, role, department, phone, employee_id, hostel, bio, is_active, created_at, last_login FROM users WHERE id = ?',
      [id]
    );

    if (!row) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as UserRole,
        department: row.department,
        phone: row.phone || '',
        employeeId: row.employee_id || '',
        hostel: row.hostel || '',
        bio: row.bio || '',
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        lastLogin: row.last_login,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

// PUT /api/users/:id - Update user profile or status
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const targetId = Number(req.params.id);

    const targetUser = await queryOne<any>('SELECT * FROM users WHERE id = ?', [targetId]);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isSelf = currentUser.id === targetId;
    const isAdmin = ['Administrator', 'Super Administrator'].includes(currentUser.role);
    const isSuperAdmin = currentUser.role === 'Super Administrator';

    if (!isSelf && !isAdmin) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }

    const { name, phone, department, employeeId, hostel, bio, role, isActive } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined && typeof name === 'string' && name.trim().length >= 2) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(String(phone).trim());
    }

    if (department !== undefined && typeof department === 'string') {
      updates.push('department = ?');
      params.push(department.trim());
    }

    if (employeeId !== undefined) {
      updates.push('employee_id = ?');
      params.push(String(employeeId).trim());
    }

    if (hostel !== undefined) {
      updates.push('hostel = ?');
      params.push(String(hostel).trim());
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(String(bio).trim());
    }

    // Role changes require Admin / Super Admin
    if (role !== undefined && role !== targetUser.role) {
      if (!isAdmin) {
        res.status(403).json({ error: 'You do not have permission to change user roles.' });
        return;
      }
      // Only Super Admin can promote/demote Administrators or Super Administrators
      if (['Administrator', 'Super Administrator'].includes(targetUser.role) && !isSuperAdmin) {
        res.status(403).json({ error: 'Only Super Administrators can manage Administrator roles.' });
        return;
      }
      updates.push('role = ?');
      params.push(role);
    }

    // Activation / Deactivation
    if (isActive !== undefined) {
      if (!isAdmin) {
        res.status(403).json({ error: 'You do not have permission to change user status.' });
        return;
      }

      // CRITICAL RULE: "Prevent administrators from deactivating themselves"
      if (isSelf && isActive === false) {
        res.status(400).json({ error: 'Administrators cannot deactivate their own account.' });
        return;
      }

      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update.' });
      return;
    }

    params.push(targetId);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await queryOne<any>('SELECT * FROM users WHERE id = ?', [targetId]);

    res.status(200).json({
      message: 'User profile updated successfully.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role as UserRole,
        department: updated.department,
        phone: updated.phone || '',
        employeeId: updated.employee_id || '',
        hostel: updated.hostel || '',
        bio: updated.bio || '',
        isActive: Boolean(updated.is_active),
        createdAt: updated.created_at,
        lastLogin: updated.last_login,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

export default router;
