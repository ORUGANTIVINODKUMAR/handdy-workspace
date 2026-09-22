# Code audit — 22 September 2026

Repository-wide review of backend routes, controllers, authentication, models and services; dashboard authentication, reporting and scheduling flows; desktop main/preload and renderer flows; and existing automated checks. This is a source review with local checks, not a production penetration test or an exhaustive proof that every file is defect-free. No application code was changed.

## Findings

### 1. High: delegated editors can take over administrator accounts

Location: `backend/src/controllers/employeeController.js:139–156`; `backend/src/controllers/authController.js:750–775`.

The `edit_employees` permission allows updating any employee ID. The non-admin restriction blocks password, role, status and permissions, but permits email changes even for an administrator. An editor can replace an administrator's email with an address they control, request a password reset, and use the emailed token to set the administrator's password. Resetting the password revokes existing sessions, so device approval does not prevent subsequent login.

Fix: restrict delegated editors' target accounts and disallow changes to recovery/login email without an appropriately privileged, verified flow. Add a regression test covering an editor targeting an administrator.

### 2. High: reports silently omit records after the first 100

Location: `dashboard/src/pages/admin/AdminReportPage.jsx:193–212`; `dashboard/src/pages/shared/RoleReportPage.jsx:83–89`.

Both report flows request `limit: 100` once and ignore the returned pagination metadata. The backend caps pages at 100. Totals, displayed records, and admin exports are calculated from that first page. A date range containing 101 or more attendance entries or timer sessions produces an incomplete report without warning.

Fix: fetch all report pages or provide a server-side report/export endpoint with complete aggregates. Verify totals and exports against a fixture with more than 100 records. Scheduling and several selectors also fetch only the first 100 and need pagination or searchable selection.

### 3. Medium: overnight attendance cannot be checked out

Location: `backend/src/controllers/attendanceController.js:48–56`.

Checkout searches only for today's attendance record. Someone checking in before midnight and checking out after midnight receives “You must check in before checking out”; the preceding day's record remains open. A new check-in is also allowed on the new day despite the old open record.

Fix: find the employee's outstanding attendance session independently of today's date, define the overnight business rule, and prevent multiple open attendance sessions.

### 4. Medium: server restart reverses project deletion/completion

Location: `backend/server.js:30–37`.

For any project named Software, FTC WCPA, KCPA, KCPA & Renau, or CPA & Unit 1, startup clears `deletedAt` and forces `status` back to Active. Deleting or completing one of those projects therefore lasts only until the next restart/deployment. This also applies to an existing user-created project with a matching name.

Fix: seed missing records only, preferably via an explicit migration; preserve administrative lifecycle changes.

### 5. Medium: concurrent schedule requests bypass conflict detection

Location: `backend/src/controllers/scheduleController.js:50–60`; `backend/src/models/Schedule.js:64`.

Conflict detection and insertion are separate database operations. Two requests for the same employee/day can both pass `Schedule.exists` before either inserts. The schema index is not unique, so both active schedules are accepted. Concurrent updates can violate the same invariant.

Fix: store a normalized company-calendar date key and enforce a partial unique index for active schedules by employee/date key. Resolve existing duplicates before adding the constraint, and return a conflict response for duplicate-key errors.

### 6. Medium: time reports lose work crossing the report start boundary

Location: `backend/src/controllers/taskTimeLogController.js:16–22,341–343,453–455,494–496`.

History queries filter by `startedAt` rather than interval overlap. A session running from 23:30 yesterday to 01:00 today is entirely absent from today's time report, even though it contains an hour of today's work. Billing already uses overlapping intervals and clipping, so the two report paths disagree for this case.

Fix: query sessions overlapping the requested period and clip work/pause segments to that period consistently with billing. Cover overnight sessions and sessions spanning several days.

## Verification

- Backend: 46 tests passed.
- Dashboard: 7 tests passed; ESLint passed; route audit passed (21 static navigation targets, 65 routes).
- Desktop: 26 unit tests passed.
- Dashboard production build passed; a large-chunk warning remains, including an approximately 930 kB minified ExcelJS chunk.
- Backend tests and the dashboard build initially encountered sandbox process-spawn restrictions; both passed when rerun with approved execution outside the sandbox.

Not performed: live MongoDB integration/concurrency tests, production requests, Electron GUI smoke tests, or a current dependency advisory scan. Findings above are grounded in the checked-in execution paths; concurrency and email-delivery scenarios were not exercised against a live deployment.

Suggested order: close the delegated-editor takeover path, fix report completeness, then address attendance, project lifecycle, and schedule/time-report consistency.
