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
let timer = { _id: "smoke-timer", status: "running", startedAt: new Date().toISOString(), pauses: [], task: { _id: "task", idleLogout: true } };
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
    else if (req.url === "/api/time-logs/pause") {
      actions.push("pause");
      timer = { ...timer, status: "paused", pauses: [{ reason: JSON.parse(body).reason, pausedAt: new Date().toISOString() }] };
      data = { timeLog: timer };
    } else if (req.url === "/api/time-logs/resume") {
      actions.push("resume"); timer.status = "running"; data = { timeLog: timer };
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
    win = new BrowserWindow({ show: false, webPreferences: { preload: path.resolve(__dirname, "../preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false } });
    await win.loadFile(path.resolve(__dirname, "../index.html"));
    const login = async () => {
      await win.webContents.executeJavaScript('document.getElementById("email").value="test@example.invalid"; document.getElementById("password").value="local-test-only"; document.getElementById("loginForm").requestSubmit();');
      await until(() => win.webContents.getURL().endsWith("dashboard.html"));
      await until(() => win.webContents.executeJavaScript('typeof idlePolicyRefreshInterval !== "undefined" && idlePolicyRefreshInterval !== null'));
    };
    await login();
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
    console.log("PASS: Electron idle pause, 3-minute logout, safe timer close, and zeroed next session.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (win) win.destroy();
    server.close();
    app.exit(process.exitCode || 0);
  }
});
