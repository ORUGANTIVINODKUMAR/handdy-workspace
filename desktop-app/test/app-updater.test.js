const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createUpdateService, startAppUpdater, STARTUP_DELAY_MS, CHECK_INTERVAL_MS, RETRY_INTERVAL_MS } = require("../app-updater");

function harness(options = {}) {
  const app = Object.assign(new EventEmitter(), { isPackaged: true, getVersion: () => "1.2.23" });
  const updater = new EventEmitter();
  let calls = 0;
  updater.checkForUpdates = async () => { calls += 1; return options.check?.(updater); };
  updater.quitAndInstall = () => assert.fail("An update must never force CRM to close");
  app.quit = () => assert.fail("An update must never force CRM to close");
  const timers = new Set();
  const logs = [];
  const notifications = [];
  class Notification {
    static isSupported() { return true; }
    constructor(details) { this.details = details; }
    show() { if (options.notificationError) throw new Error("Notification unavailable"); notifications.push(this.details); }
  }
  const service = createUpdateService({
    app, autoUpdater: updater, platform: "win32", Notification,
    logger: Object.fromEntries(["info", "warn", "error"].map(level => [level, message => logs.push(message)])),
    schedule: (callback, delay) => { const timer = { callback, delay, unref() {} }; timers.add(timer); return timer; },
    cancel: timer => timers.delete(timer),
  });
  return { app, updater, service, timers, logs, notifications, calls: () => calls };
}

test("development and non-Windows runs do not initialize/check updates", () => {
  assert.equal(createUpdateService({ app: { isPackaged: false } }), null);
  assert.equal(createUpdateService({ app: { isPackaged: true }, platform: "linux" }), null);
  assert.equal(startAppUpdater({ isPackaged: false }), undefined);
});

test("checks after startup; no new version schedules the next check", async () => {
  const h = harness({ check: updater => updater.emit("update-not-available", { version: "1.2.23" }) });
  assert.equal(h.calls(), 0);
  assert.equal([...h.timers][0].delay, STARTUP_DELAY_MS);
  assert.equal(h.updater.autoDownload, true);
  assert.equal(h.updater.autoInstallOnAppQuit, true);
  assert.equal(h.updater.autoRunAppAfterInstall, false);
  assert.equal(h.updater.allowPrerelease, false);
  assert.equal(h.updater.allowDowngrade, false);
  await h.service.check();
  assert.equal(h.calls(), 1);
  assert.equal([...h.timers][0].delay, CHECK_INTERVAL_MS);
  assert.ok(h.logs.some(line => line.includes("No new version")));
});

for (const failure of ["No internet", "GitHub unavailable", "Download failure"]) {
  test(`${failure} stays nonfatal and retries`, async () => {
    const h = harness({ check: updater => {
      updater.emit("error", new Error(failure));
      if (failure === "Download failure") return { downloadPromise: Promise.reject(new Error(failure)) };
      throw new Error(failure);
    } });
    await h.service.check();
    assert.equal([...h.timers][0].delay, RETRY_INTERVAL_MS);
    assert.ok(h.logs.some(line => line.includes(failure)));
    await h.service.check();
    assert.equal(h.calls(), 2);
  });
}

test("downloads without closing CRM; ready notification appears once and polling stops", async () => {
  const h = harness({ check: updater => {
    updater.emit("checking-for-update");
    updater.emit("update-available", { version: "1.2.24" });
    updater.emit("download-progress", { percent: 52, transferred: 52, total: 100 });
    updater.emit("update-downloaded", { version: "1.2.24" });
    updater.emit("update-downloaded", { version: "1.2.24" });
    return { downloadPromise: Promise.resolve() };
  } });
  await h.service.check();
  await h.service.check();
  assert.equal(h.calls(), 1);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.timers.size, 0);
  assert.ok(h.logs.some(line => line.includes("52%")));
});

test("checks cannot overlap with an in-progress download", async () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const h = harness({ check: () => ({ downloadPromise: pending }) });
  const first = h.service.check();
  await h.service.check();
  assert.equal(h.calls(), 1);
  complete();
  await first;
});

test("notification failure stays nonfatal; cancelled quit retains polling", async () => {
  const h = harness({ notificationError: true });
  h.app.emit("before-quit");
  assert.equal(h.timers.size, 1);
  h.updater.emit("update-downloaded", { version: "1.2.24" });
  assert.ok(h.logs.some(line => line.includes("Could not show")));
});

test("actual quit stops checks; next launch checks again", async () => {
  const h = harness();
  h.app.emit("will-quit");
  assert.equal(h.timers.size, 0);
  await h.service.check();
  assert.equal(h.calls(), 0);
  const restarted = harness();
  await restarted.service.check();
  assert.equal(restarted.calls(), 1);
});
