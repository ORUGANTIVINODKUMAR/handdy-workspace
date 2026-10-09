const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProjectRateCopyPlan, applyProjectRateCopy } = require("../src/utils/projectRateRepair");
const { getEmployeeChargeRate, aggregateBillingLogs } = require("../src/utils/billingUtils");

const sourceId = "6aba1be59ed774bac4d14c44";
const targetId = "6abd2097a8fc41d49a1cd173";
const sourceProject = { _id: sourceId, projectName: "AUDIT", status: "Completed", teams: ["team1"] };
const targetProject = { _id: targetId, projectName: "AUDIT", status: "Active", teams: ["team1"] };
const employee = { _id: "employee1", employeeId: "10037", fullName: "Test Employee", projectRates: [{ project: sourceId, chargeRate: 13 }] };
const plan = (overrides = {}) => buildProjectRateCopyPlan({ sourceProject, targetProject, employees: [employee], workedEmployeeIds: [employee._id], ...overrides });

test("recreated project copies the employee's exact existing rate without mutating historic rates", () => {
  const before = structuredClone(employee);
  assert.deepEqual(plan().repairs.map((entry) => entry.chargeRate), [13]);
  assert.deepEqual(employee, before);
  assert.equal(getEmployeeChargeRate(employee, targetId), null);
});

test("existing destination rates are preserved, including rates that require manual review", () => {
  for (const chargeRate of [20, 0]) {
    const assigned = { ...employee, projectRates: [...employee.projectRates, { project: targetId, chargeRate }] };
    const result = plan({ employees: [assigned] });
    assert.equal(result.repairs.length, 0);
    assert.match(result.skipped[0].reason, /already has a rate/);
  }
});

test("missing, invalid and duplicate source rates cannot be copied", () => {
  for (const projectRates of [[], [{ project: sourceId, chargeRate: 0 }], [{ project: sourceId, chargeRate: "13" }], [{ project: sourceId, chargeRate: 1_000_001 }], [...employee.projectRates, ...employee.projectRates]]) {
    assert.equal(plan({ employees: [{ ...employee, projectRates }] }).repairs.length, 0);
  }
});

test("employees who did not work on the recreated project are outside the repair scope", () => {
  assert.deepEqual(plan({ workedEmployeeIds: ["otherEmployee"] }), { repairs: [], skipped: [] });
});

test("repair rejects unrelated projects, team changes, same ID and inactive destinations", () => {
  for (const target of [null, { ...targetProject, _id: sourceId }, { ...targetProject, projectName: "TAX" }, { ...targetProject, teams: ["team2"] }, { ...targetProject, status: "Completed" }, { ...targetProject, deletedAt: new Date() }]) {
    assert.throws(() => plan({ targetProject: target }));
  }
  assert.throws(() => plan({ sourceProject: { ...sourceProject, status: "Active" } }));
});

test("atomic repair appends one assignment with a snapshot guard and preserves other fields", async () => {
  let captured;
  const employeesCollection = { updateOne: async (filter, update) => { captured = { filter, update }; return { modifiedCount: 1 }; } };
  const now = new Date();
  assert.equal(await applyProjectRateCopy({ employeesCollection, repair: plan().repairs[0], targetProjectId: targetId, newRateId: "newAssignment", now }), true);
  assert.deepEqual(captured.filter, { _id: employee._id, projectRates: employee.projectRates });
  assert.deepEqual(captured.update, { $push: { projectRates: { _id: "newAssignment", project: targetId, chargeRate: 13 } }, $set: { updatedAt: now } });
  assert.equal(await applyProjectRateCopy({ employeesCollection: { updateOne: async () => ({ modifiedCount: 0 }) }, repair: plan().repairs[0] }), false);
});

test("copied rate repairs all work tasks on the new project and repeated preview is empty", () => {
  const corrected = { ...employee, projectRates: [...employee.projectRates, { project: targetId, chargeRate: plan().repairs[0].chargeRate }] };
  assert.equal(plan({ employees: [corrected] }).repairs.length, 0);
  assert.equal(getEmployeeChargeRate(corrected, sourceId), 13);
  const startedAt = new Date("2026-10-01T00:00:00Z");
  const stoppedAt = new Date("2026-10-01T10:00:00Z");
  const logs = [540, 3060, 22080].map((seconds, index) => ({
    _id: `log${index}`, project: targetId, task: `task${index}`,
    taskRecord: { _id: `task${index}`, taskName: `Task ${index}`, taskType: "work" },
    projectRecord: targetProject, startedAt, stoppedAt, totalWorkedSeconds: seconds,
  }));
  const args = { logs, startDate: "2026-10-01", endDate: "2026-10-01", timezone: "Asia/Kolkata", rangeStart: startedAt, rangeEnd: stoppedAt };
  const before = aggregateBillingLogs({ ...args, employee });
  const after = aggregateBillingLogs({ ...args, employee: corrected });
  assert.equal(before.summary.missingRateCount, 3);
  assert.equal(after.summary.missingRateCount, 0);
  assert.equal(after.summary.taskSeconds, before.summary.taskSeconds);
  // 25,680s = 7.1333h x $13 = $92.73 at full precision (older per-task hour rounding gave $92.69).
  assert.equal(after.summary.totalBillableAmount, 92.73);
  assert.ok(after.taskSummary.every((row) => row.chargeRate === 13 && row.billingWarning === null));
});
