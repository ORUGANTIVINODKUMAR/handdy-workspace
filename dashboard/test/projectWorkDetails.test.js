import assert from "node:assert/strict";
import test from "node:test";

import { buildChronologicalReportTimeline } from "../src/utils/timeLogTimeline.js";
import { buildProjectWorkDetails } from "../src/utils/projectWorkDetails.js";
import { getWorkedSeconds } from "../src/utils/timeLogReportHelpers.js";

test("employee/project detail totals include switch idle and separate break-task time", () => {
  const employee = { _id: "e1", fullName: "Employee One" };
  const project = { _id: "p1", projectName: "Audit" };
  const records = [
    { _id: "work", employee, project, task: { _id: "t1", taskType: "work" },
      status: "stopped", startedAt: "2026-09-29T10:00:00Z", stoppedAt: "2026-09-29T10:01:00Z",
      totalWorkedSeconds: 60, totalIdleSeconds: 0, pauses: [] },
    { _id: "break", employee, project, task: { _id: "t2", taskType: "break" },
      status: "stopped", startedAt: "2026-09-29T10:01:10Z", stoppedAt: "2026-09-29T10:02:00Z",
      totalWorkedSeconds: 50, totalIdleSeconds: 0, pauses: [] },
  ];
  const timeline = buildChronologicalReportTimeline(records, { includeGaps: true });
  const details = buildProjectWorkDetails(records, timeline);

  assert.equal(getWorkedSeconds(records[1]), 0);
  assert.equal(details.length, 1);
  assert.equal(details[0].projects[0].sessions, 2);
  assert.equal(details[0].projects[0].workedSeconds, 60);
  assert.equal(details[0].projects[0].breakSeconds, 50);
  assert.equal(details[0].projects[0].idleSeconds, 10);
});

test("project filtering does not turn intervening work on another project into idle", () => {
  const employee = { _id: "e1", fullName: "Employee One" };
  const projectA = { _id: "a", projectName: "Audit" };
  const projectB = { _id: "b", projectName: "Tax" };
  const record = (id, project, start, end) => ({
    _id: id, employee, project, task: { taskType: "work" }, status: "stopped",
    startedAt: `2026-09-29T10:${start}Z`, stoppedAt: `2026-09-29T10:${end}Z`,
    totalWorkedSeconds: 60, totalIdleSeconds: 0, pauses: [],
  });
  const allRecords = [
    record("a1", projectA, "00:00", "01:00"),
    record("b", projectB, "01:05", "02:05"),
    record("a2", projectA, "02:10", "03:10"),
  ];
  const projectARecords = allRecords.filter((item) => item.project._id === "a");
  const projectAGaps = buildChronologicalReportTimeline(allRecords, { includeGaps: true })
    .filter(({ record: item }) => item.project._id === "a");
  const details = buildProjectWorkDetails(projectARecords, projectAGaps);

  assert.equal(details[0].projects[0].workedSeconds, 120);
  assert.equal(details[0].projects[0].idleSeconds, 5);
});
