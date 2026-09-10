const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const defaults = require("../idle-policy-defaults.json");

function harness({ timer = "running", idle = 0, outage = false } = {}) {
  const calls = [];
  const nodes = new Map();
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  };
  const localStorage = storage();
  const state = { idle, outage, timer: timer ? { _id: "existing", status: timer, startedAt: new Date().toISOString(), pauses: [], totalWorkedSeconds: 0 } : null };
  const context = vm.createContext({
    console, AbortSignal, Date, localStorage, sessionStorage: storage(), setInterval: () => 1, clearInterval() {},
    document: {
      body: { dataset: { page: "login" } },
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { textContent: "", style: {}, classList: { add() {}, remove() {} }, addEventListener() {} });
        return nodes.get(id);
      },
      querySelectorAll: () => [], addEventListener() {},
    },
    window: { electronAPI: { getSystemIdleTime: async () => state.idle, getIdleDefaults: async () => defaults }, location: { replace: value => calls.push(value) }, addEventListener() {} },
    fetch: async (url, options = {}) => {
      calls.push(url);
      if (state.outage) throw new Error("offline");
      if (url.endsWith("/pause")) {
        assert.equal(state.timer.status, "running");
        state.timer = { ...state.timer, status: "paused", pauses: [{ pausedAt: new Date().toISOString(), reason: JSON.parse(options.body).reason }] };
      }
      if (url.endsWith("/resume")) state.timer = { ...state.timer, status: "running" };
      if (url.endsWith("/stop")) state.timer = { ...state.timer, status: "stopped", totalWorkedSeconds: 23 * 60 + 26 };
      return { ok: true, status: 200, json: async () => ({ timeLog: state.timer, idlePolicy: { idleThresholdMinutes: 10, autoLogoutMinutes: 30 } }) };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"), context);
  localStorage.setItem("token", "test-only");
  context.seed = state.timer;
  context.defaults = defaults;
  vm.runInContext("idleDefaults = defaults; idlePolicy = normalizedDesktopPolicy({ idleThresholdMinutes: 10, autoLogoutMinutes: 30 }); currentTimeLog = seed; activeTaskIdleLogout = true;", context);
  return { state, calls, context, nodes, run: source => vm.runInContext(source, context), check: () => context.checkSystemIdleState() };
}

test("active employee takes no action; ten minutes pauses exactly once", async () => {
  const h = harness();
  await h.check(); assert.equal(h.calls.length, 0);
  h.state.idle = 600;
  await h.check(); await h.check();
  assert.equal(h.calls.filter(url => url.endsWith("/pause")).length, 1);
  assert.equal(h.state.timer.status, "paused");
});

test("thirty minutes pauses, closes the timer, then logs out exactly once", async () => {
  const h = harness({ idle: 1800 });
  await Promise.all([h.check(), h.check()]); await h.check();
  assert.equal(h.calls.filter(url => url.endsWith("/auth/logout")).length, 1);
  assert.ok(h.calls.findIndex(url => url.endsWith("/stop")) < h.calls.findIndex(url => url.endsWith("/auth/logout")));
  assert.equal(h.context.localStorage.getItem("token"), null);
  assert.equal(h.state.timer.status, "stopped");
});

test("logout also applies without an active timer and for idle-exempt staff", async () => {
  for (const timer of [null, "running"]) {
    const h = harness({ timer, idle: 1800 });
    h.run("idlePolicy.exempt = true");
    await h.check();
    assert.equal(h.context.localStorage.getItem("token"), null);
  }
});

test("activity before logout preserves normal automatic resume and resets inactivity", async () => {
  const h = harness({ idle: 600 }); await h.check();
  h.state.idle = 0; await h.check();
  assert.equal(h.state.timer.status, "running");
  assert.equal(h.calls.some(url => url.endsWith("/auth/logout")), false);
});

test("task idle logout off leaves a running timer unchanged", async () => {
  const h = harness({ idle: 1800 });
  h.run("activeTaskIdleLogout = false");
  await h.check();
  assert.equal(h.state.timer.status, "running");
  assert.equal(h.calls.length, 0);
});

test("intentional break is exempt from idle pause and logout", async () => {
  const h = harness({ timer: "paused", idle: 1800 });
  h.state.timer.pauses = [{ pausedAt: new Date().toISOString(), reason: "break" }];
  h.run("currentTimeLog = seed");
  await h.check();
  assert.equal(h.state.timer.status, "paused");
  assert.equal(h.calls.length, 0);
});

test("Break is enabled while working and toggles to End Break", async () => {
  const h = harness();
  await h.run('pauseTimer("break")');
  assert.equal(h.nodes.get("breakTimerButton").disabled, false);
  assert.equal(h.nodes.get("breakTimerButton").textContent, "End Break");
  assert.equal(h.run("timerInterval !== null"), true);
  await h.run('resumeTimer("break")');
  assert.equal(h.nodes.get("breakTimerButton").disabled, false);
  assert.equal(h.nodes.get("breakTimerButton").textContent, "Break");
});

test("each new Break display starts at zero without counting completed breaks", () => {
  const h = harness();
  const seconds = h.run(`calculateBreakSeconds({ pauses: [
    { reason: "break", pausedAt: new Date(Date.now() - 120000).toISOString(), resumedAt: new Date(Date.now() - 60000).toISOString() },
    { reason: "break", pausedAt: new Date().toISOString(), resumedAt: null }
  ] })`);
  assert.equal(seconds, 0);
});

test("a restored idle-paused timer never auto-resumes after login", async () => {
  const h = harness({ timer: "paused" });
  h.state.timer.pauses = [{ pausedAt: new Date().toISOString(), reason: "idle" }];
  await h.context.loadActiveTimer(); await h.check();
  assert.equal(h.state.timer._id, "existing");
  assert.equal(h.state.timer.status, "paused");
  assert.equal(h.calls.some(url => url.endsWith("/resume")), false);
});

test("settings outage uses defaults; pause outage blocks logout until retry succeeds", async () => {
  const h = harness({ idle: 1800, outage: true });
  h.run("idlePolicy = null");
  await h.context.loadIdlePolicy();
  assert.equal(h.run("idlePolicy.logoutSeconds"), defaults.autoLogoutMinutes * 60);
  await h.check();
  assert.ok(h.context.localStorage.getItem("token"));
  assert.equal(h.run("logoutPending"), true);
  h.state.outage = false; h.state.idle = 0;
  await h.check();
  assert.equal(h.state.timer.status, "stopped");
  assert.equal(h.context.localStorage.getItem("token"), null);
});
