const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectIndexes } = require("../scripts/verifyBandwidthIndexes");

test("index audit requires complete visible indexes and reports duplicate patterns", () => {
  const expected = [{ updatedAt: 1 }, { employee: 1, updatedAt: 1 }];
  const partial = inspectIndexes(expected, [
    { name: "partial", key: { updatedAt: 1 }, partialFilterExpression: { active: true } },
    { name: "hidden", key: { employee: 1, updatedAt: 1 }, hidden: true },
  ]);
  assert.ok(partial.every((item) => !item.present));
  const complete = inspectIndexes(expected, [
    { name: "updatedAt_1", key: { updatedAt: 1 } },
    { name: "same-pattern", key: { updatedAt: 1 }, sparse: true },
    { name: "employee_1_updatedAt_1", key: { employee: 1, updatedAt: 1 } },
  ]);
  assert.ok(complete.every((item) => item.present));
  assert.equal(complete[0].duplicateDefinitions, true);
  assert.equal(inspectIndexes([{ updatedAt: 1 }], [{ name: "descending", key: { updatedAt: -1 } }])[0].present, false,
    "the application's explicit ascending hint requires that exact pattern");
});
