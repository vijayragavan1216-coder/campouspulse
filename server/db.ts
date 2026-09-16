import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'campuspulse.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing SQLite database, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

function initSchema(db: Database): void {
  db.run('PRAGMA foreign_keys = ON;');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT,
      employee_id TEXT,
      hostel TEXT,
      bio TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      head_name TEXT,
      email TEXT,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      department TEXT NOT NULL,
      sla_hours INTEGER NOT NULL DEFAULT 24,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sla_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      category_name TEXT NOT NULL,
      sla_hours INTEGER NOT NULL,
      escalate_after_hours INTEGER NOT NULL,
      escalate_to_role TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      campus_location TEXT NOT NULL,
      building TEXT NOT NULL,
      room_number TEXT,
      priority TEXT NOT NULL,
      submitted_by INTEGER NOT NULL,
      assigned_staff_id INTEGER,
      status TEXT NOT NULL DEFAULT 'Submitted',
      sla_deadline TEXT NOT NULL,
      sla_hours INTEGER NOT NULL,
      is_overdue INTEGER NOT NULL DEFAULT 0,
      escalated INTEGER NOT NULL DEFAULT 0,
      escalation_reason TEXT,
      resolution_details TEXT,
      closed_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      changed_by INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id INTEGER NOT NULL,
      channel TEXT NOT NULL DEFAULT 'in_app',
      status TEXT NOT NULL DEFAULT 'delivered',
      delivered_at TEXT NOT NULL,
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_submitted_by ON service_requests(submitted_by);
    CREATE INDEX IF NOT EXISTS idx_requests_assigned ON service_requests(assigned_staff_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);

  seedDefaultData(db);
}

