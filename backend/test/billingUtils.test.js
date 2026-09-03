const test = require("node:test");
const assert = require("node:assert/strict");
const {
  aggregateBillingLogs,
  getBillingDateRange,
  getBillingEmployeeAccess,
} = require("../src/utils/billingUtils");

const employee = {
  _id: "64b000000000000000000001",
  employeeId: "EMP-1",
  fullName: "Lee Thomas",
  serviceRates: [
    { serviceType: "Tax", chargeRate: 25 },
    { serviceType: "Audit", chargeRate: 30 },
  ],
};
const workTask = { _id: "64b000000000000000000000011", taskName: "Tax Preparation", taskType: "work", serviceType: "Tax" };
const secondTask = { _id: "64b000000000000000000000012", taskName: "Review", taskType: "work", serviceType: "Audit" };
const breakTask = { _id: "64b000000000000000000000013", taskName: "Break", taskType: "break" };
const project = { _id: "64b000000000000000000000021", projectName: "ABC CPA", clientName: "ABC" };

const log = (id, taskRecord, startedAt, seconds, projectRecord = project) => ({
  _id: id,
  employee: employee._id,
  task: taskRecord._id,
  project: projectRecord._id,
  taskRecord,
  projectRecord,
  startedAt: new Date(startedAt),
  stoppedAt: new Date(Date.parse(startedAt) + seconds * 1000),
  totalWorkedSeconds: seconds,
  pauses: [],
});

const reportFor = (logs, startDate = "2026-08-01", endDate = "2026-08-03") => {
  const range = getBillingDateRange(startDate, endDate, "UTC");
  return aggregateBillingLogs({ logs, employee, startDate, endDate, timezone: "UTC", rangeStart: range.start, rangeEnd: range.endExclusive });
};

test("same task across days and sessions is aggregated by task ID", () => {
  const report = reportFor([
    log("1", workTask, "2026-08-01T09:00:00Z", 3600),
    log("2", workTask, "2026-08-02T09:00:00Z", 7200),
    log("3", workTask, "2026-08-03T09:00:00Z", 2700),
  ]);
  assert.equal(report.taskSummary.length, 1);
  assert.equal(report.taskSummary[0].totalSeconds, 13_500);
  assert.equal(report.summary.taskSeconds, 13_500);
});

test("multiple work tasks and break tasks have separate totals", () => {
  const report = reportFor([
    log("1", workTask, "2026-08-01T09:00:00Z", 10_800),
    log("2", secondTask, "2026-08-01T12:00:00Z", 7200),
    log("3", breakTask, "2026-08-01T14:00:00Z", 3600),
  ]);
  assert.equal(report.summary.taskSeconds, 18_000);
  assert.equal(report.summary.breakSeconds, 3600);
  assert.equal(report.summary.totalSeconds, 21_600);
  assert.equal(report.taskSummary.length, 2);
});

test("billing applies the employee rate for each task service", () => {
  const report = reportFor([
    log("1", workTask, "2026-08-01T09:00:00Z", 7200),
    log("2", secondTask, "2026-08-01T11:00:00Z", 1800),
  ]);
  assert.equal(report.taskSummary[0].serviceType, "Audit");
  assert.equal(report.taskSummary[0].billableAmount, 15);
  assert.equal(report.taskSummary[1].serviceType, "Tax");
  assert.equal(report.taskSummary[1].billableAmount, 50);
  assert.equal(report.summary.totalBillableAmount, 65);
  assert.equal(report.summary.missingRateCount, 0);
});

test("billing amount uses the displayed two-decimal billable hours", () => {
  const report = reportFor([log("1", workTask, "2026-08-01T09:00:00Z", 11_040)]);
  assert.equal(report.taskSummary[0].totalSeconds, 11_040);
  assert.equal(report.taskSummary[0].billableAmount, 76.75);
});

test("billing returns a warning and no amount when a service rate is missing", () => {
  const bookkeepingTask = {
    _id: "64b000000000000000000000099",
    taskName: "Monthly books",
    taskType: "work",
    serviceType: "Bookkeeping",
  };
  const report = reportFor([log("1", bookkeepingTask, "2026-08-01T09:00:00Z", 3600)]);
  assert.equal(report.taskSummary[0].chargeRate, null);
  assert.equal(report.taskSummary[0].billableAmount, null);
  assert.equal(report.taskSummary[0].billingWarning, "Charge rate not configured.");
  assert.equal(report.summary.totalBillableAmount, 0);
  assert.equal(report.summary.missingRateCount, 1);
});

test("paused time is not added back into a completed timer session", () => {
  const pausedLog = log("1", workTask, "2026-08-01T09:00:00Z", 5400);
  pausedLog.totalWorkedSeconds = 3600;
  pausedLog.pauses = [{ pausedAt: new Date("2026-08-01T09:30:00Z"), resumedAt: new Date("2026-08-01T10:00:00Z") }];
  const report = reportFor([pausedLog]);
  assert.equal(report.summary.taskSeconds, 3600);
  assert.equal(report.summary.totalSeconds, 3600);
});

test("same task name in different projects is not combined", () => {
  const otherProject = { _id: "64b000000000000000000000022", projectName: "XYZ CPA" };
  const sameNameTask = { _id: "64b000000000000000000000014", taskName: "Tax Preparation", taskType: "work" };
  const report = reportFor([
    log("1", workTask, "2026-08-01T09:00:00Z", 3600),
    log("2", sameNameTask, "2026-08-01T10:00:00Z", 3600, otherProject),
  ]);
  assert.equal(report.taskSummary.length, 2);
  assert.equal(report.projects.length, 2);
});

test("date boundaries clip overnight records to the selected period", () => {
  const report = reportFor([
    log("1", workTask, "2026-07-31T23:00:00Z", 7200),
    log("2", workTask, "2026-08-04T00:00:00Z", 3600),
  ], "2026-08-01", "2026-08-03");
  assert.equal(report.summary.taskSeconds, 3600);
  assert.equal(report.dailyDetails.length, 1);
  assert.equal(report.dailyDetails[0].date, "2026-08-01");
});

test("billing range uses the configured timezone and rejects excessive ranges", () => {
  const range = getBillingDateRange("2026-08-01", "2026-08-01", "Asia/Kolkata");
  assert.equal(range.start.toISOString(), "2026-07-31T18:30:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-08-01T18:30:00.000Z");
  assert.throws(() => getBillingDateRange("2025-01-01", "2026-08-01", "UTC"), /cannot exceed/);
});

test("billing employee access is restricted to administrators", () => {
  const employeeAccess = getBillingEmployeeAccess({ _id: "employee-1", role: "employee" }, "employee-2");
  const teamAccess = getBillingEmployeeAccess({ _id: "lead-1", role: "team_lead" }, "employee-2");
  assert.equal(employeeAccess.forbidden, true);
  assert.equal(teamAccess.forbidden, true);
  const adminAccess = getBillingEmployeeAccess({ _id: "admin-1", role: "admin" }, "employee-2");
  assert.deepEqual(adminAccess.filter, { _id: "employee-2" });
});
