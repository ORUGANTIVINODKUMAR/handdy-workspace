const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeCompletedIdlePauses, calculateTimeLogTotals } = require("../src/utils/idleSegmentMerge");
const { clipTimeLogToRange, resumeTimer, stopTimer } = require("../src/controllers/taskTimeLogController");
const { stoppedValues, closeStaleDesktopTimers } = require("../src/services/desktopTimerLease");
const { aggregateBillingLogs, getBillingDateRange } = require("../src/utils/billingUtils");
const TaskTimeLog = require("../src/models/TaskTimeLog");
const Task = require("../src/models/Task");

const date = (clock) => new Date(`2026-10-01T${clock}Z`);
const idle = (start, end, reason = "idle") => ({
  pausedAt: date(start), resumedAt: end ? date(end) : null, reason,
});
const example = () => ({
  _id: "log-a", employee: "employee-a", project: "project-a", client: "client-a", task: "task-a",
  note: "Original note", startedAt: date("02:02:58"), stoppedAt: date("02:08:09"),
  status: "stopped", isActiveTimer: false, pauses: [idle("02:03:06", "02:08:09")],
});
const res = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test("example merges 303 idle seconds into the preceding 8 seconds, preserving identity", () => {
  const log = example();
  const identity = { ...log, pauses: undefined };
  assert.equal(mergeCompletedIdlePauses(log, "work"), true);
  assert.equal(log.pauses[0].mergedIntoPreviousWork, true);
  assert.deepEqual({ ...log, pauses: undefined }, identity);
  assert.deepEqual(calculateTimeLogTotals(log, log.stoppedAt), {
    totalWorkedSeconds: 311, totalIdleSeconds: 0, totalPausedSeconds: 0,
  });
  assert.equal(mergeCompletedIdlePauses(log, "work"), false);
  assert.equal(calculateTimeLogTotals(log, log.stoppedAt).totalWorkedSeconds, 311);
});

test("no preceding work, missing task, and break tasks cannot receive idle time", () => {
  const noWork = example();
  noWork.startedAt = noWork.pauses[0].pausedAt;
  assert.equal(mergeCompletedIdlePauses(noWork, "work"), false);
  assert.equal(mergeCompletedIdlePauses(example(), "break"), false);
  assert.equal(mergeCompletedIdlePauses(example(), null), false);
});

test("open idle, invalid end, zero duration and out-of-session idle remain separate", () => {
  for (const pause of [idle("02:03:06", null), idle("02:03:06", "02:03:06"),
    idle("02:03:06", "02:10:00"), { ...idle("02:03:06", null), resumedAt: "invalid" }]) {
    assert.equal(mergeCompletedIdlePauses({ ...example(), pauses: [pause] }, "work"), false);
  }
});

test("idle directly after a break or another idle does not skip back to older work", () => {
  for (const reason of ["break", "manual", "idle"]) {
    const log = example();
    log.pauses = [idle("02:03:06", "02:04:00", reason), idle("02:04:00", "02:08:09")];
    mergeCompletedIdlePauses(log, "work");
    assert.equal(Boolean(log.pauses[1].mergedIntoPreviousWork), false);
  }
});

test("overlapping or duplicate idle events stay unmerged and union totals count time once", () => {
  for (const other of [idle("02:03:06", "02:08:09"), idle("02:04:00", "02:06:00", "break")]) {
    const log = example();
    log.pauses.push(other);
    assert.equal(mergeCompletedIdlePauses(log, "work"), false);
    assert.equal(calculateTimeLogTotals(log, log.stoppedAt).totalWorkedSeconds, 8);
    assert.equal(calculateTimeLogTotals(log, log.stoppedAt).totalPausedSeconds, 303);
  }
});

test("only the work immediately before idle receives its time; earlier breaks remain", () => {
  const log = example();
  log.pauses.unshift(idle("02:03:00", "02:03:04", "break"));
  assert.equal(mergeCompletedIdlePauses(log, "work"), true);
  assert.equal(log.pauses[0].mergedIntoPreviousWork, undefined);
  assert.equal(calculateTimeLogTotals(log, log.stoppedAt).totalWorkedSeconds, 307);
});

