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

test("alpha is an admin-level role but remains distinguishable", () => {
  assert.equal(isAdminRole("alpha"), true);
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAlphaRole("alpha"), true);
  assert.equal(isAlphaRole("admin"), false);
});

test("alpha inherits admin route access while admin cannot enter alpha-only routes", () => {
  assert.equal(callMiddleware(authorizeRoles("admin"), "alpha").nextCalled, true);
  const adminToAlpha = callMiddleware(authorizeRoles("alpha"), "admin");
  assert.equal(adminToAlpha.nextCalled, false);
  assert.equal(adminToAlpha.statusCode, 403);
});

test("alpha automatically passes delegated access checks", () => {
  assert.equal(callMiddleware(authorizeAccess("edit_employees"), "alpha").nextCalled, true);
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
