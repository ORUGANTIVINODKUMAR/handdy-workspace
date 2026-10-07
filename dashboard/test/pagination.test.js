import test from "node:test";
import assert from "node:assert/strict";
import { collectAllPages } from "../src/utils/pagination.js";

test("selectors retain employee 11 and records beyond page 100", async () => {
  const employees = Array.from({ length: 205 }, (_, index) => ({ _id: `employee-${index + 1}` }));
  const requestedPages = [];
  const records = await collectAllPages(async ({ page, limit }) => {
    requestedPages.push(page);
    return { employees: employees.slice((page - 1) * limit, page * limit), totalPages: Math.ceil(employees.length / limit) };
  }, "employees");
  assert.deepEqual(records, employees);
  assert.deepEqual(requestedPages, [1, 2, 3]);
});

test("a failed later page rejects instead of returning a misleading partial list", async () => {
  await assert.rejects(collectAllPages(async ({ page }) => {
    if (page === 2) throw new Error("lookup unavailable");
    return { schedules: [{ _id: "first" }], totalPages: 2 };
  }, "schedules"), /lookup unavailable/);
});
