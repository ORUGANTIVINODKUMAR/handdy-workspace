# Application audit — 22 September 2026

Repository-wide review of backend authorization, attendance, schedules, timer reports and startup behavior; dashboard report loading; desktop timer behavior; dependency advisories; and the existing automated checks.

## Fixed findings

1. **High — delegated editor account takeover:** `edit_employees` users could change an administrator's email and then use password reset. Email changes are now restricted to administrators alongside role, status, password and permissions.
2. **High — incomplete reports:** dashboard report and filter requests stopped after the first 100 records. Report APIs and employee/project selectors now retrieve every page.
3. **High — vulnerable build dependency:** root and desktop dependency trees used a vulnerable `js-yaml` release. Both lockfiles now resolve `js-yaml` 4.3.2; all package audits report zero vulnerabilities.
4. **Medium — overnight attendance:** checkout searched only today's attendance record. It now closes the latest open session across midnight, check-in rejects a second open session, and the attendance card restores an overnight open session.
5. **Medium — project lifecycle reversal:** server startup reactivated deleted or completed default-named projects. Startup now creates only missing defaults and preserves existing project state.
6. **Medium — schedule race:** concurrent requests could create duplicate active schedules for an employee/day. Schedules now store a company-timezone date key with a partial unique index and return HTTP 409 on a duplicate-key race.
7. **Medium — report boundary loss:** time reports selected records only by `startedAt`, omitting work that crossed into the requested period. Queries now use interval overlap and clip work/pause totals to the selected boundaries.
8. **Medium — desktop break regression:** new break styling called a DOM API that was absent in established test/runtime stubs, interrupting timer state updates. Class state changes now use compatible add/remove operations.
9. **Medium — timer resume regression:** pause/resume chained population onto an update query in a way that broke the controller's established execution path. Population now happens safely on the returned document.

## Verification

- Backend: 56 tests passed, including new overnight clipping and overlapping-pause cases.
- Dashboard: 7 tests passed; ESLint passed; route audit passed (21 static navigation targets, 65 routes).
- Desktop: 26 unit tests passed; Electron inactivity/break smoke test passed; 31-second dashboard lifecycle smoke test passed.
- Dashboard production build passed. ExcelJS still produces a 929.55 kB minified chunk warning; this is a performance optimization opportunity, not a correctness failure.
- `npm audit`: zero known vulnerabilities in root, backend, dashboard and desktop dependency trees.
- `git diff --check`: passed.

The audit did not connect to the production MongoDB database or exercise production email delivery. The new schedule index is declared in the Mongoose schema and will be created where automatic index creation is enabled; deployments that disable automatic indexes should create that index through their normal database migration process.
