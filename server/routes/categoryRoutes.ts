import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

const router = Router();

// GET /api/categories
router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const rows = await queryAll<any>('SELECT * FROM categories ORDER BY name ASC');
    res.status(200).json({
      categories: rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        department: r.department,
        slaHours: r.sla_hours,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const row = await queryOne<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!row) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    res.status(200).json({
      category: {
        id: row.id,
        name: row.name,
        description: row.description || '',
        department: row.department,
        slaHours: row.sla_hours,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve category.' });
  }
});

// POST /api/categories
router.post('/', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, department, slaHours } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Category name is required (min 2 characters).' });
      return;
    }
    if (!department || typeof department !== 'string' || !department.trim()) {
      res.status(400).json({ error: 'Department is required for category.' });
      return;
    }

    const hours = Number(slaHours) > 0 ? Number(slaHours) : 24;
    const now = new Date().toISOString();

    const existing = await queryOne('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing) {
      res.status(409).json({ error: 'A category with this name already exists.' });
      return;
    }

    const result = await execute(
      'INSERT INTO categories (name, description, department, sla_hours, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [name.trim(), (description || '').trim(), department.trim(), hours, now]
    );

    // Also insert into sla_settings
    await execute(
      'INSERT INTO sla_settings (category_id, category_name, sla_hours, escalate_after_hours, escalate_to_role, is_active, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [result.lastInsertRowid, name.trim(), hours, Math.max(2, Math.round(hours * 0.75)), 'Administrator', now]
    );

    res.status(201).json({
      message: 'Category created successfully.',
      category: {
        id: result.lastInsertRowid,
        name: name.trim(),
        description: (description || '').trim(),
        department: department.trim(),
        slaHours: hours,
        isActive: true,
        createdAt: now,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id
router.put('/:id', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, description, department, slaHours, isActive } = req.body;

    const existing = await queryOne<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const newName = name ? String(name).trim() : existing.name;
    const newDesc = description !== undefined ? String(description).trim() : existing.description;
    const newDept = department ? String(department).trim() : existing.department;
    const newSla = slaHours !== undefined && Number(slaHours) > 0 ? Number(slaHours) : existing.sla_hours;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;

    await execute(
      'UPDATE categories SET name = ?, description = ?, department = ?, sla_hours = ?, is_active = ? WHERE id = ?',
      [newName, newDesc, newDept, newSla, newActive, id]
    );

    // Sync SLA settings
    await execute(
      'UPDATE sla_settings SET category_name = ?, sla_hours = ?, is_active = ?, updated_at = ? WHERE category_id = ?',
      [newName, newSla, newActive, new Date().toISOString(), id]
    );

    res.status(200).json({
      message: 'Category updated successfully.',
      category: {
        id,
        name: newName,
        description: newDesc,
        department: newDept,
        slaHours: newSla,
        isActive: Boolean(newActive),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', requireAuth, requireRole(['Administrator', 'Super Administrator']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    // Check if requests are using this category
    const countCheck = await queryOne<{ total: number }>('SELECT COUNT(*) as total FROM service_requests WHERE category = ?', [existing.name]);
    if (countCheck && countCheck.total > 0) {
      // Deactivate instead of hard delete when requests exist to preserve data integrity
      await execute('UPDATE categories SET is_active = 0 WHERE id = ?', [id]);
      res.status(200).json({ message: 'Category has active requests associated. It has been deactivated safely.' });
      return;
    }

    await execute('DELETE FROM categories WHERE id = ?', [id]);
    await execute('DELETE FROM sla_settings WHERE category_id = ?', [id]);
    res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

export default router;
