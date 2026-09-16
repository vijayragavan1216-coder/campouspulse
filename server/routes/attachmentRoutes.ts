import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { queryAll, queryOne, execute } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { createNotification } from '../notifications.js';

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
    if (allowedMimes.includes(file.mimetype) || validExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('This file type is not supported.'));
    }
  },
});

// POST /api/requests/:id/attachments
router.post('/requests/:id/attachments', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'This file is too large. Maximum size is 10MB.' });
        return;
      }
      res.status(400).json({ error: err.message || 'File upload failed.' });
      return;
    }

    try {
      const user = req.user!;
      const requestId = Number(req.params.id);

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded.' });
        return;
      }

      const reqRow = await queryOne<any>('SELECT * FROM service_requests WHERE id = ?', [requestId]);
      if (!reqRow) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'This service request was not found.' });
        return;
      }

      // Check permission: owner, assigned staff, admin
      const isOwner = reqRow.submitted_by === user.id;
      const isAssigned = reqRow.assigned_staff_id === user.id;
      const isAdmin = ['Administrator', 'Super Administrator', 'Department Head'].includes(user.role);

      if (!isOwner && !isAssigned && !isAdmin) {
        fs.unlinkSync(req.file.path);
        res.status(403).json({ error: 'You do not have permission to perform this action.' });
        return;
      }

      const now = new Date().toISOString();
      const relativePath = `/uploads/${path.basename(req.file.path)}`;

      const insertRes = await execute(
        `INSERT INTO attachments (request_id, file_name, file_type, file_size, file_path, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [requestId, req.file.originalname, req.file.mimetype, req.file.size, relativePath, user.id, now]
      );

      // Log to history
      await execute(
        'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
        [requestId, user.id, 'Attachment Added', `Uploaded file "${req.file.originalname}" (${Math.round(req.file.size / 1024)} KB).`, now]
      );

      // Notify party
      if (reqRow.submitted_by !== user.id) {
        await createNotification({
          userId: reqRow.submitted_by,
          title: 'New Evidence / Attachment Uploaded',
          message: `${user.name} uploaded "${req.file.originalname}" to your request ${reqRow.request_id}.`,
          type: 'attachment',
          link: `/requests/${requestId}`,
        });
      }

      res.status(201).json({
        message: 'Attachment uploaded successfully.',
        attachment: {
          id: insertRes.lastInsertRowid,
          requestId,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          filePath: relativePath,
          uploadedBy: user.id,
          uploadedByName: user.name,
          createdAt: now,
        },
      });
    } catch (dbErr) {
      console.error('Save attachment error:', dbErr);
      res.status(500).json({ error: 'Failed to record attachment metadata.' });
    }
  });
});

// GET /api/requests/:id/attachments
router.get('/requests/:id/attachments', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requestId = Number(req.params.id);
    const rows = await queryAll<any>(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.request_id = ?
      ORDER BY a.id ASC
    `, [requestId]);

    res.status(200).json({
      attachments: rows.map(r => ({
        id: r.id,
        requestId: r.request_id,
        fileName: r.file_name,
        fileType: r.file_type,
        fileSize: r.file_size,
        filePath: r.file_path,
        uploadedBy: r.uploaded_by,
        uploadedByName: r.uploaded_by_name || 'User',
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve attachments.' });
  }
});

// DELETE /api/attachments/:id
router.delete('/attachments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const attId = Number(req.params.id);

    const att = await queryOne<any>('SELECT * FROM attachments WHERE id = ?', [attId]);
    if (!att) {
      res.status(404).json({ error: 'Attachment not found.' });
      return;
    }

    const isAdmin = ['Administrator', 'Super Administrator'].includes(user.role);
    const isUploader = att.uploaded_by === user.id;

    if (!isAdmin && !isUploader) {
      res.status(403).json({ error: 'You do not have permission to delete this attachment.' });
      return;
    }

    // Try deleting file on disk
    const diskPath = path.join(process.cwd(), att.file_path);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (e) {
        // ignore disk deletion failure
      }
    }

    await execute('DELETE FROM attachments WHERE id = ?', [attId]);
    res.status(200).json({ message: 'Attachment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete attachment.' });
  }
});

export default router;
