const test = require("node:test");
const assert = require("node:assert/strict");
const TaskTimeLog = require("../src/models/TaskTimeLog");
const { stopTimer } = require("../src/controllers/taskTimeLogController");

test("inactivity stop stores a red idle interval and excludes it from worked time", async () => {
  const originalFind = TaskTimeLog.find;
  const originalFindOne = TaskTimeLog.findOne;
  const startedAt = new Date(Date.now() - 600_000);
  const timer = {
    status: "running", startedAt, pauses: [],
    async save() {},
  };
  TaskTimeLog.find = () => ({ lean: async () => [] });
  TaskTimeLog.findOne = async () => timer;
  try {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await stopTimer({ user: { _id: "employee" }, body: { idleSeconds: 300 } }, res);
    assert.equal(res.code, 200);
    assert.equal(timer.status, "stopped");
    assert.equal(timer.pauses.length, 1);
    assert.equal(timer.pauses[0].reason, "idle");
    assert.equal(timer.totalIdleSeconds, 300);
    assert.equal(timer.totalPausedSeconds, 300);
    assert.ok(timer.totalWorkedSeconds >= 299 && timer.totalWorkedSeconds <= 300);
  } finally {
    TaskTimeLog.find = originalFind;
    TaskTimeLog.findOne = originalFindOne;
  }
});
