# CRM - Employee Time & Attendance System

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

The packaged desktop timer uses the hosted CRM API by default. Set
`HANDDY_API_URL` before starting or packaging to use a different backend.

### Idle-time tracking

Admins set the inactivity threshold under **Settings → Idle and Logout**. While
an employee timer is running, Electron reads only the operating system's idle
duration; it does not record keys, clicks, or pointer positions. The timer is
automatically paused after the configured threshold and resumes when activity
returns. Idle pauses are excluded from worked/billable time and reported
separately.

One employee can be exempted through a local-only backend command. Set these
values in `backend/.env` without committing the credentials, then run
`npm run create:idle-exempt` inside `backend`:

```text
EXEMPT_EMPLOYEE_EMAIL=employee@example.com
EXEMPT_EMPLOYEE_ID=EMP001
EXEMPT_EMPLOYEE_NAME=Employee Name
EXEMPT_EMPLOYEE_PASSWORD=use-a-strong-password
EXEMPT_EMPLOYEE_TEAM_ID=optional-mongodb-team-id
```

The command creates or updates that employee and removes the exemption from
any previously exempt employee. The exemption is unavailable in the admin UI
and ordinary employee update API.

### Team assignment consistency

Billing filters employees by their exact team assignment. To inspect older
employee records without changing data, run `npm run audit:teams` inside
`backend`. If the listed repairs are correct, run `npm run repair:teams`.
Ambiguous records are never changed automatically and are reported for manual
review.

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

## CRM branding and desktop release publishing

The display name remains CRM. The application ID `com.handdy.timetracker`,
package name, existing profile and Render API configuration remain unchanged.

Desktop version **1.2.23** adds GitHub Releases automatic updates through
`electron-updater`. Packaged Windows builds check after startup, download in
the background, and install on normal quit after the existing timer-stop
confirmation. Older versions need one final manual NSIS installation.

From `desktop-app`, run `npm run build` for a Windows x64 NSIS installer without
publishing. Run `npm run publish` with a build-terminal `GH_TOKEN` to build and
upload a draft release after repository/version validation. Review the draft
before making it public. Installer, blockmap and `latest.yml` belong on GitHub
Releases; Render continues to handle the existing backend/API.

The selected `ORUGANTIVINODKUMAR/handdy-workspace` repository currently returns
HTTP 404 without authentication. Resolve public release hosting before rollout.
Local installers are unsigned; the previous README certificate mention does
not represent a verified signing configuration.

See [the automatic-update audit and one-PC pilot guide](desktop-app/AUTO_UPDATE.md)
for build/publish commands, token/signing setup, release verification, completed
tests and remaining limitations. A CRM icon still needs to be supplied; existing
icons remain unchanged.