test("merged time survives report clipping and billing without changing IDs or rates", () => {
  const log = example();
  mergeCompletedIdlePauses(log, "work");
  Object.assign(log, calculateTimeLogTotals(log, log.stoppedAt));
  const clipped = clipTimeLogToRange(log, { start: date("02:04:00"), endExclusive: date("02:08:00") });
  assert.equal(clipped.totalWorkedSeconds, 240);
  assert.equal(clipped.totalIdleSeconds, 0);
  assert.equal(clipped.pauses[0].mergedIntoPreviousWork, true);
  const range = getBillingDateRange("2026-10-01", "2026-10-01", "UTC");
  const report = aggregateBillingLogs({
    logs: [{ ...log, taskRecord: { _id: log.task, taskType: "work" },
      projectRecord: { _id: log.project, serviceType: "Software" } }],
    employee: { projectRates: [{ project: log.project, chargeRate: 100 }] },
    startDate: "2026-10-01", endDate: "2026-10-01", timezone: "UTC",
    rangeStart: range.start, rangeEnd: range.endExclusive,
  });
  assert.equal(report.summary.taskSeconds, 311);
  assert.equal(report.dailyDetails[0].entries.length, 1);
  assert.equal(report.taskSummary[0].taskId, log.task);
  assert.equal(report.taskSummary[0].projectId, log.project);
  assert.equal(report.taskSummary[0].chargeRate, 100);
  assert.equal(report.summary.totalBillableAmount, 9);
});

test("cross-midnight merged idle is split correctly across billing days", () => {
  const log = example();
  log.startedAt = new Date("2026-09-30T23:59:50Z");
  log.stoppedAt = new Date("2026-10-01T00:05:00Z");
  log.pauses = [{ reason: "idle", pausedAt: new Date("2026-09-30T23:59:58Z"), resumedAt: log.stoppedAt }];
  mergeCompletedIdlePauses(log, "work");
  Object.assign(log, calculateTimeLogTotals(log, log.stoppedAt));
  const range = getBillingDateRange("2026-09-30", "2026-10-01", "UTC");
  const report = aggregateBillingLogs({ logs: [log], employee: {}, timezone: "UTC",
    startDate: "2026-09-30", endDate: "2026-10-01", rangeStart: range.start, rangeEnd: range.endExclusive });
  assert.deepEqual(report.dailyDetails.map((day) => day.taskSeconds), [10, 300]);
  assert.equal(report.summary.taskSeconds, 310);
});

test("disconnect finalizes eligible idle only through the last heartbeat", () => {
  const log = example();
  log.pauses[0].resumedAt = null;
  const values = stoppedValues(log, log.stoppedAt, "work");
  assert.equal(values.pauses[0].mergedIntoPreviousWork, true);
  assert.equal(values.totalWorkedSeconds, 311);
  assert.equal(values.stoppedAt, log.stoppedAt);
});

test("idle resume atomically saves the closed pause, merge marker and totals; retries do not write", async () => {
  const original = { find: TaskTimeLog.find, findOne: TaskTimeLog.findOne,
    update: TaskTimeLog.findOneAndUpdate, exists: Task.exists };
  const snapshot = { ...example(), stoppedAt: null, status: "paused", isActiveTimer: true };
  snapshot.pauses[0].resumedAt = null;
  let writes = 0;
  TaskTimeLog.find = () => ({ lean: async () => [] });
  TaskTimeLog.findOne = () => ({ lean: async () => writes ? null : structuredClone(snapshot) });
  Task.exists = async () => ({ _id: snapshot.task });
  TaskTimeLog.findOneAndUpdate = async (filter, update, options) => {
    if (writes) return null;
    assert.equal(filter.employee, snapshot.employee);
    assert.equal(filter._id, snapshot._id);
    assert.deepEqual(filter.pauses, snapshot.pauses);
    assert.equal(options.arrayFilters, undefined);
    assert.equal(update.$set.pauses[0].mergedIntoPreviousWork, true);
    assert.ok(update.$set.pauses[0].resumedAt instanceof Date);
    assert.equal(update.$set.totalIdleSeconds, 0);
    assert.equal(update.$set.totalPausedSeconds, 0);
    writes += 1;
    return { ...snapshot, ...update.$set };
  };
  try {
    const first = res();
    await resumeTimer({ user: { _id: snapshot.employee }, body: { reason: "idle" } }, first);
    assert.equal(first.code, 200);
    const duplicate = res();
    await resumeTimer({ user: { _id: snapshot.employee }, body: { reason: "idle" } }, duplicate);
    assert.equal(duplicate.code, 404);
    assert.equal(writes, 1);
  } finally {
    TaskTimeLog.find = original.find; TaskTimeLog.findOne = original.findOne;
    TaskTimeLog.findOneAndUpdate = original.update; Task.exists = original.exists;
  }
});

test("a delayed idle stop identifies the old log and cannot stop a newly selected task", async () => {
  const original = { find: TaskTimeLog.find, findOne: TaskTimeLog.findOne };
  TaskTimeLog.find = () => ({ lean: async () => [] });
  TaskTimeLog.findOne = async (filter) => {
    assert.equal(filter._id, "old-log");
    assert.equal(filter.employee, "employee-a");
    return null;
  };
  try {
    const response = res();
    await stopTimer({ user: { _id: "employee-a" }, body: { timeLogId: "old-log", idleSeconds: 303 } }, response);
    assert.equal(response.code, 404);
  } finally { TaskTimeLog.find = original.find; TaskTimeLog.findOne = original.findOne; }
});

