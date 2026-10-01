// Build dashboard with VITE_API_URL=/api before running with Electron.
// Real React/router/DOM; isolated mock API, no production credentials or writes.
const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../dashboard/dist");
const user = { _id: "test-admin", role: "admin", fullName: "Test Admin", permissions: [] };
const calls = new Map();
let revoked = false;
let pending = false;
let clientReportEnabled = false;
const clientReportLogs = [
  ["log-1", "ABC Corporation", "client-a", "Tax Return", "tax", "Preparation", "prepare", 60],
  ["log-2", "ABC Corporation", "client-a", "Tax Return", "tax", "Review", "review", 120],
  ["log-3", "ABC Corporation", "client-a", "Bookkeeping", "books", "Monthly", "monthly", 180],
  ["log-4", "XYZ Corporation", "client-b", "Banking", "bank", "Reconciliation", "reconcile", 240],
].map(([id, clientName, clientId, projectName, projectId, taskName, taskId, seconds]) => ({
  _id: id, employee: { _id: "employee-john", fullName: "John" },
  client: { _id: clientId, clientName }, project: { _id: projectId, projectName },
  task: { _id: taskId, taskName, taskType: "work" }, status: "stopped",
  startedAt: "2026-10-01T10:00:00Z", stoppedAt: "2026-10-01T10:01:00Z",
  totalWorkedSeconds: seconds, totalIdleSeconds: 0, pauses: [],
}));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const endpoint = url.pathname.slice(4);
    calls.set(endpoint, (calls.get(endpoint) || 0) + 1);
    setTimeout(() => {
      res.setHeader("Content-Type", "application/json");
      if (revoked) {
        res.writeHead(401);
        res.end(JSON.stringify({ code: "SESSION_REVOKED", message: "Session revoked for test" }));
        return;
      }
      let body = {};
      if (endpoint === "/auth/me") body = { user };
      if (endpoint === "/auth/login-requests/pending") body = { loginRequest: pending ? { requestId: "test-request", deviceName: "Test device" } : null };
      if (endpoint.endsWith("/decision")) pending = false;
      if (endpoint === "/teams") body = { teams: [{ _id: "team", teamName: "Stable team", isActive: true }] };
      if (endpoint === "/employees") body = { employees: [], totalPages: 1, totalEmployees: 0 };
      if (endpoint === "/tasks") body = { tasks: [] };
      if (endpoint === "/time-logs/admin" && clientReportEnabled) body = { timeLogs: clientReportLogs, totalPages: 1 };
      res.end(JSON.stringify(body));
    }, endpoint.startsWith("/time-logs/") ? 6500 : 150);
    return;
  }
  const file = url.pathname.startsWith("/assets/") ? path.join(root, path.basename("assets"), path.basename(url.pathname)) : path.join(root, "index.html");
  res.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
  res.end(fs.readFileSync(file));
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let win;
const evaluate = source => win.webContents.executeJavaScript(source);
async function until(source) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(source)) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${source}`);
}
app.whenReady().then(async () => {
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    win = new BrowserWindow({ show: false, webPreferences: { partition: `test-${Date.now()}`, backgroundThrottling: false } });
    let documents = 0;
    win.webContents.on("did-finish-load", () => documents++);
    await win.loadURL(`${base}/login`);
    await evaluate(`localStorage.setItem('token', 'test-token'); localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user))});`);
    await win.loadURL(`${base}/admin/team`);
    await until(`document.body.textContent.includes('Stable team')`);
    const initialDocuments = documents;
    const initialMe = calls.get("/auth/me");
    await evaluate(`
      window.testMain = document.querySelector('#workspace-content');
      window.testSidebar = document.querySelector('.crm-nav');
      window.testRow = document.querySelector('.team-table tbody tr');
      window.loadingFlashes = 0;
      window.observer = new MutationObserver(() => {
        if (document.querySelector('.team-table tbody')?.textContent.includes('Loading teams')) window.loadingFlashes++;
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
    `);
    const teamsBefore = calls.get("/teams");
    await delay(31_000);
    assert.ok(calls.get("/teams") >= teamsBefore + 3, "30 seconds of polling occurred");
    assert.equal(await evaluate("loadingFlashes"), 0, "background refresh never removes rows");
    assert.equal(await evaluate("testRow === document.querySelector('.team-table tbody tr')"), true);
    for (const route of ["/admin/employees", "/admin/tasks", "/admin/team"]) {
      await evaluate(`document.querySelector('a[href="${route}"]').click()`);
      await until(`location.pathname === '${route}'`);
      await delay(400);
      assert.equal(await evaluate("testMain === document.querySelector('#workspace-content') && testSidebar === document.querySelector('.crm-nav')"), true);
    }
    await until(`!!document.querySelector('a[href="/admin/tasks"]')`);
    await evaluate(`document.querySelector('a[href="/admin/tasks"]').click()`);
    await until(`location.pathname === '/admin/tasks'`);
    await until(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Add New Task'))`);
    await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Add New Task')).click()`);
    await until(`location.pathname === '/admin/tasks/new'`);
    await until(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Add another task name'))`);
    await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Add another task name')).click()`);
    await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Add another task name')).click()`);
    assert.equal(await evaluate("document.querySelectorAll('.admin-task-name-list input').length"), 3);
    assert.equal(await evaluate("document.querySelector('.admin-add-task-save').textContent.trim()"), "Save 3 task names");
    assert.equal(await evaluate(`(() => {
      const row = document.querySelector('.admin-task-name-row');
      if (!row) return false;
      const input = row.querySelector('input').getBoundingClientRect();
      const remove = row.querySelector('button').getBoundingClientRect();
      return input.right <= remove.left;
    })()`), true);
    await evaluate(`document.querySelector('.admin-task-name-remove').click()`);
    assert.equal(await evaluate("document.querySelectorAll('.admin-task-name-list input').length"), 2);
    await until(`!!document.querySelector('a[href="/admin/team"]')`);
    await evaluate(`document.querySelector('a[href="/admin/team"]').click()`);
    await until(`location.pathname === '/admin/team'`);
    assert.equal(documents, initialDocuments, "navigation/polling never reloads the document");
    assert.equal(calls.get("/auth/me"), initialMe, "navigation does not restart auth initialization");
    win.webContents.reload();
    await until("document.body.textContent.includes('Stable team')");
    await delay(500);
    assert.equal(await evaluate("location.pathname"), "/admin/team");
    assert.equal(calls.get("/auth/me"), initialMe + 1);
    // A manual report slower than the five-second poll must still finish.
    await evaluate(`document.querySelector('a[href="/admin/timesheets/detailed"]').click()`);
    await until(`location.pathname === '/admin/timesheets/detailed'`);
    await until(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Generate'))`);
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Generate')).click()`);
    await until(`[...document.querySelectorAll('button')].some(b => b.disabled && b.textContent.includes('Loading'))`);
    await until(`[...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent.includes('Generate'))`);
    assert.equal(calls.get('/time-logs/admin'), 1, "polling does not supersede the slow manual report");
    clientReportEnabled = true;
    await evaluate(`document.querySelector('a[href="/admin/timesheets/team"]').click()`);
    await until(`location.pathname === '/admin/timesheets/team'`);
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Generate')).click()`);
    await until(`document.querySelector('.admin-report-results').textContent.includes('John')`);
    await evaluate(`document.querySelector('[aria-label="Team timesheet view"] button:last-child').click()`);
    await until(`document.querySelectorAll('.client-timesheet-client').length === 2`);
    assert.equal(await evaluate("document.querySelectorAll('.client-timesheet-employee').length"), 1);
    assert.equal(await evaluate("document.querySelectorAll('.client-timesheet-project').length"), 3);
    assert.equal(await evaluate("document.querySelectorAll('.client-timesheet tbody tr').length"), 4);
    assert.ok((await evaluate("document.querySelector('.client-timesheet-employee > summary').textContent")).includes('Worked 10m'));
    assert.equal(await evaluate(`(() => {
      const buttons = [...document.querySelectorAll('.client-timesheet-view-buttons button')];
      return getComputedStyle(buttons[0]).backgroundColor !== getComputedStyle(buttons[1]).backgroundColor;
    })()`), true);
    await evaluate("document.querySelectorAll('.client-timesheet details').forEach(node => node.open = true)");
    await evaluate("document.querySelector('.client-timesheet-client > summary').click()");
    assert.equal(await evaluate("document.querySelector('.client-timesheet-client').open"), false);
    await evaluate("document.querySelector('.client-timesheet-client > summary').click()");
    assert.equal(await evaluate("document.querySelector('.client-timesheet-client').open"), true);
    await evaluate(`document.querySelector('[aria-label="Team timesheet view"] button:first-child').click()`);
    assert.equal(await evaluate("document.querySelector('.client-timesheet')"), null);
    assert.ok((await evaluate("document.querySelector('.admin-report-results').textContent")).includes('John'));
    await evaluate(`document.querySelector('[aria-label="Team timesheet view"] button:last-child').click()`);
    const screenshotPath = path.resolve(__dirname, "../../dashboard/ui-review/client-timesheet.png");
    await evaluate("document.querySelectorAll('.client-timesheet details').forEach(node => node.open = true)");
    win.setSize(1200, 1100);
    await delay(250);
    await evaluate("document.querySelector('.client-timesheet').scrollIntoView({block: 'start'})");
    await delay(200);
    fs.writeFileSync(screenshotPath, (await win.webContents.capturePage()).toPNG());
    win.setSize(520, 900);
    await delay(250);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
    fs.writeFileSync(path.resolve(__dirname, "../../dashboard/ui-review/client-timesheet-mobile.png"), (await win.webContents.capturePage()).toPNG());
    win.setSize(1200, 900);
    await evaluate(`document.querySelector('a[href="/admin/team"]').click()`);
    await until("document.body.textContent.includes('Stable team')");
    pending = true;
    await until("document.body.textContent.includes('Another device is trying to sign in')");
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Keep This Device').click()");
    await until("!document.querySelector('.crm-device-modal')");
    assert.equal(await evaluate("location.pathname"), "/admin/team");
    revoked = true;
    await until("location.pathname === '/login'");
    assert.equal(await evaluate("localStorage.getItem('token')"), null);
    console.log("PASS: Teams polling, navigation, bulk task controls, session restoration, slow report completion, device approval, and session revocation.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    win?.destroy();
    server.close();
    app.quit();
  }
});
