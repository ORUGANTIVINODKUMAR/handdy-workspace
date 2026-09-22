const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const defaults = require("../idle-policy-defaults.json");

function harness({ timer = "running", idle = 0, outage = false, activeTaskIdleLogout = true } = {}) {
  const calls = [];
  const intervals = new Map();
  let nextInterval = 0;
  const nodes = new Map();
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  };
  const localStorage = storage();
  const state = { idle, outage, timer: timer ? { _id: "existing", status: timer, startedAt: new Date().toISOString(), pauses: [], totalWorkedSeconds: 0 } : null };
  const context = vm.createContext({
    console, AbortSignal, Date, localStorage, sessionStorage: storage(),
    setInterval(callback) { intervals.set(++nextInterval, callback); return nextInterval; },
    clearInterval(id) { intervals.delete(id); },
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
        state.timer = { ...state.timer, status: "paused", pauses: [...state.timer.pauses, { pausedAt: new Date().toISOString(), reason: JSON.parse(options.body).reason }] };
      }
      if (url.endsWith("/resume")) state.timer = { ...state.timer, status: "running", pauses: state.timer.pauses.map(pause => pause.resumedAt ? pause : { ...pause, resumedAt: new Date().toISOString() }) };
      if (url.endsWith("/stop")) state.timer = { ...state.timer, status: "stopped", totalWorkedSeconds: 23 * 60 + 26 };
      return { ok: true, status: 200, json: async () => ({ timeLog: state.timer, idlePolicy: { idleThresholdMinutes: 10, autoLogoutMinutes: 30 } }) };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"), context);
  localStorage.setItem("token", "test-only");
  context.seed = state.timer;
  context.defaults = defaults;
  vm.runInContext(`idleDefaults = defaults; idlePolicy = normalizedDesktopPolicy({ idleThresholdMinutes: 10, autoLogoutMinutes: 30 }); currentTimeLog = seed; activeTaskIdleLogout = ${activeTaskIdleLogout};`, context);
  return { state, calls, context, nodes, intervals, run: source => vm.runInContext(source, context), check: () => context.checkSystemIdleState() };
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
    // activeTaskIdleLogout defaults to false here (the real default when no
    // task opted into idle enforcement is running) to prove the session-level
    // auto-logout fires regardless of that per-task flag, and idlePolicy.exempt
    // (which only exempts active work from idle auto-pause) doesn't block it either.
    const h = harness({ timer, idle: 1800, activeTaskIdleLogout: false });
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

test("a brief activity burst between polls still resumes even if idle climbed back above the flat threshold", async () => {
  const h = harness({ idle: 600 }); await h.check();
  assert.equal(h.state.timer.status, "paused");
  // Real activity happened between polls (idle counter reset then climbed
  // again), so this poll's reading (50s) is still well above
  // ACTIVE_AGAIN_SECONDS but is a clear drop from the previous poll's 600s -
  // that drop alone must be enough evidence to resume.
  h.state.idle = 50; await h.check();
  assert.equal(h.state.timer.status, "running");
});

test("task idle logout off leaves a running timer unchanged (below the session logout threshold)", async () => {
  // 700s is past the 600s pause threshold but below the 1800s session
  // auto-logout threshold, isolating the per-task pause gate from the
  // always-on session logout covered by the test above.
  const h = harness({ idle: 700, activeTaskIdleLogout: false });
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
  assert.equal(h.nodes.get("breakTimerButton").textContent, "Start Break");
  assert.equal(h.nodes.get("timerDuration").textContent, "00:00:00");
});

test("current work display resets after each break while completed work remains in history", () => {
  const h = harness({ timer: null });
  const timeLog = `{
    status: "running",
    startedAt: "2026-09-18T10:00:00.000Z",
    pauses: [
      { reason: "break", pausedAt: "2026-09-18T10:10:00.000Z", resumedAt: "2026-09-18T10:15:00.000Z" },
      { reason: "break", pausedAt: "2026-09-18T10:20:00.000Z", resumedAt: "2026-09-18T10:22:00.000Z" }
    ]
  }`;
  assert.equal(h.run(`calculateCurrentWorkSeconds(${timeLog}, new Date("2026-09-18T10:22:00.000Z").getTime())`), 0);
  assert.equal(h.run(`calculateCurrentWorkSeconds(${timeLog}, new Date("2026-09-18T10:22:07.000Z").getTime())`), 7);
  const workRows = h.run(`buildTimeLogTimeline(${timeLog}, new Date("2026-09-18T10:22:07.000Z").getTime())
    .filter(entry => entry.type === "work").map(entry => entry.seconds)`);
  assert.deepEqual(JSON.parse(JSON.stringify(workRows)), [600, 300, 7]);
});

test("current work display freezes during an active break and restores that segment after restart", () => {
  const h = harness({ timer: null });
  const seconds = h.run(`calculateCurrentWorkSeconds({
    status: "paused",
    startedAt: "2026-09-18T10:00:00.000Z",
    pauses: [
      { reason: "break", pausedAt: "2026-09-18T10:10:00.000Z", resumedAt: "2026-09-18T10:15:00.000Z" },
      { reason: "break", pausedAt: "2026-09-18T10:20:00.000Z", resumedAt: null }
    ]
  }, new Date("2026-09-18T10:25:00.000Z").getTime())`);
  assert.equal(seconds, 300);
});

test("each new Break display starts at zero without counting completed breaks", () => {
  const h = harness();
  const seconds = h.run(`calculateBreakSeconds({ status: "paused", pauses: [
    { reason: "break", pausedAt: new Date(Date.now() - 120000).toISOString(), resumedAt: new Date(Date.now() - 60000).toISOString() },
    { reason: "break", pausedAt: new Date().toISOString(), resumedAt: null }
  ] })`);
  assert.equal(seconds, 0);
});

test("ending successive breaks resets the visible clock and preserves both history segments", async () => {
  const h = harness();
  h.state.timer.startedAt = new Date(Date.now() - 1200000).toISOString();
  for (const minutes of [10, 5]) {
    await h.run('pauseTimer("break")');
    assert.equal(h.nodes.get("breakDuration").textContent, "00:00:00");
    h.state.timer.pauses.at(-1).pausedAt = new Date(Date.now() - minutes * 60000).toISOString();
    for (const tick of h.intervals.values()) tick();
    assert.equal(h.nodes.get("breakDuration").textContent, minutes === 10 ? "00:10:00" : "00:05:00");
    assert.equal(h.nodes.get("timesheetBreakDuration").textContent, h.nodes.get("breakDuration").textContent);
    const oldInterval = h.run("timerInterval");
    await Promise.all([
      h.run('runTimerAction(() => resumeTimer("break"))'),
      h.run('runTimerAction(() => resumeTimer("break"))'),
    ]);
    assert.equal(h.intervals.has(oldInterval), false);
    assert.equal(h.intervals.size, 1);
    for (const tick of h.intervals.values()) tick();
    assert.equal(h.nodes.get("breakDuration").textContent, "00:00:00");
    assert.equal(h.nodes.get("timesheetBreakDuration").textContent, "00:00:00");
    assert.equal(h.nodes.get("breakClock").hidden, false);
  }
  assert.equal(h.calls.filter(url => url.endsWith("/resume")).length, 2);
  assert.equal(h.state.timer.pauses.length, 2);
  assert.ok(h.state.timer.pauses.every(pause => pause.resumedAt));
  assert.equal(h.run('buildTimeLogTimeline(currentTimeLog).filter(entry => entry.type === "break").reduce((sum, entry) => sum + entry.seconds, 0)'), 900);
});

test("restore uses only an active break and clears stale intervals for empty and idle sessions", async () => {
  const h = harness({ timer: "paused" });
  h.state.timer.pauses = [{ reason: "break", pausedAt: new Date(Date.now() - 332000).toISOString(), resumedAt: null }];
  await h.run("loadActiveTimer()");
  assert.equal(h.nodes.get("breakDuration").textContent, "00:05:32");
  await h.run('resumeTimer("break")');
  await h.run("loadActiveTimer()");
  assert.equal(h.nodes.get("breakDuration").textContent, "00:00:00");
  assert.equal(h.intervals.size, 1);
  // A non-paused server snapshot must never revive an old open timestamp.
  h.state.timer.pauses[0].resumedAt = null;
  await h.run("loadActiveTimer()");
  assert.equal(h.nodes.get("breakDuration").textContent, "00:00:00");
  h.state.timer.status = "paused";
  h.state.timer.pauses[0].reason = "idle";
  await h.run("loadActiveTimer()");
  assert.equal(h.intervals.size, 0);
  h.state.timer = null;
  await h.run("loadActiveTimer()");
  assert.equal(h.nodes.get("breakDuration").textContent, "00:00:00");
  assert.equal(h.intervals.size, 0);
});

test("failed End Break keeps the active timer; session cleanup removes its interval", async () => {
  const h = harness();
  await h.run('pauseTimer("break")');
  h.state.outage = true;
  await h.run('resumeTimer("break")');
  assert.equal(h.run("isIntentionalBreak()"), true);
  assert.equal(h.intervals.size, 1);
  h.run("clearSessionLoops()");
  assert.equal(h.intervals.size, 0);
});

test("desktop timesheet interleaves work and break segments chronologically", () => {
  const h = harness({ timer: null });
  const timeline = h.run(`buildTimeLogTimeline({
    startedAt: "2026-09-17T13:15:57.000Z",
    pauses: [
      { reason: "break", pausedAt: "2026-09-17T13:16:01.000Z", resumedAt: "2026-09-17T13:18:08.000Z" },
      { reason: "break", pausedAt: "2026-09-17T13:19:11.000Z", resumedAt: "2026-09-17T13:19:53.000Z" }
    ]
  }, new Date("2026-09-17T13:21:00.000Z").getTime()).map(entry => ({
    type: entry.type,
    sequence: entry.sequence,
    seconds: entry.seconds,
    open: entry.open
  }))`);

  assert.deepEqual(JSON.parse(JSON.stringify(timeline)), [
    { type: "work", sequence: 1, seconds: 4, open: false },
    { type: "break", sequence: 1, seconds: 127, open: false },
    { type: "work", sequence: 2, seconds: 63, open: false },
    { type: "break", sequence: 2, seconds: 42, open: false },
    { type: "work", sequence: 3, seconds: 67, open: true },
  ]);
});

test("desktop timesheet globally sorts segments from every session by start time", () => {
  const h = harness({ timer: null });
  const rows = h.run(`buildChronologicalTimeline([
    {
      _id: "later-session",
      startedAt: "2026-09-18T14:23:55.000Z",
      stoppedAt: "2026-09-18T14:34:59.000Z",
      pauses: [
        { reason: "break", pausedAt: "2026-09-18T14:24:14.000Z", resumedAt: "2026-09-18T14:30:28.000Z" },
        { reason: "break", pausedAt: "2026-09-18T14:32:20.000Z", resumedAt: "2026-09-18T14:32:22.000Z" }
      ]
    },
    {
      _id: "earlier-session",
      startedAt: "2026-09-18T13:35:55.000Z",
      stoppedAt: "2026-09-18T13:42:49.000Z",
      pauses: [
        { reason: "break", pausedAt: "2026-09-18T13:37:25.000Z", resumedAt: "2026-09-18T13:37:38.000Z" }
      ]
    },
    {
      _id: "overlapping-session",
      startedAt: "2026-09-18T14:23:42.000Z",
      stoppedAt: "2026-09-18T14:23:51.000Z",
      pauses: []
    }
  ]).map(({ timeLog, entry }) => ({ id: timeLog._id, type: entry.type, start: entry.start.toISOString() }))`);

  assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
    { id: "earlier-session", type: "work", start: "2026-09-18T13:35:55.000Z" },
    { id: "earlier-session", type: "break", start: "2026-09-18T13:37:25.000Z" },
    { id: "earlier-session", type: "work", start: "2026-09-18T13:37:38.000Z" },
    { id: "overlapping-session", type: "work", start: "2026-09-18T14:23:42.000Z" },
    { id: "later-session", type: "work", start: "2026-09-18T14:23:55.000Z" },
    { id: "later-session", type: "break", start: "2026-09-18T14:24:14.000Z" },
    { id: "later-session", type: "work", start: "2026-09-18T14:30:28.000Z" },
    { id: "later-session", type: "break", start: "2026-09-18T14:32:20.000Z" },
    { id: "later-session", type: "work", start: "2026-09-18T14:32:22.000Z" },
  ]);
});

