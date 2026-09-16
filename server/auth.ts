import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne } from './db.js';
import { UserRole } from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'campuspulse-secret-key-2026-auth-session';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  employee_id?: string;
  hostel?: string;
  is_active: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  // 1. From Authorization Header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.campuspulse_token) {
    // 2. From Cookie
    token = req.cookies.campuspulse_token;
  }

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    const user = await queryOne<AuthUser>(
      'SELECT id, name, email, role, department, employee_id, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Invalid/expired token - leave req.user undefined
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Please log in to perform this action.' });
    return;
  }
  if (!req.user.is_active) {
    res.status(403).json({ error: 'Your account is inactive.' });
    return;
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Please log in to perform this action.' });
      return;
    }
    if (!req.user.is_active) {
      res.status(403).json({ error: 'Your account is inactive.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}
