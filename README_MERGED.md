# Employee Time & Attendance System - Merged Project

This folder merges the useful work from the two project copies in the uploaded ZIP into one clean project.

## What was merged

### Backend
- Node.js + Express + MongoDB backend from the more complete backend copy.
- Personal attendance: check in, check out, today, history.
- Team Lead attendance views and Admin company attendance history.
- Employee management and Team Lead assignment APIs.
- Project and task APIs.
- Task timer start, pause, resume, stop, active timer restore, personal history, and Team Lead time-log view.
- Added `/api/auth/logout` while keeping JWT/localStorage authentication.
- Added `http://localhost:5174` to CORS in addition to the existing frontend ports.
- Added `/api/time-logs/my` as an alias for personal time-log history while retaining `/api/time-logs/history`.

### Dashboard frontend
- Kept the original role-based React/Vite application structure.
- Admin-only login route: `/admin/login`.
- Generic role login route: `/login`.
- Admin dashboard with persistent left sidebar.
- Admin Employees page connected to `/api/employees` with search and active/inactive filtering.
- Existing Admin/Team Lead/Employee personal attendance and task timer features preserved.
- Attendance history restored on the personal work panel.
- Pause and Resume timer controls included.
- Profile page preserved.
- Team Lead and Employee dashboards preserved.
- Removed the duplicate AdminDashboard/AdminSidebar copies that caused confusion.

### Desktop app
- Kept the richer Electron renderer/index implementation from the second project copy.

### Billing
- The Admin workspace includes an administrator-only Billing report.
- Billing aggregates completed timer sessions by project ID and task ID, keeps break-task time separate, and excludes paused time.
- Reports support quick/custom date ranges, daily detail, timezone-aware boundaries, and filtered Excel export.
- Billing reads the existing timer records and does not create a separate timesheet source.

## Interface and themes

The dashboard now uses a shared professional layout for all three roles. The
floating Theme button opens the palette chooser, saves the selected palette on
the device, and closes immediately after a theme is selected.

## Clean frontend structure

```text
dashboard/src/
  components/
    admin/AdminSidebar.jsx
    layout/DashboardLayout.jsx
    dashboard/PersonalWorkPanel.jsx
  pages/
    admin/
      AdminLogin.jsx
      AdminDashboard.jsx
      AdminEmployees.jsx
      AdminPlaceholderPage.jsx
    employee/
    teamLead/
    profile/
  routes/AppRoutes.jsx
  styles/adminLayout.css
```

## Run backend

Copy `backend/.env.example` to `backend/.env` and set a new MongoDB URI and a long, random JWT secret. `APP_TIMEZONE` controls attendance day boundaries; it defaults to `Asia/Kolkata`.

```bash
cd backend
npm install
npm run dev
```

Backend should run on `http://localhost:5000`.

## Run React dashboard

Open a second terminal:

```bash
cd dashboard
npm install
npm run dev
```

Open the exact Local URL shown by Vite. All roles sign in at `/login` and are
redirected to the correct dashboard for their role.

For a non-local backend, copy `dashboard/.env.example` to `dashboard/.env.local` and set `VITE_API_URL`. For a packaged desktop client, set `HANDDY_API_URL` before launching/building it.

## Run the Electron desktop timer

Keep the backend running, then open a third terminal:

```bash
cd desktop-app
npm install
npm start
```

The desktop timer uses `http://localhost:5000/api` by default. To use another
backend, set `HANDDY_API_URL` before starting or packaging the app. The current
desktop module supports login, attendance, projects/tasks, and timer controls.
Keystroke, application, website, and screenshot collection are intentionally
not fabricated; those collectors belong to the next Electron implementation
phase.

## Validation

```bash
cd backend && npm test
cd ../dashboard && npm run lint && npm run build
```

## Notes

- Run `npm install` once inside `backend`, `dashboard`, and `desktop-app` after extracting a clean copy.
- All sidebar navigation targets are registered. Management pages use the backend APIs; report pages use attendance and timer records.
- Monitoring reports clearly show when Electron tracking data has not yet been collected.
- Employee creation is available from Admin Employees, and Admin or Team Lead users can open employee details from the shared employee list.

## Validation performed

- Dashboard ESLint passes.
- Dashboard production build passes.
- Backend tests pass.
- Backend and Electron JavaScript syntax checks pass.
- Backend and dashboard health checks return HTTP 200 in local development.
