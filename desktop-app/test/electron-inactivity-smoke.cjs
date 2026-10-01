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
const completedLogs = [];
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
    else if (req.url === "/api/settings/idle-policy") data = { idlePolicy: { idleThresholdMinutes: 5, autoLogoutMinutes: 30 } };
    else if (req.url === "/api/time-logs/active") data = { timeLog: timer };
    else if (req.url.startsWith("/api/time-logs/history")) data = { timeLogs: [...completedLogs, ...(timer ? [timer] : [])] };
    else if (req.url === "/api/time-logs/start") {
      const request = JSON.parse(body);
      timer = {
        _id: `smoke-timer-${completedLogs.length + 1}`,
        status: "running",
        startedAt: new Date().toISOString(),
        pauses: [],
        project: { _id: "project", projectName: "Project" },
        task: { _id: request.task, taskName: request.task === "break-task" ? "Lunch" : "Task", taskType: request.task === "break-task" ? "break" : "work", idleLogout: true },
      };
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
      const stopped = { ...timer, status: "stopped", stoppedAt: new Date().toISOString(), totalWorkedSeconds: 0 };
      completedLogs.push(stopped);
      data = { timeLog: stopped };
      timer = null;
    } else if (req.url === "/api/auth/logout") actions.push("logout");
    else if (req.url.startsWith("/api/projects")) data = { projects: [{ _id: "project", projectName: "Project", clientName: "Client" }], totalPages: 1 };
    else if (req.url.startsWith("/api/tasks")) data = {
      tasks: req.url.includes("taskType=break")
        ? [{ _id: "break-task", taskName: "Lunch", taskType: "break", project: null }]
        : [{ _id: "task", taskName: "Task", taskType: "work", project: "project", idleLogout: true }],
      totalPages: 1,
    };
    else data = { timeLogs: [] };
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
    await evaluate(`document.getElementById("projectSelect").value = "project";
      document.getElementById("projectSelect").dispatchEvent(new Event("change"));`);
    await until(() => evaluate("[...document.getElementById('taskSelect').options].some(option => option.value === 'break-task')"));
    await evaluate(`document.getElementById("taskSelect").value = "task";
      document.getElementById("taskSelect").dispatchEvent(new Event("change"));
      document.getElementById("startTimerButton").click();`);
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'Working'"));
    await delay(1100);
    assert.notEqual(await evaluate("document.getElementById('timerDuration').textContent"), "00:00:00");
    assert.equal(await evaluate("document.getElementById('breakTimerButton')"), null);
    await evaluate("document.getElementById('stopTimerButton').click()");
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'Stopped'"));
    assert.equal(await evaluate("document.getElementById('timerDuration').textContent"), "00:00:00");
    await evaluate(`document.getElementById("taskSelect").value = "break-task";
      document.getElementById("taskSelect").dispatchEvent(new Event("change"));
      document.getElementById("startTimerButton").click();`);
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'On Break'"));
    await delay(2100);
    assert.notEqual(await evaluate("document.getElementById('breakDuration').textContent"), "00:00:00");
    assert.equal(await evaluate("document.getElementById('timerDuration').textContent"), "00:00:00");
    await win.loadFile(path.resolve(__dirname, "../dashboard.html"));
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'On Break'"));
    assert.equal(await evaluate("document.getElementById('breakTimerButton')"), null);
    await evaluate("document.getElementById('stopTimerButton').click()");
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'Stopped'"));
    await evaluate("loadTodayTimesheet()");
    await until(() => evaluate("document.getElementById('todayBreak').textContent !== '00:00:00'"));
    await evaluate(`document.getElementById("taskSelect").value = "task";
      document.getElementById("taskSelect").dispatchEvent(new Event("change"));
      document.getElementById("startTimerButton").click();`);
    await until(() => evaluate("document.getElementById('timerStatus').textContent === 'Working'"));
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
    assert.deepEqual(actions, ["stop", "stop"]);
    actions.length = 0;
    idleSeconds = 300;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    assert.equal(timer, null);
    assert.equal(await win.webContents.executeJavaScript('document.getElementById("timerDuration").textContent'), "00:00:00");
    assert.equal(await evaluate("document.getElementById('idleStartedDialog').open"), true);
    assert.match(await evaluate("document.getElementById('idleStartedMessage').textContent"), /inactive for 5 minutes/);
    fs.writeFileSync(path.resolve(__dirname, "../../dashboard/ui-review/idle-popup.png"), (await win.webContents.capturePage()).toPNG());
    await evaluate("document.getElementById('acknowledgeIdleButton').click()");
    assert.equal(await evaluate("document.getElementById('idleStartedDialog').open"), false);
    await evaluate("checkSystemIdleState()");
    assert.equal(await evaluate("document.getElementById('idleStartedDialog').open"), false);
    idleSeconds = 0;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    assert.equal(timer, null);
    idleSeconds = 1800;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    await until(() => win.webContents.getURL().endsWith("index.html"));
    await until(() => win.webContents.executeJavaScript('document.getElementById("message")?.textContent === "You were logged out after 30 minutes of inactivity."'));
    assert.deepEqual(actions, ["stop", "logout"]);
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
    idleSeconds = 1800;
    await win.webContents.executeJavaScript("checkSystemIdleState()");
    await until(() => win.webContents.getURL().endsWith("index.html"));
    assert.deepEqual(actions, ["stop", "logout", "logout"]);
    console.log("PASS: Electron break-task selection, idle stop, logout, and zeroed next session.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (win) win.destroy();
    server.close();
    app.exit(process.exitCode || 0);
  }
});
