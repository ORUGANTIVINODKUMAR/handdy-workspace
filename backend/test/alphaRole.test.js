const test = require("node:test");
const assert = require("node:assert/strict");

const Employee = require("../src/models/Employee");
const { authorizeRoles, authorizeAccess } = require("../src/middleware/authorizeRoles");
const { isAdminRole, isAlphaRole } = require("../src/utils/roles");

const callMiddleware = (middleware, role, permissions = []) => {
  const result = { nextCalled: false, statusCode: 200, body: null };
  const req = { user: { role, permissions } };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return this; },
  };
  middleware(req, res, () => { result.nextCalled = true; });
  return result;
};

test("alpha and manager are admin-level roles but alpha remains distinguishable", () => {
  assert.equal(isAdminRole("alpha"), true);
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("manager"), true);
  assert.equal(isAlphaRole("alpha"), true);
  assert.equal(isAlphaRole("admin"), false);
  assert.equal(isAlphaRole("manager"), false);
});

test("alpha and manager inherit admin routes without inheriting alpha-only routes", () => {
  assert.equal(callMiddleware(authorizeRoles("admin"), "alpha").nextCalled, true);
  assert.equal(callMiddleware(authorizeRoles("admin"), "manager").nextCalled, true);
  const adminToAlpha = callMiddleware(authorizeRoles("alpha"), "admin");
  const managerToAlpha = callMiddleware(authorizeRoles("alpha"), "manager");
  assert.equal(adminToAlpha.nextCalled, false);
  assert.equal(adminToAlpha.statusCode, 403);
  assert.equal(managerToAlpha.nextCalled, false);
  assert.equal(managerToAlpha.statusCode, 403);
});

test("admin-level roles automatically pass delegated access checks", () => {
  assert.equal(callMiddleware(authorizeAccess("edit_employees"), "alpha").nextCalled, true);
  assert.equal(callMiddleware(authorizeAccess("edit_employees"), "manager").nextCalled, true);
});

test("employee schema accepts alpha and stores a per-employee idle override", async () => {
  const employee = new Employee({
    employeeId: "ALPHA-TEST",
    fullName: "Alpha Test",
    email: "alpha-test@example.com",
    password: "long-test-password",
    role: "alpha",
    idlePolicyOverride: { idleThresholdMinutes: 5, autoLogoutMinutes: 15 },
  });
  await employee.validate();
  assert.equal(employee.role, "alpha");
  assert.equal(employee.idlePolicyOverride.idleThresholdMinutes, 5);
  assert.equal(employee.idlePolicyOverride.autoLogoutMinutes, 15);
});
