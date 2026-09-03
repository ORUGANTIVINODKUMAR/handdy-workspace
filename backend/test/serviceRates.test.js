const test = require("node:test");
const assert = require("node:assert/strict");
const Employee = require("../src/models/Employee");
const Task = require("../src/models/Task");
const Project = require("../src/models/Project");
const { normalizeServiceRates } = require("../src/utils/serviceRates");
const { normalizeProjectRates } = require("../src/utils/projectRates");

const PROJECT_ONE = "64b000000000000000000021";
const PROJECT_TWO = "64b000000000000000000022";

test("normalizes one and multiple service rate assignments", () => {
  assert.deepEqual(normalizeServiceRates([{ serviceType: "Tax", chargeRate: "25" }]), [
    { serviceType: "Tax", chargeRate: 25 },
  ]);
  assert.deepEqual(normalizeServiceRates([
    { serviceType: "Bookkeeping", chargeRate: 20 },
    { serviceType: "Audit", chargeRate: "30.50" },
  ]), [
    { serviceType: "Bookkeeping", chargeRate: 20 },
    { serviceType: "Audit", chargeRate: 30.5 },
  ]);
});

test("rejects duplicate, empty, negative, and invalid service rates", () => {
  assert.throws(() => normalizeServiceRates([]), /at least one service/i);
  assert.throws(() => normalizeServiceRates([{ serviceType: "", chargeRate: 20 }]), /valid service type/i);
  assert.throws(() => normalizeServiceRates([{ serviceType: "Tax", chargeRate: -1 }]), /positive charge rate/i);
  assert.throws(() => normalizeServiceRates([{ serviceType: "Tax", chargeRate: "not-a-number" }]), /positive charge rate/i);
  assert.throws(() => normalizeServiceRates([
    { serviceType: "Tax", chargeRate: 25 },
    { serviceType: "Tax", chargeRate: 30 },
  ]), /cannot be assigned more than once/i);
});

test("legacy employees without service rates remain valid and receive an empty list", async () => {
  const legacyEmployee = new Employee({
    employeeId: "LEGACY-1",
    fullName: "Legacy Employee",
    email: "legacy@example.com",
    password: "password123",
  });
  await legacyEmployee.validate();
  assert.deepEqual(legacyEmployee.serviceRates.toObject(), []);
});

test("normalizes multiple project rates using project IDs", () => {
  assert.deepEqual(normalizeProjectRates([
    { project: PROJECT_ONE, chargeRate: "25" },
    { project: { _id: PROJECT_TWO }, chargeRate: "30.50" },
  ]), [
    { project: PROJECT_ONE, chargeRate: 25 },
    { project: PROJECT_TWO, chargeRate: 30.5 },
  ]);
});

test("rejects duplicate projects, missing projects, and invalid project rates", () => {
  assert.throws(() => normalizeProjectRates([]), /at least one project/i);
  assert.throws(() => normalizeProjectRates([{ project: "", chargeRate: 25 }]), /valid project/i);
  assert.throws(() => normalizeProjectRates([{ project: PROJECT_ONE, chargeRate: -1 }]), /positive charge rate/i);
  assert.throws(() => normalizeProjectRates([
    { project: PROJECT_ONE, chargeRate: 25 },
    { project: PROJECT_ONE, chargeRate: 30 },
  ]), /same project/i);
});

test("employee project rates reject duplicate project IDs", async () => {
  const employeeWithDuplicates = new Employee({
    employeeId: "DUPLICATE-PROJECTS",
    fullName: "Duplicate Projects",
    email: "duplicate-projects@example.com",
    password: "password123",
    projectRates: [
      { project: PROJECT_ONE, chargeRate: 25 },
      { project: PROJECT_ONE, chargeRate: 30 },
    ],
  });
  await assert.rejects(employeeWithDuplicates.validate(), /same project/i);
});

test("legacy work tasks remain readable without a duplicated service type", async () => {
  const legacyTask = new Task({
    taskCode: "LEGACY-TASK",
    taskName: "Legacy task",
    taskType: "work",
    createdBy: "64b000000000000000000001",
  });
  await legacyTask.validate();
  assert.equal(legacyTask.serviceType, undefined);
});

test("legacy projects without a service type remain readable", async () => {
  const legacyProject = Project.hydrate({
    _id: "64b000000000000000000009",
    projectCode: "LEGACY-PROJECT",
    projectName: "TAX PREPARATION",
    createdBy: "64b000000000000000000001",
  });
  await legacyProject.validate();
  assert.equal(legacyProject.serviceType, null);
});

test("legacy project service classification is optional but remains validated", async () => {
  const validProject = new Project({
    projectCode: "VALID-PROJECT",
    projectName: "Annual return",
    serviceType: "Business Tax Return",
    createdBy: "64b000000000000000000001",
  });
  await validProject.validate();
  assert.equal(validProject.serviceType, "Business Tax Return");

  const invalidProject = new Project({
    projectCode: "INVALID-PROJECT",
    projectName: "Tax by project name",
    serviceType: "TAX PREPARATION",
    createdBy: "64b000000000000000000001",
  });
  await assert.rejects(invalidProject.validate(), /valid service type/i);

  const missingServiceProject = new Project({
    projectCode: "MISSING-SERVICE-PROJECT",
    projectName: "Missing service",
    createdBy: "64b000000000000000000001",
  });
  await missingServiceProject.validate();
  assert.equal(missingServiceProject.serviceType, null);
});
