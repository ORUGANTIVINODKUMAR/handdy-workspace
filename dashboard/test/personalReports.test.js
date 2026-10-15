import assert from "node:assert/strict";
import test from "node:test";

import { countWorkedDays } from "../src/utils/personalReports.js";

test("counts distinct worked days in the business timezone, not UTC", () => {
  const records = [
    { startedAt: "2026-10-05T04:00:00Z" },
    { startedAt: "2026-10-05T10:00:00Z" },
    // 20:00 UTC on the 5th is 01:30 on the 6th in Asia/Kolkata.
    { startedAt: "2026-10-05T20:00:00Z" },
    { startedAt: "2026-10-07T04:00:00Z" },
  ];
  assert.equal(countWorkedDays(records), 3);
});

test("ignores records without a start and handles empty input", () => {
  assert.equal(countWorkedDays([]), 0);
  assert.equal(countWorkedDays([{ startedAt: null }, {}]), 0);
});
