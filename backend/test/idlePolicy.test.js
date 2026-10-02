const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeIdlePolicy, resolveIdlePolicy, validateIdlePolicy } = require("../src/utils/idlePolicy");

test("legacy settings retain idle threshold and get a safe logout default", () => {
  assert.deepEqual(normalizeIdlePolicy(), { idleThresholdMinutes: 5, autoLogoutMinutes: 50 });
  assert.deepEqual(normalizeIdlePolicy({ idleThresholdMinutes: 240 }), { idleThresholdMinutes: 240, autoLogoutMinutes: 241 });
});

test("idle policy rejects invalid ranges, fractions and logout at or before pause", () => {
  for (const [idle, logout] of [[0, 30], [241, 300], [1.5, 30], [10, 10], [10, 5], [1, 1], [10, 481], [10, 30.5]]) {
    assert.ok(validateIdlePolicy({ idleThresholdMinutes: idle, autoLogoutMinutes: logout }));
  }
  assert.equal(validateIdlePolicy({ idleThresholdMinutes: 10, autoLogoutMinutes: 30 }), "");
});

test("a valid employee override replaces the global policy", () => {
  assert.deepEqual(
    resolveIdlePolicy(
      { idleThresholdMinutes: 10, autoLogoutMinutes: 30 },
      { idlePolicyOverride: { idleThresholdMinutes: 5, autoLogoutMinutes: 12 } },
    ),
    { idleThresholdMinutes: 5, autoLogoutMinutes: 12, source: "employee_override" },
  );
});

test("missing or invalid employee overrides fall back to the global policy", () => {
  assert.deepEqual(
    resolveIdlePolicy(
      { idleThresholdMinutes: 10, autoLogoutMinutes: 30 },
      { idlePolicyOverride: { idleThresholdMinutes: 20, autoLogoutMinutes: 10 } },
    ),
    { idleThresholdMinutes: 10, autoLogoutMinutes: 30, source: "global" },
  );
});

test("settings model rejects inverted thresholds while legacy documents remain valid", async () => {
  const SystemSettings = require("../src/models/SystemSettings");
  await new SystemSettings({ idleThresholdMinutes: 240 }).validate();
  await assert.rejects(new SystemSettings({ idleThresholdMinutes: 10, autoLogoutMinutes: 5 }).validate());
});