test("timesheet work rows reconcile to backend totals and active breaks stay out of the completed total", () => {
  const h = harness({ timer: null });
  const result = h.run(`(() => {
    const timeline = buildChronologicalTimeline([
      {
        status: "stopped",
        startedAt: "2026-09-18T10:00:00.900Z",
        stoppedAt: "2026-09-18T10:00:10.900Z",
        totalWorkedSeconds: 9,
        pauses: [
          { reason: "break", pausedAt: "2026-09-18T10:00:02.600Z", resumedAt: "2026-09-18T10:00:04.100Z" }
        ]
      },
      {
        status: "paused",
        startedAt: "2026-09-18T11:00:00.000Z",
        pauses: [
          { reason: "break", pausedAt: "2026-09-18T11:00:03.000Z", resumedAt: null }
        ]
      }
    ], new Date("2026-09-18T11:00:08.000Z").getTime());
    return {
      workRows: timeline.filter(({ entry }) => entry.type === "work").map(({ entry }) => entry.seconds),
      completedBreakRows: timeline.filter(({ entry }) => entry.type === "break" && !entry.open).map(({ entry }) => entry.seconds),
      activeBreakRows: timeline.filter(({ entry }) => entry.type === "break" && entry.open).map(({ entry }) => entry.seconds),
      totals: summarizeTimeline(timeline)
    };
  })()`);

  const normalized = JSON.parse(JSON.stringify(result));
  assert.equal(normalized.workRows.reduce((total, seconds) => total + seconds, 0), normalized.totals.workSeconds);
  assert.equal(normalized.totals.workSeconds, 12);
  assert.deepEqual(normalized.completedBreakRows, [1]);
  assert.deepEqual(normalized.activeBreakRows, [5]);
  assert.equal(normalized.totals.breakSeconds, 1);
});

test("stored work seconds are preserved when pauses leave no reconstructed work segment", () => {
  const h = harness({ timer: null });
  const result = h.run(`(() => {
    const timeline = buildChronologicalTimeline([{
      status: "stopped",
      startedAt: "2026-09-18T10:00:00.000Z",
      stoppedAt: "2026-09-18T10:00:10.000Z",
      totalWorkedSeconds: 2,
      pauses: [{
        reason: "break",
        pausedAt: "2026-09-18T10:00:00.000Z",
        resumedAt: "2026-09-18T10:00:10.000Z"
      }]
    }]);
    return {
      workRows: timeline.filter(({ entry }) => entry.type === "work").map(({ entry }) => ({
        seconds: entry.seconds,
        reconciled: entry.reconciled === true
      })),
      totals: summarizeTimeline(timeline)
    };
  })()`);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    workRows: [{ seconds: 2, reconciled: true }],
    totals: { workSeconds: 2, breakSeconds: 10, idleSeconds: 0 },
  });
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
