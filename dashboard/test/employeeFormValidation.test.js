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
  serviceRates: [{ serviceType: "Tax", chargeRate: "25" }],
};

test("accepts one or multiple valid employee service rates", () => {
  assert.equal(validateEmployeeForm(validEmployee, { passwordRequired: true }), "");
  assert.equal(validateEmployeeForm({
    ...validEmployee,
    serviceRates: [
      { serviceType: "Tax", chargeRate: "25" },
      { serviceType: "Bookkeeping", chargeRate: "20.50" },
    ],
  }, { passwordRequired: true }), "");
});

test("rejects duplicate services and invalid charge rates", () => {
  assert.match(validateEmployeeForm({
    ...validEmployee,
    serviceRates: [
      { serviceType: "Tax", chargeRate: "25" },
      { serviceType: "Tax", chargeRate: "30" },
    ],
  }), /cannot be assigned more than once/i);
  assert.match(validateEmployeeForm({ ...validEmployee, serviceRates: [{ serviceType: "", chargeRate: "25" }] }), /select a service type/i);
  assert.match(validateEmployeeForm({ ...validEmployee, serviceRates: [{ serviceType: "Tax", chargeRate: "-1" }] }), /positive charge rate/i);
  assert.match(validateEmployeeForm({ ...validEmployee, serviceRates: [{ serviceType: "Tax", chargeRate: "invalid" }] }), /positive charge rate/i);
});