function seedDefaultData(db: Database): void {
  // Check if users already seeded
  const userCheck = db.exec('SELECT COUNT(*) as count FROM users');
  const count = userCheck.length > 0 ? (userCheck[0].values[0][0] as number) : 0;
  if (count > 0) {
    return; // Already initialized
  }

  const now = new Date().toISOString();
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Seed Departments
  const departments = [
    { name: 'Facilities & Maintenance', code: 'FAC', desc: 'Campus buildings, utilities, physical plant and repairs' },
    { name: 'Information Technology', code: 'IT', desc: 'Campus networks, lab computers, Wi-Fi, AV systems' },
    { name: 'Campus Safety & Security', code: 'SEC', desc: 'Emergency response, perimeter patrol, ID access' },
    { name: 'Student Housing & Residential Life', code: 'RES', desc: 'Hostels, dormitories, dining halls and room allocation' },
    { name: 'Campus Transportation', code: 'TRANS', desc: 'Campus shuttles, transit passes, vehicle parking' },
    { name: 'Computer Science', code: 'CS', desc: 'Academic CS department labs and classrooms' },
    { name: 'Electrical Engineering', code: 'EE', desc: 'Academic EE labs and research equipment' },
    { name: 'Administration & Operations', code: 'ADMIN', desc: 'Executive leadership, registrar, student services' },
    { name: 'Executive Board', code: 'EXEC', desc: 'Principal, Vice Principal, Dean offices' },
  ];

  for (const d of departments) {
    db.run(
      'INSERT INTO departments (name, code, description, head_name, email, phone, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [d.name, d.code, d.desc, 'Dept Coordinator', `${d.code.toLowerCase()}@campuspulse.edu`, '555-0100', now]
    );
  }

  // 2. Seed Categories with SLA hours
  const categories = [
    { name: 'Electrical', dept: 'Facilities & Maintenance', sla: 12, desc: 'Lighting, power outlets, wiring, circuit breakers' },
    { name: 'Plumbing', dept: 'Facilities & Maintenance', sla: 12, desc: 'Restroom leaks, pipe clogs, water pressure, drainage' },
    { name: 'Internet', dept: 'Information Technology', sla: 8, desc: 'Hostel Wi-Fi, Ethernet jacks, hotspot coverage' },
    { name: 'Cleanliness', dept: 'Facilities & Maintenance', sla: 6, desc: 'Waste management, corridor sanitation, washroom upkeep' },
    { name: 'Hostel', dept: 'Student Housing & Residential Life', sla: 12, desc: 'Dorm room fixtures, bedframes, window latches' },
    { name: 'Classroom', dept: 'Facilities & Maintenance', sla: 8, desc: 'Smartboards, projectors, HVAC, lecture hall desks' },
    { name: 'Security', dept: 'Campus Safety & Security', sla: 4, desc: 'Keycard reader issues, lighting hazards, emergency intercoms' },
    { name: 'Transport', dept: 'Campus Transportation', sla: 24, desc: 'Shuttle schedules, bus passes, parking bay access' },
    { name: 'Furniture', dept: 'Facilities & Maintenance', sla: 24, desc: 'Damaged chairs, tables, storage lockers' },
    { name: 'Laboratory', dept: 'Information Technology', sla: 12, desc: 'Lab workbenches, equipment calibration, ventilation' },
    { name: 'Library', dept: 'Administration & Operations', sla: 24, desc: 'Reading room acoustics, book scanner stations' },
    { name: 'Medical', dept: 'Administration & Operations', sla: 2, desc: 'Health center triage, first-aid dispensary replenishment' },
    { name: 'Cafeteria', dept: 'Student Housing & Residential Life', sla: 8, desc: 'Dining hall cleanliness, food service hygiene' },
    { name: 'Other', dept: 'Administration & Operations', sla: 24, desc: 'General campus inquiries and non-standard requests' },
  ];

  for (const c of categories) {
    db.run(
      'INSERT INTO categories (name, description, department, sla_hours, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [c.name, c.desc, c.dept, c.sla, now]
    );

    const catId = (db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number);
    db.run(
      'INSERT INTO sla_settings (category_id, category_name, sla_hours, escalate_after_hours, escalate_to_role, is_active, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [catId, c.name, c.sla, Math.max(2, Math.round(c.sla * 0.75)), 'Administrator', now]
    );
  }

  // 3. Seed Users across all roles
  const seedUsers = [
    { name: 'Alex Student', email: 'student@campuspulse.edu', role: 'Student', dept: 'Computer Science', id: 'STU-2024-8891', hostel: 'Block B - Room 304' },
    { name: 'Prof. Sarah Jenkins', email: 'faculty@campuspulse.edu', role: 'Faculty', dept: 'Electrical Engineering', id: 'FAC-1042', hostel: '' },
    { name: 'Marcus Staff', email: 'staff@campuspulse.edu', role: 'Staff', dept: 'Administration & Operations', id: 'STF-5521', hostel: '' },
    { name: 'Dave Fixit', email: 'maintenance@campuspulse.edu', role: 'Maintenance Staff', dept: 'Facilities & Maintenance', id: 'MNT-3011', hostel: '' },
    { name: 'Dr. Robert Torres', email: 'depthead@campuspulse.edu', role: 'Department Head', dept: 'Facilities & Maintenance', id: 'DHD-9082', hostel: '' },
    { name: 'Elena Admin', email: 'admin@campuspulse.edu', role: 'Administrator', dept: 'Campus Operations', id: 'ADM-0044', hostel: '' },
    { name: 'Super Admin Jordan', email: 'superadmin@campuspulse.edu', role: 'Super Administrator', dept: 'Campus Operations', id: 'SAD-0001', hostel: '' },
    { name: 'Principal Arthur Vance', email: 'principal@campuspulse.edu', role: 'Principal', dept: 'Executive Board', id: 'PRN-0001', hostel: '' },
    { name: 'VP Catherine Morales', email: 'viceprincipal@campuspulse.edu', role: 'Vice Principal', dept: 'Executive Board', id: 'VPR-0002', hostel: '' },
  ];

  for (const u of seedUsers) {
    db.run(
      `INSERT INTO users (name, email, password_hash, role, department, phone, employee_id, hostel, bio, is_active, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, '555-0199', ?, ?, 'CampusPulse verified campus member.', 1, ?, ?)`,
      [u.name, u.email, defaultPasswordHash, u.role, u.dept, u.id, u.hostel, now, now]
    );
  }

  // 4. Seed Initial Service Requests for realistic immediate preview
  const sampleRequests = [
    {
      reqId: 'CP-2026-001',
      title: 'Hostel B 3rd Floor Wi-Fi Access Point Offline',
      desc: 'The Wi-Fi access point near room 304 has been dropping connections since yesterday evening. Over 15 students unable to submit assignments.',
      category: 'Internet',
      dept: 'Information Technology',
      loc: 'North Campus',
      bldg: 'Hostel Block B',
      room: 'Corridor 3rd Floor',
      priority: 'High',
      submittedBy: 1, // Alex Student
      assignedTo: 4, // Dave Fixit
      status: 'In Progress',
      slaHours: 8,
      hoursAgoCreated: 4,
      overdue: 0,
      escalated: 0,
    },
    {
      reqId: 'CP-2026-002',
      title: 'Water pipe leaking under washroom sink in Science Complex',
      desc: 'Continuous water drip underneath the 2nd floor sink. Water accumulating on tile floor creating a slip and fall hazard.',
      category: 'Plumbing',
      dept: 'Facilities & Maintenance',
      loc: 'Central Academic Quad',
      bldg: 'Science Complex A',
      room: '202 Washroom',
      priority: 'Medium',
      submittedBy: 1,
      assignedTo: 4,
      status: 'Assigned',
      slaHours: 12,
      hoursAgoCreated: 2,
      overdue: 0,
      escalated: 0,
    },
    {
      reqId: 'CP-2026-003',
      title: 'Main Auditorium Projector Bulb Blinking and Shuts Down',
      desc: 'Auditorium central digital projector shuts down after 5 minutes of operation with a thermal warning indicator.',
      category: 'Classroom',
      dept: 'Facilities & Maintenance',
      loc: 'Main Campus',
      bldg: 'University Hall',
      room: 'Main Auditorium',
      priority: 'Emergency',
      submittedBy: 2, // Faculty
      assignedTo: null,
      status: 'Under Review',
      slaHours: 4,
      hoursAgoCreated: 5,
      overdue: 1,
      escalated: 1,
    },
    {
      reqId: 'CP-2026-004',
      title: 'Library 4th Floor Study Room AC Thermostat Broken',
      desc: 'Thermostat dial is jammed at 16°C and fan makes a loud clicking noise interfering with study.',
      category: 'Electrical',
      dept: 'Facilities & Maintenance',
      loc: 'East Wing',
      bldg: 'Central Memorial Library',
      room: 'Study Room 412',
      priority: 'Low',
      submittedBy: 1,
      assignedTo: 4,
      status: 'Resolved',
      slaHours: 24,
      hoursAgoCreated: 30,
      overdue: 0,
      escalated: 0,
      resolution: 'Replaced faulty digital thermostat sensor and lubricated the blower bearing assembly.',
    },
  ];

  for (const s of sampleRequests) {
    const createdDate = new Date(Date.now() - s.hoursAgoCreated * 3600 * 1000).toISOString();
    const slaDeadline = new Date(new Date(createdDate).getTime() + s.slaHours * 3600 * 1000).toISOString();

    db.run(
      `INSERT INTO service_requests (
        request_id, title, description, category, department, campus_location,
        building, room_number, priority, submitted_by, assigned_staff_id,
        status, sla_deadline, sla_hours, is_overdue, escalated, escalation_reason,
        resolution_details, closed_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.reqId, s.title, s.desc, s.category, s.dept, s.loc,
        s.bldg, s.room, s.priority, s.submittedBy, s.assignedTo,
        s.status, slaDeadline, s.slaHours, s.overdue, s.escalated,
        s.escalated ? 'SLA threshold exceeded for emergency request' : null,
        s.resolution || null, s.status === 'Closed' ? now : null, createdDate, now
      ]
    );

    const reqRowId = (db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number);
    db.run(
      'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
      [reqRowId, s.submittedBy, 'Created', 'Service request initiated into system.', createdDate]
    );

    if (s.assignedTo) {
      db.run(
        'INSERT INTO request_history (request_id, changed_by, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
        [reqRowId, 5, 'Assigned', `Assigned to maintenance personnel Dave Fixit`, createdDate]
      );
    }
  }

  // 5. Seed Welcome Notifications
  db.run(
    `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [1, 'Welcome to CampusPulse', 'Your account has been activated. You can now submit service requests and track complaints in real time.', 'new_request', '/requests', now]
  );
  db.run(
    `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [1, 'Request Updated', 'Your request CP-2026-001 has been assigned to Dave Fixit and is now In Progress.', 'status_update', '/requests/1', now]
  );

  console.log('CampusPulse database schema and seed data initialized successfully.');
}

// Database helper functions
export async function queryAll<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export async function queryOne<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
  const results = await queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sql: string, params: SqlValue[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
  const db = await getDb();
  db.run(sql, params);
  const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
  const lastInsertRowid = lastIdResult.length > 0 ? (lastIdResult[0].values[0][0] as number) : 0;
  saveDb();
  return { lastInsertRowid, changes: 1 };
}
