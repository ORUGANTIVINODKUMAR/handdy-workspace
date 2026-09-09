const test = require("node:test");
const assert = require("node:assert/strict");
const { createRememberedSession, hashRememberedSession } = require("../src/utils/rememberedSessionUtils");

test("remembered sessions use opaque random tokens and persist only a hash", () => {
  const first = createRememberedSession();
  const second = createRememberedSession();
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.equal(hashRememberedSession(first.token), first.tokenHash);
  assert.ok(first.expiresAt.getTime() > Date.now());
});
