const test = require("node:test");
const assert = require("node:assert/strict");
const Employee = require("../src/models/Employee");
const Task = require("../src/models/Task");
const { normalizeServiceRates } = require("../src/utils/serviceRates");

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

test("legacy work tasks without a service type remain readable", async () => {
  const legacyTask = new Task({
    taskCode: "LEGACY-TASK",
    taskName: "Legacy task",
    taskType: "work",
    createdBy: "64b000000000000000000001",
  });
  await legacyTask.validate();
  assert.equal(legacyTask.serviceType, null);
});
