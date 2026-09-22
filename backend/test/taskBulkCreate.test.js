const test = require("node:test");
const assert = require("node:assert/strict");
const Task = require("../src/models/Task");
const Team = require("../src/models/Team");
const Project = require("../src/models/Project");
const { createTasksBulk } = require("../src/controllers/taskController");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("bulk task creation reuses one configuration for every task name", async () => {
  const originals = {
    teamFind: Team.find,
    projectFindOne: Project.findOne,
    taskExists: Task.exists,
    insertMany: Task.insertMany,
  };
  let inserted;
  Team.find = async () => [{ _id: "team-1" }];
  Project.findOne = () => ({ select: () => ({ lean: async () => ({ teams: ["team-1"] }) }) });
  Task.exists = async () => false;
  Task.insertMany = async (tasks) => { inserted = tasks; return tasks.map((task, index) => ({ _id: `task-${index}`, ...task })); };

  try {
    const res = response();
    await createTasksBulk({
      user: { _id: "admin-1", role: "admin" },
      body: {
        taskNames: ["Research", "Implementation", "Review"],
        taskType: "work",
        project: "project-1",
        teams: ["team-1"],
        assignToAllEmployees: true,
        idleLogout: true,
      },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.tasks.length, 3);
    assert.deepEqual(inserted.map((task) => task.taskName), ["Research", "Implementation", "Review"]);
    assert.equal(new Set(inserted.map((task) => task.taskCode)).size, 3);
    for (const task of inserted) {
      assert.equal(task.project, "project-1");
      assert.deepEqual(task.teams, ["team-1"]);
      assert.equal(task.assignToAllEmployees, true);
      assert.deepEqual(task.assignedTo, []);
      assert.equal(task.idleLogout, true);
      assert.equal(task.createdBy, "admin-1");
    }
  } finally {
    Team.find = originals.teamFind;
    Project.findOne = originals.projectFindOne;
    Task.exists = originals.taskExists;
    Task.insertMany = originals.insertMany;
  }
});

test("bulk task creation rejects empty, duplicate, and oversized name batches", async () => {
  for (const [taskNames, message] of [
    [["Only one"], "Enter at least two task names."],
    [["One", ""], "Enter at least two task names."],
    [["Review", " review "], "Task names in the same batch must be unique."],
    [Array.from({ length: 26 }, (_, index) => `Task ${index}`), "Create no more than 25 tasks at once."],
  ]) {
    const res = response();
    await createTasksBulk({ user: { _id: "admin-1", role: "admin" }, body: { taskNames } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, message);
  }
});
