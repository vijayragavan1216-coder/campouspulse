# CampusPulse: Real-Time Student Service & Complaint Management System

**CampusPulse** is an enterprise-grade, full-stack campus operations and service ticket management platform. It streamlines incident reporting, automated Service Level Agreement (SLA) tracking, role-based workflows, evidence attachment handling, and AI-assisted triage across all collegiate departments.

---

## 🚀 Key Features

### 1. Multi-Role Campus Architecture (RBAC)
- **Role-tailored interfaces**: Dedicated dashboards and views for **Students**, **Faculty**, **Staff**, **Maintenance Staff**, **Department Heads**, **Administrators**, and **Executive Leadership** (Principal / Vice Principal).
- **Secure Authentication**: JWT session handling stored via HTTP-only cookies and bearer tokens with salted `bcryptjs` password hashing.
- **Instant Role Switcher**: Quick one-click demo login buttons directly on the sign-in page to evaluate workflows from any stakeholder's perspective without manual credential entry.

### 2. Service Request & Incident Lifecycle
- **Dynamic ID Generation**: Auto-formatted incident tickets (e.g. `CP-2026-0001`).
- **Comprehensive Lifecycle States**:
  - `Submitted` ➔ `Under Review` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` ➔ `Closed` (or `Rejected`).
- **Granular Campus Metadata**: Captures Campus Location, Department, Building, Room Number, Priority, Category, and Detailed Descriptions.
- **Evidence Attachments**: Upload photos, diagnostic screenshots, or document reports (PDF, PNG, JPG, DOCX up to 10MB) with preview and download controls.
- **Auditable Action History**: Every state change, assignment, priority escalation, or note is timestamped and recorded in the audit log.

### 3. Service Level Agreements (SLA) & Automated Breach Engine
- **Category Baseline SLA**: Configurable resolution timeframes by category (e.g., Electrical 12h, Plumbing 12h, Internet 8h, Security 4h, Medical 2h).
- **Priority-Based Dynamic Scaling**:
  - **Emergency**: 0.25× base SLA duration (immediate escalation)
  - **High**: 0.75× base SLA duration
  - **Medium**: 1.0× standard baseline
  - **Low**: 1.25× standard baseline
- **Background SLA Scanner**: Continuously monitors open requests, updates `isOverdue` status flags, and issues automated breach notifications.
- **Administrative Override**: Admins and Department Heads can adjust SLA deadlines with required audit justification.

### 4. Pulse Assistant (AI Operational Copilot)
- **AI-Guided Incident Drafting**: Powered by the Gemini API (`@google/genai` with `gemini-2.5-flash`), with an automated fallback rules engine.
- **Intelligent Classification**: Analyzes natural language complaints (e.g., *"faucet spraying water in chem lab 204"*), assigns the correct Department (`Facilities & Maintenance`), Category (`Plumbing`), and Priority (`High`).
- **One-Click Draft Transfer**: Formulates clean incident drafts that users can transfer directly to the submission form with a single click.
- **Safety First**: The AI assistant drafts suggestions and explains policies; it never submits or alters records without explicit human confirmation.

### 5. Centralized Notifications & Communication
- **Real-Time Notification Bell**: Unread badges and instant drop-down feed.
- **Event-Driven Alerts**: Dispatches notifications for new assignments, technician updates, SLA breach warnings, and resolution notices.
- **Direct Deep-Linking**: Clicking a notification opens the relevant service ticket.

### 6. Campus Analytics & Administration
- **Visual Analytics**: Interactive Recharts data visualizations showing category distribution, resolution compliance rates, and departmental workloads.
- **Management Consoles**: Full administrative CRUD interfaces for:
  - **User Accounts**: Role assignments, contact records, active status toggles.
  - **Departments**: Code schemes, head coordinators, contact channels.
  - **Service Categories & SLA Rules**: Escalation thresholds and assigned resolution windows.
- **Printable Reports**: Generates formal incident metrics and operational summaries ready for campus governance review.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| **Icons & Animations** | `lucide-react`, `motion` |
| **Data Visualization** | `recharts` |
| **Backend** | Express.js, TypeScript (running via `tsx` in dev, `esbuild` bundled in production) |
| **Database** | Persistent relational SQL database (`sql.js` / SQLite engine) with auto-seeding |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser` |
| **File Storage** | `multer` multipart handling with server-side validation |
| **AI Integration** | Google Gen AI SDK (`@google/genai`) |

---

## 👥 Demo Accounts (Instant Testing)

Use the 1-click login buttons on the login screen or sign in with any of the accounts below:

| Role | Name | Email | Password |
|---|---|---|---|
| **Student** | Alex Student | `student@campuspulse.edu` | `Password123!` |
| **Maintenance Staff** | Dave Fixit | `maintenance@campuspulse.edu` | `Password123!` |
| **Department Head** | Dr. Robert Torres | `depthead@campuspulse.edu` | `Password123!` |
| **Administrator** | Elena Admin | `admin@campuspulse.edu` | `Password123!` |
| **Super Administrator**| Jordan Super | `superadmin@campuspulse.edu` | `Password123!` |
| **Principal** | Principal Vance | `principal@campuspulse.edu` | `Password123!` |
| **Faculty** | Prof. Sarah Jenkins | `faculty@campuspulse.edu` | `Password123!` |

