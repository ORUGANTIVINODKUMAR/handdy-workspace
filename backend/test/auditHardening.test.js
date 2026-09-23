const test = require("node:test");
const assert = require("node:assert/strict");
const Employee = require("../src/models/Employee");
const AuthSession = require("../src/models/AuthSession");
const { ensureAuthSessionIndexes } = require("../src/services/authSessionService");
const errorHandler = require("../src/middleware/errorHandler");

function existingEmployee() {
  return Employee.hydrate({
    _id: "6a952f26effaab09e60bb7b4", employeeId: "EMP001",
    fullName: "Test Employee", email: "before@example.com", password: "stored-password-hash",
    passwordResetTokenHash: "previous-reset-token", passwordResetExpires: new Date(Date.now() + 60000),
  });
}

test("password and email changes invalidate existing reset links", async () => {
  for (const [field, value] of [["password", "replacement-password"], ["email", "after@example.com"]]) {
    const employee = existingEmployee();
    employee[field] = value;
    await employee.validate();
    assert.equal(employee.passwordResetTokenHash, null);
    assert.equal(employee.passwordResetExpires, null);
  }
  const employee = existingEmployee();
  employee.fullName = "Updated Name";
  await employee.validate();
  assert.equal(employee.passwordResetTokenHash, "previous-reset-token");
});

test("session index startup supports a fresh database and propagates real failures", async (t) => {
  let created = 0;
  t.mock.method(AuthSession, "createIndexes", async () => { created += 1; });
  const lookup = t.mock.method(AuthSession.collection, "indexes", async () => {
    throw Object.assign(new Error("namespace missing"), { code: 26 });
  });
  await ensureAuthSessionIndexes();
  assert.equal(created, 1);
  lookup.mock.mockImplementation(async () => { throw new Error("database unavailable"); });
  await assert.rejects(ensureAuthSessionIndexes, /database unavailable/);
  assert.equal(created, 1);
});

test("request errors return safe JSON and preserve parser status codes", (t) => {
  const logged = t.mock.method(console, "error", () => {});
  for (const [type, status] of [[undefined, 500], ["entity.parse.failed", 400], ["entity.too.large", 413]]) {
    const res = {
      status(value) { this.statusCode = value; return this; },
      json(value) { this.body = value; return this; },
    };
    errorHandler(Object.assign(new Error("private database details"), { type }), {}, res, () => {});
    assert.equal(res.statusCode, status);
    assert.equal(res.body.success, false);
    assert.doesNotMatch(res.body.message, /private database details/);
  }
  assert.equal(logged.mock.callCount(), 3);
});
