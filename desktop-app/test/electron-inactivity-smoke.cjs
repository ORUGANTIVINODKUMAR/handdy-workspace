// Local Electron integration test: real renderer/preload, simulated API and OS idle duration.
const { app, BrowserWindow, ipcMain } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const defaults = require("../idle-policy-defaults.json");
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "crm-idle-smoke-")));
process.env.HANDDY_API_URL = "http://127.0.0.1:5000/api";
let idleSeconds = 0;
let timer = null;
const actions = [];
const user = { _id: "smoke-user", fullName: "Local test employee", role: "employee", isActive: true };
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.end(); return; }
    let data = {};
    if (req.url === "/api/auth/login") data = { token: "local-test-token", user };
    else if (req.url === "/api/auth/me") data = { user };
    else if (req.url === "/api/settings/idle-policy") data = { idlePolicy: { idleThresholdMinutes: 1, autoLogoutMinutes: 3 } };
    else if (req.url === "/api/time-logs/active") data = { timeLog: timer };
    else if (req.url.startsWith("/api/time-logs/history")) data = { timeLogs: timer ? [timer] : [] };
    else if (req.url === "/api/time-logs/start") {
      timer = { _id: "smoke-timer", status: "running", startedAt: new Date().toISOString(), pauses: [], task: { _id: "task", idleLogout: true } };
      data = { timeLog: timer };
    } else if (req.url === "/api/time-logs/pause") {
      actions.push("pause");
      timer = { ...timer, status: "paused", pauses: [...timer.pauses, { reason: JSON.parse(body).reason, pausedAt: new Date().toISOString() }] };
      data = { timeLog: timer };
    } else if (req.url === "/api/time-logs/resume") {
      actions.push("resume"); timer.status = "running";
      timer.pauses = timer.pauses.map(pause => pause.resumedAt ? pause : { ...pause, resumedAt: new Date().toISOString() });
      data = { timeLog: timer };
    } else if (req.url === "/api/time-logs/stop") {
      actions.push("stop");
      data = { timeLog: { ...timer, status: "stopped", totalWorkedSeconds: 0 } };
      timer = null;
    } else if (req.url === "/api/auth/logout") actions.push("logout");
    else if (req.url.startsWith("/api/projects")) data = { projects: [] };
    else data = { timeLogs: [], tasks: [] };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  });
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  for (let i = 0; i < 100; i++) { if (await check()) return; await delay(100); }
  throw new Error("Timed out waiting for desktop state");
}
app.whenReady().then(async () => {
  let win;
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(5000, "127.0.0.1", resolve); });
    ipcMain.handle("system:get-idle-time", () => idleSeconds);
    ipcMain.handle("system:idle-defaults", () => defaults);
    // preload.js reads this synchronously at load time; without a listener the
    // sendSync call resolves to a non-string value and every fetch in the
    // renderer breaks (it gets concatenated as "[object Object]/auth/login").
    ipcMain.on("config:get-api-base-url", (event) => {
      event.returnValue = process.env.HANDDY_API_URL;
    });
    ipcMain.on("config:get-device-info", (event) => {
      event.returnValue = { deviceId: "electron-smoke-device", deviceName: "Electron smoke test", clientType: "desktop" };
    });
    win = new BrowserWindow({ show: false, width: 1495, height: 1000, webPreferences: { preload: path.resolve(__dirname, "../preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false } });
    await win.loadFile(path.resolve(__dirname, "../index.html"));
    const login = async () => {
      await win.webContents.executeJavaScript('document.getElementById("email").value="test@example.invalid"; document.getElementById("password").value="local-test-only"; document.getElementById("loginForm").requestSubmit();');
      await until(() => win.webContents.getURL().endsWith("dashboard.html"));
      await until(() => win.webContents.executeJavaScript('typeof idlePolicyRefreshInterval !== "undefined" && idlePolicyRefreshInterval !== null'));
    };
    await login();
    const evaluate = source => win.webContents.executeJavaScript(source);
    await evaluate("setSelectedProjectId('project', 'smoke test'); setSelectedTaskId('task', 'smoke test'); document.getElementById('startTimerButton').click()");
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'Working'"));
    await delay(1100);
    assert.notEqual(await evaluate("document.getElementById('timerDuration').textContent"), "00:00:00");
    assert.equal(await evaluate("!!document.getElementById('pauseTimerButton') || !!document.getElementById('resumeTimerButton')"), false);
    for (let index = 0; index < 2; index++) {
      await evaluate("document.getElementById('breakTimerButton').click()");
      await until(() => evaluate("document.getElementById('breakTimerButton').textContent === 'End Break'"));
      assert.equal(await evaluate("document.getElementById('breakDuration').textContent"), "00:00:00");
      await delay(2100);
      assert.notEqual(await evaluate("document.getElementById('breakDuration').textContent"), "00:00:00");
      assert.equal(await evaluate("document.getElementById('timesheetBreakDuration').textContent === document.getElementById('breakDuration').textContent"), true);
      if (index === 0) {
        await win.loadFile(path.resolve(__dirname, "../dashboard.html"));
        await until(() => evaluate("document.getElementById('breakTimerButton').textContent === 'End Break'"));
        assert.notEqual(await evaluate("document.getElementById('breakDuration').textContent"), "00:00:00");
      }
      await evaluate("document.getElementById('breakTimerButton').click()");
      await until(() => evaluate("document.getElementById('breakTimerButton').textContent === 'Start Break'"));
      assert.equal(await evaluate("document.getElementById('breakDuration').textContent"), "00:00:00");
      assert.equal(await evaluate("document.getElementById('timesheetBreakDuration').textContent"), "00:00:00");
      assert.equal(await evaluate("document.getElementById('timerDuration').textContent"), "00:00:00");
      await evaluate(`renderTodayTimesheet(${JSON.stringify([timer])})`);
      assert.notEqual(await evaluate("document.getElementById('todayBreak').textContent"), "00:00:00");
      assert.equal(await evaluate(`(() => {
        const parse = value => value.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0);
        const rows = [...document.querySelectorAll('.timesheet-work-row td:last-child')];
        return rows.reduce((total, cell) => total + parse(cell.textContent), 0)
          === parse(document.getElementById('todayTotal').textContent);
      })()`), true);
      assert.equal(timer.pauses.length, index + 1);
      assert.ok(timer.pauses.every(pause => pause.resumedAt));
    }
    await win.loadFile(path.resolve(__dirname, "../dashboard.html"));
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'Working'"));
    assert.equal(await evaluate("document.getElementById('breakDuration').textContent"), "00:00:00");
    await until(() => evaluate("document.getElementById('todayBreak').textContent !== '00:00:00'"));
    const cardDoesNotOverlap = () => evaluate(`(() => {
      const items = [...document.querySelector('.timesheet-break-summary').children]
        .map(element => element.getBoundingClientRect());
      return items.every((rect, index) => index === 0 || rect.top >= items[index - 1].bottom);
    })()`);
    assert.equal(await cardDoesNotOverlap(), true);
    win.setSize(500, 800);
    await delay(200);
    assert.equal(await cardDoesNotOverlap(), true);
    win.setSize(1495, 1000);
    assert.deepEqual(actions, ["pause", "resume", "pause", "resume"]);
    actions.length = 0;
    idleSeconds = 60;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    assert.equal(timer.status, "paused");
    idleSeconds = 180;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    await until(() => win.webContents.getURL().endsWith("index.html"));
    await until(() => win.webContents.executeJavaScript('document.getElementById("message")?.textContent === "You were logged out after 3 minutes of inactivity."'));
    assert.deepEqual(actions, ["pause", "stop", "logout"]);
    idleSeconds = 0;
    await login();
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    assert.equal(timer, null);
    assert.equal(await win.webContents.executeJavaScript('document.getElementById("timerDuration").textContent'), "00:00:00");

    // With no active timer, activeTaskIdleLogout is false (the real default
    // set by loadActiveTimer when data.timeLog is null). The session-level
    // auto-logout must still fire after the idle threshold - this is the
    // no-timer / no-task-opt-in scenario the desktop app previously never
    // exercised, and previously never enforced.
    assert.equal(await win.webContents.executeJavaScript("activeTaskIdleLogout"), false);
    idleSeconds = 180;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    await until(() => win.webContents.getURL().endsWith("index.html"));
    assert.deepEqual(actions, ["pause", "stop", "logout", "logout"]);
    console.log("PASS: Electron break controls, successive breaks, reset, active/completed break restoration, preserved history; idle pause, logout, safe timer close, and zeroed next session.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (win) win.destroy();
    server.close();
    app.exit(process.exitCode || 0);
  }
});
