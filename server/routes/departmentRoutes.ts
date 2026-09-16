import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

const router = Router();

// GET /api/departments
router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const rows = await queryAll<any>('SELECT * FROM departments ORDER BY name ASC');
    res.status(200).json({
      departments: rows.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description || '',
        headName: r.head_name || '',
        email: r.email || '',
        phone: r.phone || '',
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve departments.' });
  }
});

// POST /api/departments
router.post('/', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, description, headName, email, phone } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Department name is required (minimum 2 characters).' });
      return;
    }
    if (!code || typeof code !== 'string' || code.trim().length < 2) {
      res.status(400).json({ error: 'Department code is required (e.g. FAC, IT).' });
      return;
    }

    const existing = await queryOne('SELECT id FROM departments WHERE LOWER(code) = LOWER(?)', [code.trim()]);
    if (existing) {
      res.status(409).json({ error: 'A department with this code already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const result = await execute(
      'INSERT INTO departments (name, code, description, head_name, email, phone, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [name.trim(), code.trim().toUpperCase(), (description || '').trim(), (headName || '').trim(), (email || '').trim(), (phone || '').trim(), now]
    );

    res.status(201).json({
      message: 'Department created successfully.',
      department: {
        id: result.lastInsertRowid,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: (description || '').trim(),
        headName: (headName || '').trim(),
        email: (email || '').trim(),
        phone: (phone || '').trim(),
        isActive: true,
        createdAt: now,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create department.' });
  }
});

// PUT /api/departments/:id
router.put('/:id', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, code, description, headName, email, phone, isActive } = req.body;

    const existing = await queryOne<any>('SELECT * FROM departments WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    const newName = name ? String(name).trim() : existing.name;
    const newCode = code ? String(code).trim().toUpperCase() : existing.code;
    const newDesc = description !== undefined ? String(description).trim() : existing.description;
    const newHead = headName !== undefined ? String(headName).trim() : existing.head_name;
    const newEmail = email !== undefined ? String(email).trim() : existing.email;
    const newPhone = phone !== undefined ? String(phone).trim() : existing.phone;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    await execute(
      'UPDATE departments SET name = ?, code = ?, description = ?, head_name = ?, email = ?, phone = ?, is_active = ? WHERE id = ?',
      [newName, newCode, newDesc, newHead, newEmail, newPhone, newActive, id]
    );

    res.status(200).json({
      message: 'Department updated successfully.',
      department: {
        id,
        name: newName,
        code: newCode,
        description: newDesc,
        headName: newHead,
        email: newEmail,
        phone: newPhone,
        isActive: Boolean(newActive),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department.' });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne<any>('SELECT * FROM departments WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    // Safety: deactivate if requests exist
    const countCheck = await queryOne<{ total: number }>('SELECT COUNT(*) as total FROM service_requests WHERE department = ?', [existing.name]);
    if (countCheck && countCheck.total > 0) {
      await execute('UPDATE departments SET is_active = 0 WHERE id = ?', [id]);
      res.status(200).json({ message: 'Department has associated requests and has been deactivated safely.' });
      return;
    }

    await execute('DELETE FROM departments WHERE id = ?', [id]);
    res.status(200).json({ message: 'Department deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department.' });
  }
});

export default router;
