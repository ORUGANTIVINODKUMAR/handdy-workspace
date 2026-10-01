import test from "node:test";
import assert from "node:assert/strict";
import { buildClientTimesheet, getTimesheetClient, flattenClientTimesheet } from "../src/utils/clientTimesheet.js";
import { buildChronologicalReportTimeline } from "../src/utils/timeLogTimeline.js";

const client = (key, name = key) => ({ _id: key, clientName: name });
const record = (key, employee, clientKey, project, task, seconds = 60) => ({
  _id: key, employee: { _id: employee, fullName: employee }, client: client(clientKey),
  project: { _id: project, projectName: project }, task: { _id: task, taskName: task, taskType: "work" },
  status: "stopped", startedAt: "2026-10-01T10:00:00Z", stoppedAt: "2026-10-01T10:01:00Z",
  pauses: [], totalWorkedSeconds: seconds, totalIdleSeconds: 0,
});

test("groups multiple employees, clients, projects and tasks with exact totals at every level", () => {
  const records = [record("1", "John", "ABC", "Tax", "Prepare", 60),
    record("2", "John", "ABC", "Tax", "Review", 120), record("3", "John", "ABC", "Books", "Reconcile", 180),
    record("4", "John", "XYZ", "Monthly", "Review", 240), record("5", "Jane", "ABC", "Tax", "Prepare", 300),
    record("6", "John", "ABC", "Tax", "Prepare", 30)];
  const before = JSON.stringify(records);
  const employees = buildClientTimesheet(records);
  const john = employees.find((item) => item.key === "John");
  assert.equal(john.workedSeconds, 630);
  assert.equal(john.sessions, 5);
  assert.equal(john.clients.length, 2);
  const abc = john.clients.find((item) => item.key === "ABC");
  assert.equal(abc.workedSeconds, 390);
  assert.equal(abc.projects.length, 2);
  const tax = abc.projects.find((item) => item.key === "Tax");
  assert.equal(tax.workedSeconds, 210);
  assert.equal(tax.tasks.length, 2);
  assert.equal(tax.tasks.find((item) => item.key === "Prepare").workedSeconds, 90);
  assert.equal(employees.find((item) => item.key === "Jane").workedSeconds, 300);
  assert.equal(JSON.stringify(records), before);
  const exported = flattenClientTimesheet(employees);
  assert.equal(exported.length, 5);
  assert.equal(exported.reduce((sum, row) => sum + row.workedSeconds, 0), 930);
});

test("uses recorded client for a shared project and never duplicates ambiguous historical time", () => {
  const log = record("a", "John", "XYZ", "Shared", "Review");
  log.project.client = client("ABC");
  log.project.clients = [client("ABC"), client("XYZ")];
  assert.equal(getTimesheetClient(log).key, "XYZ");
  log.client = null;
  assert.equal(getTimesheetClient(log).key, "unassigned-client");
  const result = buildClientTimesheet([log]);
  assert.equal(result[0].clients.length, 1);
  assert.equal(result[0].workedSeconds, 60);
});

test("supports project client references, legacy client names, missing relations and same-name IDs", () => {
  const log = record("a", "John", "XYZ", "Shared", "Review");
  log.client = null;
  log.project.client = client("ABC");
  assert.equal(getTimesheetClient(log).key, "ABC");
  log.project.client = null;
  log.project.clients = [client("XYZ")];
  assert.equal(getTimesheetClient(log).key, "XYZ");
  log.project.clients = [];
  log.project.clientName = "Legacy Co";
  assert.equal(getTimesheetClient(log).name, "Legacy Co");
  const other = record("b", "John", "different-id", "Shared", "Review");
  other.client.clientName = "Legacy Co";
  assert.equal(buildClientTimesheet([log, other])[0].clients.length, 2);
  const missing = { ...log, _id: "missing", employee: null, project: null, task: null, client: null };
  assert.equal(buildClientTimesheet([missing])[0].clients[0].name, "Unassigned client");
});

test("repeated log IDs and repeated gap rows are counted once", () => {
  const log = record("a", "John", "ABC", "Tax", "Prepare");
  const gap = { record: log, entry: { source: "between_sessions", durationSeconds: 20,
    start: "2026-10-01T10:01:00Z", end: "2026-10-01T10:01:20Z" } };
  const result = buildClientTimesheet([log, { ...log }], [gap, gap]);
  assert.equal(result[0].workedSeconds, 60);
  assert.equal(result[0].sessions, 1);
  assert.equal(result[0].idleSeconds, 20);
});

test("keeps idle and break totals separate from worked time at every hierarchy level", () => {
  const log = record("a", "John", "ABC", "Tax", "Prepare", 8);
  log.startedAt = "2026-10-01T02:02:58Z";
  log.stoppedAt = "2026-10-01T02:08:09Z";
  log.pauses = [{ reason: "idle", pausedAt: "2026-10-01T02:03:06Z", resumedAt: log.stoppedAt }];
  log.totalIdleSeconds = 303;
  const breakLog = record("b", "John", "ABC", "Tax", "Lunch", 60);
  breakLog.task.taskType = "break";
  const result = buildClientTimesheet([log, breakLog]);
  const employee = result[0];
  const clientNode = employee.clients[0];
  const project = clientNode.projects[0];
  for (const node of [employee, clientNode, project]) {
    assert.equal(node.workedSeconds, 8);
    assert.equal(node.idleSeconds, 303);
    assert.equal(node.breakSeconds, 60);
  }
  const task = project.tasks.find((item) => item.name === "Prepare");
  assert.equal(task.workedSeconds, 8);
  assert.equal(task.idleSeconds, 303);
});

test("same-day task switch gap stays with the preceding client, and filtered gaps cannot create new clients", () => {
  const first = record("a", "John", "ABC", "Tax", "Prepare");
  const next = record("b", "John", "XYZ", "Monthly", "Review");
  next.startedAt = "2026-10-01T10:02:00Z"; next.stoppedAt = "2026-10-01T10:03:00Z";
  const rows = buildChronologicalReportTimeline([first, next], { includeGaps: true });
  const result = buildClientTimesheet([first, next], rows);
  assert.equal(result[0].clients.find((node) => node.key === "ABC").idleSeconds, 60);
  assert.equal(result[0].clients.find((node) => node.key === "XYZ").idleSeconds, 0);
  const filtered = buildClientTimesheet([next], rows);
  assert.equal(filtered[0].clients.length, 1);
  assert.equal(filtered[0].idleSeconds, 0);
});

test("an active overnight session uses the existing worked-time calculation", () => {
  const log = record("a", "John", "ABC", "Tax", "Prepare");
  log.startedAt = new Date(Date.now() - 86_500_000).toISOString();
  log.stoppedAt = null; log.status = "running";
  const result = buildClientTimesheet([log]);
  assert.ok(result[0].workedSeconds >= 86_500 && result[0].workedSeconds <= 86_501);
});
