const test = require("node:test");
const assert = require("node:assert/strict");
const TaskTimeLog = require("../src/models/TaskTimeLog");
const { closeStaleDesktopTimers, stoppedValues } = require("../src/services/desktopTimerLease");

test("disconnect closes a running timer at its last heartbeat, excluding overnight hours", async () => {
  const originalFind = TaskTimeLog.find;
  const originalUpdate = TaskTimeLog.updateOne;
  const start = new Date("2026-09-29T11:00:00.000Z");
  const heartbeat = new Date("2026-09-29T11:30:00.000Z");
  const nextMorning = new Date("2026-09-30T02:30:00.000Z");
  const log = { _id: "timer", employee: "employee", status: "running", isActiveTimer: true, startedAt: start, desktopHeartbeatAt: heartbeat, pauses: [] };
  let saved;
  TaskTimeLog.find = (filter) => {
    assert.equal(filter.employee, "employee");
    assert.ok(filter.desktopHeartbeatAt.$lte < nextMorning);
    return { lean: async () => [log] };
  };
  TaskTimeLog.updateOne = async (filter, update) => {
    assert.equal(filter.desktopHeartbeatAt, heartbeat);
    saved = update.$set;
    return { modifiedCount: 1 };
  };
  try {
    assert.equal(await closeStaleDesktopTimers(nextMorning, "employee"), 1);
    assert.equal(saved.stoppedAt, heartbeat);
    assert.equal(saved.totalWorkedSeconds, 1800);
    assert.equal(saved.status, "stopped");
    assert.equal(saved.stopReason, "desktop_disconnected");
  } finally {
    TaskTimeLog.find = originalFind;
    TaskTimeLog.updateOne = originalUpdate;
  }
});

test("disconnect closes an open break without counting it as work", () => {
  const values = stoppedValues({
    startedAt: new Date("2026-09-29T11:00:00.000Z"),
    pauses: [{ pausedAt: new Date("2026-09-29T11:10:00.000Z"), resumedAt: null, reason: "break" }],
  }, new Date("2026-09-29T11:20:00.000Z"));
  assert.equal(values.totalWorkedSeconds, 600);
  assert.equal(values.totalPausedSeconds, 600);
  assert.equal(values.pauses[0].resumedAt.toISOString(), "2026-09-29T11:20:00.000Z");
});
