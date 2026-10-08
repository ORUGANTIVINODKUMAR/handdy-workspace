const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function harness() {
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const start = renderer.indexOf("async function fetchAllPages(");
  const end = renderer.indexOf("function getOpenPauseReason(", start);
  const state = { token: "employee-a", urls: [], replies: [] };
  const context = vm.createContext({
    AbortSignal, Date, encodeURIComponent, API_REQUEST_TIMEOUT_MS: 1000,
    getToken: () => state.token,
    fetch: async (url) => {
      state.urls.push(new URL(url));
      const reply = state.replies.shift();
      if (reply instanceof Error) throw reply;
      if (typeof reply === "function") return reply();
      return { ok: true, json: async () => reply };
    },
  });
  vm.runInContext(`const reportSnapshots = new Map(); ${renderer.slice(start, end)}`, context);
  state.load = (options = {}) => context.fetchAllPages("https://example.test/time-logs/my?today=true", "timeLogs", state.token, { reportSync: true, ...options });
  return state;
}
const sync = { since: "2026-10-08T04:00:00Z", scope: "scope", references: "references" };

test("desktop timesheet uses one delta request and merges stopped, removed and new sessions", async () => {
  const state = harness();
  state.replies.push({ timeLogs: [{ _id: "a", status: "running" }], totalPages: 2, sync }, { timeLogs: [{ _id: "b" }], totalPages: 2, sync });
  const initial = await state.load();
  assert.equal(initial.items.length, 2);
  state.replies.push({ delta: true, sync, removedIds: ["b"], timeLogs: [{ _id: "a", status: "stopped", totalWorkedSeconds: 120 }, { _id: "c" }] });
  const refreshed = await state.load();
  assert.equal(state.urls.length, 3);
  assert.equal(state.urls[2].searchParams.get("syncSince"), sync.since);
  assert.equal(refreshed.items.length, 2);
  assert.equal(refreshed.items.find((row) => row._id === "a").status, "stopped");
  assert.equal(refreshed.items.some((row) => row._id === "b"), false);
  assert.equal(initial.items[0].status, "running");
  state.replies.push({ timeLogs: [], sync });
  await state.load({ force: true });
  assert.equal(state.urls[3].searchParams.get("syncSince"), null);
});

test("desktop works with old servers and never accepts a response after logout", async () => {
  const state = harness();
  state.replies.push({ timeLogs: [{ _id: "a" }], totalPages: 2 }, { timeLogs: [{ _id: "b" }], totalPages: 2 });
  await state.load();
  state.replies.push({ timeLogs: [] });
  await state.load();
  assert.equal(state.urls[2].searchParams.get("syncSince"), null);
  state.replies.push(() => {
    state.token = "employee-b";
    return { ok: true, json: async () => ({ timeLogs: [{ _id: "private" }], sync }) };
  });
  const late = await state.load();
  assert.equal(late.cancelled, true);
  assert.equal(late.items.length, 0);
  state.replies.push({ timeLogs: [], sync });
  await state.load();
  assert.equal(state.urls.at(-1).searchParams.get("syncSince"), null);
});

test("desktop failed page leaves the previous complete snapshot available", async () => {
  const state = harness();
  state.replies.push({ timeLogs: [{ _id: "complete" }], sync });
  await state.load();
  state.replies.push({ timeLogs: [{ _id: "partial" }], totalPages: 2, sync }, new Error("offline"));
  await assert.rejects(state.load({ force: true }), /offline/);
  state.replies.push({ delta: true, sync, timeLogs: [] });
  const recovered = await state.load();
  assert.equal(recovered.items.length, 1);
  assert.equal(recovered.items[0]._id, "complete");
});

test("session cleanup aborts the outstanding approval request and clears report snapshots", async () => {
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const monitor = renderer.slice(renderer.indexOf("async function monitorDeviceLoginRequests()"), renderer.indexOf("async function decideDeviceLogin("));
  const cleanup = renderer.slice(renderer.indexOf("function clearSessionLoops()"), renderer.indexOf("async function runTimerAction("));
  let signal;
  const context = vm.createContext({
    AbortController, AbortSignal, clearInterval() {}, clearIdleNoticeDisplay() {}, getToken: () => "test-token",
    fetch: (_url, options) => new Promise((_resolve, reject) => {
      signal = options.signal;
      signal.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    }),
  });
  vm.runInContext(`
    const reportSnapshots = new Map([["old", {}]]);
    const isLoginPage = false, API_BASE_URL = "https://example.test";
    let deviceApprovalAbortController = null, deviceApprovalMonitorActive = false, logoutPending = false;
    let idleMonitorInterval, timerHeartbeatInterval, idlePolicyRefreshInterval, timerInterval, dataRefreshInterval;
    let automaticIdlePause, lastIdleNoticeKey, idleAcknowledgedAt, pendingIdleStop;
    const idleStartedDialog = null;
    ${monitor} ${cleanup}
  `, context);
  const pending = context.monitorDeviceLoginRequests();
  assert.equal(signal.aborted, false);
  context.clearSessionLoops();
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(vm.runInContext("reportSnapshots.size", context), 0);
  assert.equal(vm.runInContext("deviceApprovalMonitorActive", context), false);
});
