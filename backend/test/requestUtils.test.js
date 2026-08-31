const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeRegExp,
  getDateKey,
  getPagination,
} = require("../src/utils/requestUtils");

test("pagination rejects invalid values and caps large limits", () => {
  assert.deepEqual(getPagination({ page: "-2", limit: "0" }), {
    page: 1,
    limit: 10,
    skip: 0,
  });
  assert.deepEqual(getPagination({ page: "3", limit: "5000" }), {
    page: 3,
    limit: 100,
    skip: 200,
  });
});

test("search text is escaped before use in a regular expression", () => {
  assert.equal(escapeRegExp("a.*(b)"), "a\\.\\*\\(b\\)");
});

test("attendance date uses the configured company timezone", () => {
  const originalTimezone = process.env.APP_TIMEZONE;
  process.env.APP_TIMEZONE = "Asia/Kolkata";
  assert.equal(getDateKey(new Date("2026-08-27T20:00:00.000Z")), "2026-08-28");
  if (originalTimezone === undefined) delete process.env.APP_TIMEZONE;
  else process.env.APP_TIMEZONE = originalTimezone;
});