---

## 📁 Project Structure

```
campuspulse/
├── src/
│   ├── components/            # Reusable UI widgets (Sidebar, TopNavbar, etc.)
│   ├── context/               # AuthContext and NotificationContext providers
│   ├── pages/                 # Full application views:
│   │   ├── DashboardPage.tsx          # Analytics, quick actions, and open items
│   │   ├── RequestListPage.tsx        # Search, filter, and ticket roster
│   │   ├── SubmitRequestPage.tsx      # Multi-field incident filing with SLA calculator
│   │   ├── RequestDetailsPage.tsx     # Ticket detail, status transitions & audit trail
│   │   ├── AssistantPage.tsx          # Pulse Assistant AI conversational interface
│   │   ├── NotificationsPage.tsx      # Full alert management
│   │   ├── ProfilePage.tsx            # Personal profile and contact updates
│   │   ├── AdminDashboardPage.tsx     # Operations hub & high-level stats
│   │   ├── UserManagementPage.tsx     # User records & role administration
│   │   ├── DepartmentManagementPage.tsx # Department directory
│   │   ├── CategoryManagementPage.tsx # Categories & service types
│   │   ├── SlaManagementPage.tsx      # SLA targets & escalation matrices
│   │   └── ReportsPage.tsx            # Operational analytics & printable reports
│   ├── types.ts               # Shared TypeScript data models and interfaces
│   ├── App.tsx                # Master layout, view routing, and state providers
│   ├── main.tsx               # Client entry point
│   └── index.css              # Tailwind CSS styles
├── server/
│   ├── routes/                # Express REST API endpoints:
│   │   ├── authRoutes.ts              # Login, register, demo user switch, me
│   │   ├── requestRoutes.ts           # Service requests CRUD, status changes, history
│   │   ├── assistantRoutes.ts         # Pulse Assistant AI conversational endpoint
│   │   ├── notificationRoutes.ts      # Alerts and notification feeds
│   │   ├── adminRoutes.ts             # Users, departments, categories, SLAs
│   │   └── reportRoutes.ts            # Analytics reports and summary metrics
│   ├── assistant.ts           # Gemini API client & intelligent fallback engine
│   ├── auth.ts                # JWT authentication middleware & password hashing
│   ├── db.ts                  # Relational SQL schema, auto-migration & initial seed data
│   └── slaScanner.ts          # SLA tracking engine & breach detection daemon
├── server.ts                  # Backend server entry point (Express + Vite middleware)
├── metadata.json              # Platform application manifest & capabilities
└── package.json               # Dependencies and build scripts
```

---

## 🔌 API Reference Overview

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Authenticate with email & password
- `POST /api/auth/register` - Create a student or staff account
- `POST /api/auth/logout` - Clear session cookies
- `GET /api/auth/me` - Retrieve current session user profile
- `POST /api/auth/demo-switch` - 1-click switch between demo campus personas

### Service Requests (`/api/requests`)
- `GET /api/requests` - List accessible requests (scoped by user role and filters)
- `GET /api/requests/:id` - Fetch full ticket details, attachments, and audit history
- `POST /api/requests` - Submit a new service request (calculates SLA deadline automatically)
- `PATCH /api/requests/:id/status` - Update ticket status with resolution notes
- `PATCH /api/requests/:id/assign` - Assign technician (Dept Heads & Admins)
- `PATCH /api/requests/:id/escalate` - Escalate high-urgency incidents
- `POST /api/requests/:id/attachments` - Upload image or document evidence

### AI Copilot (`/api/assistant`)
- `POST /api/assistant/chat` - Query Pulse Assistant for policy info, status explanations, or request drafting

### Administration & Operations (`/api/admin`)
- `GET /api/admin/stats` - Operational metrics and SLA compliance breakdown
- `GET /api/admin/users` - Directory of campus users
- `GET /api/admin/departments` - Campus departments list
- `GET /api/admin/categories` - Service categories and baseline SLA hours
- `PUT /api/admin/categories/:id` - Update category SLA duration
- `GET /api/admin/sla-settings` - SLA escalation matrix

---

## 🛠️ Local Development & Build

### Prerequisites
- **Node.js**: v18.0 or newer
- **npm**: v9.0 or newer

### Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd campuspulse

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for AI features)
# Create .env or set in runtime:
# GEMINI_API_KEY=your_gemini_api_key_here

# 4. Start development server (boots Express server with Vite middleware on port 3000)
npm run dev
```

The application will be accessible at: `http://localhost:3000`

### Build for Production
```bash
# Run type checking
npm run lint

# Build client bundle and compile server to dist/server.cjs
npm run build

# Start production server
npm run start
```

---

## 🔒 Security & Privacy Practices
- **Role-Enforced Queries**: SQL queries enforce user permissions at the database layer (e.g., students only retrieve their own tickets; technicians retrieve assigned workloads; department heads view their unit's queue).
- **Safe AI Grounding**: Strict system instructions prevent Pulse Assistant from disclosing confidential records, passwords, or executing state mutations without explicit user submission.
- **Input Sanitization**: File uploads are restricted by MIME type and size, with disk isolation and parameterized SQL queries to safeguard against injection vulnerabilities.
