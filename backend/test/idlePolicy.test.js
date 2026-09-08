const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeIdlePolicy, validateIdlePolicy } = require("../src/utils/idlePolicy");

test("legacy settings retain idle threshold and get a safe logout default", () => {
  assert.deepEqual(normalizeIdlePolicy(), { idleThresholdMinutes: 5, autoLogoutMinutes: 30 });
  assert.deepEqual(normalizeIdlePolicy({ idleThresholdMinutes: 240 }), { idleThresholdMinutes: 240, autoLogoutMinutes: 241 });
});

test("idle policy rejects invalid ranges, fractions and logout at or before pause", () => {
  for (const [idle, logout] of [[0, 30], [241, 300], [1.5, 30], [10, 10], [10, 5], [1, 1], [10, 481], [10, 30.5]]) {
    assert.ok(validateIdlePolicy({ idleThresholdMinutes: idle, autoLogoutMinutes: logout }));
  }
  assert.equal(validateIdlePolicy({ idleThresholdMinutes: 10, autoLogoutMinutes: 30 }), "");
});

test("settings model rejects inverted thresholds while legacy documents remain valid", async () => {
  const SystemSettings = require("../src/models/SystemSettings");
  await new SystemSettings({ idleThresholdMinutes: 240 }).validate();
  await assert.rejects(new SystemSettings({ idleThresholdMinutes: 10, autoLogoutMinutes: 5 }).validate());
});
