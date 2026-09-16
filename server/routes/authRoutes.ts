import { Router, Response } from 'express';
import { queryOne, execute } from '../db.js';
import { validateEmail, validatePassword } from '../validation.js';
import { hashPassword, comparePassword, generateToken, AuthenticatedRequest, requireAuth } from '../auth.js';
import { UserRole } from '../../src/types.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, confirmPassword, role, department, phone, employeeId, hostel, bio } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const passVal = validatePassword(password);
    if (!passVal.valid) {
      res.status(400).json({ error: passVal.message });
      return;
    }

    const validRoles: UserRole[] = [
      'Student',
      'Faculty',
      'Staff',
      'Maintenance Staff',
      'Department Head',
      'Administrator',
      'Super Administrator',
      'Principal',
      'Vice Principal'
    ];
    const userRole: UserRole = validRoles.includes(role) ? role : 'Student';
    const userDept = (department && typeof department === 'string') ? department.trim() : 'General Campus';

    // Check duplicate email
    const existing = await queryOne<{ id: number }>('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing) {
      res.status(409).json({ error: 'This email is already registered.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const insertRes = await execute(
      `INSERT INTO users (name, email, password_hash, role, department, phone, employee_id, hostel, bio, is_active, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        userRole,
        userDept,
        phone ? String(phone).trim() : '',
        employeeId ? String(employeeId).trim() : '',
        hostel ? String(hostel).trim() : '',
        bio ? String(bio).trim() : 'CampusPulse member',
        now,
        now
      ]
    );

    const newUser = {
      id: insertRes.lastInsertRowid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: userRole,
      department: userDept,
      employeeId: employeeId || '',
      phone: phone || '',
      hostel: hostel || '',
      bio: bio || '',
      isActive: true,
      createdAt: now,
      lastLogin: now,
    };

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    res.cookie('campuspulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Registration completed successfully.',
      user: newUser,
      token,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during registration. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = await queryOne<{
      id: number;
      name: string;
      email: string;
      password_hash: string;
      role: UserRole;
      department: string;
      phone: string;
      employee_id: string;
      hostel: string;
      bio: string;
      is_active: number;
      created_at: string;
    }>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [String(email).trim()]);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const match = comparePassword(String(password), user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Your account is inactive.' });
      return;
    }

    const now = new Date().toISOString();
    await execute('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.cookie('campuspulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        employeeId: user.employee_id,
        hostel: user.hostel,
        bio: user.bio,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
        lastLogin: now,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during login. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: AuthenticatedRequest, res: Response): void => {
  res.clearCookie('campuspulse_token');
  res.status(200).json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await queryOne<{
      id: number;
      name: string;
      email: string;
      role: UserRole;
      department: string;
      phone: string;
      employee_id: string;
      hostel: string;
      bio: string;
      is_active: number;
      created_at: string;
      last_login: string;
    }>('SELECT id, name, email, role, department, phone, employee_id, hostel, bio, is_active, created_at, last_login FROM users WHERE id = ?', [req.user!.id]);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        employeeId: user.employee_id,
        hostel: user.hostel,
        bio: user.bio,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve session user.' });
  }
});

export default router;