test("inactivity stop persists merge and totals together, preserving every task field", async () => {
  const original = { find: TaskTimeLog.find, findOne: TaskTimeLog.findOne,
    update: TaskTimeLog.findOneAndUpdate, exists: Task.exists };
  const startedAt = new Date(Date.now() - 311_000);
  const log = { ...example(), startedAt, stoppedAt: null, status: "running", pauses: [] };
  let saved;
  TaskTimeLog.find = () => ({ lean: async () => [] });
  TaskTimeLog.findOne = async () => saved ? null : log;
  Task.exists = async () => ({ _id: log.task });
  TaskTimeLog.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.status, "running");
    assert.equal(filter.task, log.task);
    assert.deepEqual(filter.pauses, []);
    assert.equal(update.$set.pauses[0].mergedIntoPreviousWork, true);
    assert.equal(update.$set.totalIdleSeconds, 0);
    assert.equal(update.$set.totalPausedSeconds, 0);
    assert.ok(update.$set.totalWorkedSeconds >= 311 && update.$set.totalWorkedSeconds <= 312);
    for (const field of ["_id", "employee", "project", "client", "task", "note", "startedAt"]) {
      assert.equal(Object.hasOwn(update.$set, field), false);
    }
    saved = { ...log, ...update.$set };
    return saved;
  };
  try {
    const response = res();
    await stopTimer({ user: { _id: log.employee }, body: { idleSeconds: 303 } }, response);
    assert.equal(response.code, 200);
    const duplicate = res();
    await stopTimer({ user: { _id: log.employee }, body: { idleSeconds: 303 } }, duplicate);
    assert.equal(duplicate.code, 404);
    assert.equal(saved.totalIdleSeconds, 0);
  } finally {
    TaskTimeLog.find = original.find; TaskTimeLog.findOne = original.findOne;
    TaskTimeLog.findOneAndUpdate = original.update; Task.exists = original.exists;
  }
});

test("concurrent stop changes reject the merge instead of overwriting pause history", async () => {
  const original = { find: TaskTimeLog.find, findOne: TaskTimeLog.findOne,
    update: TaskTimeLog.findOneAndUpdate, exists: Task.exists };
  const log = { ...example(), stoppedAt: null, status: "running" };
  TaskTimeLog.find = () => ({ lean: async () => [] });
  TaskTimeLog.findOne = async () => log;
  Task.exists = async () => ({ _id: log.task });
  TaskTimeLog.findOneAndUpdate = async () => null;
  try {
    const response = res();
    await stopTimer({ user: { _id: log.employee }, body: {} }, response);
    assert.equal(response.code, 409);
  } finally {
    TaskTimeLog.find = original.find; TaskTimeLog.findOne = original.findOne;
    TaskTimeLog.findOneAndUpdate = original.update; Task.exists = original.exists;
  }
});

test("Mongoose retains the merge marker without adding fields to legacy pauses", () => {
  const pause = idle("02:03:06", "02:08:09");
  const log = new TaskTimeLog({ startedAt: date("02:02:58"), pauses: [pause] });
  assert.equal(Object.hasOwn(log.toObject().pauses[0], "mergedIntoPreviousWork"), false);
  mergeCompletedIdlePauses(log, "work");
  assert.equal(log.toObject().pauses[0].mergedIntoPreviousWork, true);
});

test("cleanup uses task eligibility and a pause snapshot guard in its atomic update", async () => {
  const original = { find: TaskTimeLog.find, update: TaskTimeLog.updateOne, exists: Task.exists };
  const log = { ...example(), stoppedAt: null, status: "paused", isActiveTimer: true,
    desktopHeartbeatAt: date("02:08:09") };
  log.pauses[0].resumedAt = null;
  TaskTimeLog.find = () => ({ lean: async () => [log] });
  Task.exists = async (filter) => { assert.equal(filter.taskType, "work"); return { _id: log.task }; };
  TaskTimeLog.updateOne = async (filter, update) => {
    assert.deepEqual(filter.pauses, log.pauses);
    assert.equal(update.$set.totalWorkedSeconds, 311);
    assert.equal(update.$set.totalIdleSeconds, 0);
    assert.equal(update.$set.pauses[0].mergedIntoPreviousWork, true);
    return { modifiedCount: 1 };
  };
  try { assert.equal(await closeStaleDesktopTimers(date("10:00:00"), log.employee), 1); }
  finally { TaskTimeLog.find = original.find; TaskTimeLog.updateOne = original.update; Task.exists = original.exists; }
});
