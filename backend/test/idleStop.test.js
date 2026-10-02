const test = require("node:test");
const assert = require("node:assert/strict");
const TaskTimeLog = require("../src/models/TaskTimeLog");
const { stopTimer } = require("../src/controllers/taskTimeLogController");

test("short configured idle thresholds remain separate, preserve IDs and are idempotent", async () => {
  const originalFind = TaskTimeLog.find;
  const originalFindOne = TaskTimeLog.findOne;
  TaskTimeLog.find = () => ({ lean: async () => [] });
  try {
    for (const seconds of [30, 60, 180, 300]) {
      let saves = 0;
      const timer = { _id: 'log', employee: 'employee', project: 'project', client: 'client', task: 'task',
        status: 'running', startedAt: new Date(Date.now() - 600_000), pauses: [],
        async save() { saves++; } };
      TaskTimeLog.findOne = async () => timer.status === 'running' ? timer : null;
      const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      const request = { user: { _id: 'employee' }, body: { idleSeconds: seconds } };
      await stopTimer(request, res);
      assert.equal(res.code, 200);
      assert.equal(timer.totalIdleSeconds, seconds);
      assert.ok(Math.abs(timer.totalWorkedSeconds - (600 - seconds)) <= 1);
      assert.deepEqual([timer._id, timer.employee, timer.project, timer.client, timer.task], ['log', 'employee', 'project', 'client', 'task']);
      await stopTimer(request, res);
      assert.equal(res.code, 404);
      assert.equal(timer.pauses.length, 1);
      assert.equal(saves, 1);
    }
  } finally {
    TaskTimeLog.find = originalFind;
    TaskTimeLog.findOne = originalFindOne;
  }
});

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
