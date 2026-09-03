import test from "node:test";
import assert from "node:assert/strict";
import { validateEmployeeForm } from "../src/utils/employeeFormValidation.js";

const validEmployee = {
  employeeId: "EMP001",
  fullName: "Test Employee",
  email: "employee@example.com",
  password: "password123",
  role: "employee",
  team: "team-1",
  projectRates: [{ project: "project-1", chargeRate: "25" }],
};

test("accepts one or multiple valid employee project rates", () => {
  assert.equal(validateEmployeeForm(validEmployee, { passwordRequired: true }), "");
  assert.equal(validateEmployeeForm({
    ...validEmployee,
    projectRates: [
      { project: "project-1", chargeRate: "25" },
      { project: "project-2", chargeRate: "20.50" },
    ],
  }, { passwordRequired: true }), "");
});

test("rejects duplicate projects and invalid charge rates", () => {
  assert.match(validateEmployeeForm({
    ...validEmployee,
    projectRates: [
      { project: "project-1", chargeRate: "25" },
      { project: "project-1", chargeRate: "30" },
    ],
  }), /cannot be assigned more than once/i);
  assert.match(validateEmployeeForm({ ...validEmployee, projectRates: [{ project: "", chargeRate: "25" }] }), /select a project/i);
  assert.match(validateEmployeeForm({ ...validEmployee, projectRates: [{ project: "project-1", chargeRate: "-1" }] }), /positive charge rate/i);
  assert.match(validateEmployeeForm({ ...validEmployee, projectRates: [{ project: "project-1", chargeRate: "invalid" }] }), /positive charge rate/i);
});
