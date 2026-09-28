const test = require("node:test");
const assert = require("node:assert/strict");
const Task = require("../src/models/Task");
const Team = require("../src/models/Team");
const Project = require("../src/models/Project");
const { createTasksBulk, getAllTasks } = require("../src/controllers/taskController");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("bulk task creation reuses one configuration without a fixed batch limit", async () => {
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
    const taskNames = Array.from({ length: 30 }, (_, index) => `Task ${index + 1}`);
    const res = response();
    await createTasksBulk({
      user: { _id: "admin-1", role: "admin" },
      body: {
        taskNames,
        taskType: "work",
        project: "project-1",
        teams: ["team-1"],
        assignToAllEmployees: true,
        idleLogout: true,
      },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.tasks.length, 30);
    assert.deepEqual(inserted.map((task) => task.taskName), taskNames);
    assert.equal(new Set(inserted.map((task) => task.taskCode)).size, 30);
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

test("bulk task creation creates each task name for every selected project", async () => {
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
  Task.insertMany = async (tasks) => { inserted = tasks; return tasks; };

  try {
    const res = response();
    await createTasksBulk({
      user: { _id: "admin-1", role: "admin" },
      body: {
        taskNames: ["Research", "Review"],
        projects: ["project-1", "project-2"],
        taskType: "work",
        teams: ["team-1"],
        assignToAllEmployees: true,
      },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(inserted.length, 4);
    assert.deepEqual(
      inserted.map((task) => [task.taskName, task.project]),
      [
        ["Research", "project-1"],
        ["Review", "project-1"],
        ["Research", "project-2"],
        ["Review", "project-2"],
      ]
    );
  } finally {
    Team.find = originals.teamFind;
    Project.findOne = originals.projectFindOne;
    Task.exists = originals.taskExists;
    Task.insertMany = originals.insertMany;
  }
});

test("bulk task creation rejects empty and duplicate name batches", async () => {
  for (const [taskNames, message] of [
    [["Only one"], "Select at least two tasks or projects for bulk creation."],
    [["One", ""], "Select at least two tasks or projects for bulk creation."],
    [["Review", " review "], "Task names in the same batch must be unique."],
  ]) {
    const res = response();
    await createTasksBulk({ user: { _id: "admin-1", role: "admin" }, body: { taskNames } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, message);
  }
});

test("task management can request every matching task without pagination", async () => {
  const originals = {
    countDocuments: Task.countDocuments,
    find: Task.find,
  };
  const tasks = Array.from({ length: 78 }, (_, index) => ({ _id: `task-${index}` }));
  let skipCalled = false;
  let limitCalled = false;
  const query = {
    populate() { return this; },
    sort() { return this; },
    skip() { skipCalled = true; return this; },
    limit() { limitCalled = true; return this; },
    then(resolve) { return Promise.resolve(tasks).then(resolve); },
  };
  Task.countDocuments = async () => tasks.length;
  Task.find = () => query;

  try {
    const res = response();
    await getAllTasks({
      user: { _id: "admin-1", role: "admin" },
      query: { all: "true" },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tasks.length, 78);
    assert.equal(res.body.totalTasks, 78);
    assert.equal(res.body.totalPages, 1);
    assert.equal(skipCalled, false);
    assert.equal(limitCalled, false);
  } finally {
    Task.countDocuments = originals.countDocuments;
    Task.find = originals.find;
  }
});
