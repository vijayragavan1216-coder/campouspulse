import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.js';
import { authMiddleware } from './server/auth.js';

// Route imports
import authRoutes from './server/routes/authRoutes.js';
import requestRoutes from './server/routes/requestRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import departmentRoutes from './server/routes/departmentRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import attachmentRoutes from './server/routes/attachmentRoutes.js';
import slaRoutes from './server/routes/slaRoutes.js';
import reportRoutes from './server/routes/reportRoutes.js';
import assistantRoutes from './server/routes/assistantRoutes.js';

async function startServer() {
  const app = express();

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Initialize SQLite database
  await getDb();

  // Middleware
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());
  app.use(authMiddleware);

  // Serve static uploaded attachments
  app.use('/uploads', express.static(uploadsDir));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      app: 'CampusPulse',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api', attachmentRoutes);
  app.use('/api/sla', slaRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/assistant', assistantRoutes);

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Cloud Run / Container Port binding
  const port = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 8080 : 3000));
  app.listen(port, '0.0.0.0', () => {
    console.log(`CampusPulse server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: Failed to start CampusPulse server:', err);
  process.exit(1);
});
