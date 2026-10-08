import test from "node:test";
import assert from "node:assert/strict";
import { createReportLoader } from "../src/utils/reportLoader.js";

const marker = { since: new Date().toISOString(), scope: "scope", references: "references" };
const initialRows = Array.from({ length: 205 }, (_, index) => ({ _id: String(index), startedAt: "2026-10-01T04:00Z", status: "running" }));

test("background refresh fetches only changed rows and merges stops, new sessions and removals", async () => {
  const requests = [];
  let changed = false;
  const load = createReportLoader(async (_path, params) => {
    requests.push(params);
    if (changed) return { delta: true, sync: marker, removedIds: ["1"], timeLogs: [
      { ...initialRows[0], status: "stopped", totalWorkedSeconds: 60 },
      { _id: "new", startedAt: "2026-10-02T04:00Z", status: "running" },
    ] };
    return { sync: marker, totalPages: 3, timeLogs: initialRows.slice((params.page - 1) * 100, params.page * 100) };
  });
  const first = await load("/time-logs/my", "timeLogs");
  assert.equal(first.timeLogs.length, 205);
  changed = true;
  const next = await load("/time-logs/my", "timeLogs", {}, { force: false });
  assert.equal(requests.length, 4);
  assert.equal(requests[3].syncSince, marker.since);
  assert.equal(next.timeLogs.length, 205);
  assert.equal(next.timeLogs[0]._id, "new");
  assert.equal(next.timeLogs.find((row) => row._id === "0").status, "stopped");
  assert.equal(next.timeLogs.some((row) => row._id === "1"), false);
  assert.equal(first.timeLogs[0].status, "running", "refresh must not mutate the currently displayed report");
});

test("manual refresh, changed filters, and changed sessions request a full report", async () => {
  const requests = [];
  let session = "first-token";
  const load = createReportLoader(async (_path, params) => { requests.push(params); return { sync: marker, attendance: [{ _id: "day", date: "2026-10-01" }] }; }, () => session);
  await load("/attendance", "attendance", { startDate: "2026-10-01" });
  await load("/attendance", "attendance", { startDate: "2026-10-01" });
  await load("/attendance", "attendance", { startDate: "2026-10-02" }, { force: false });
  session = "second-token";
  await load("/attendance", "attendance", { startDate: "2026-10-01" }, { force: false });
  for (const params of requests) assert.equal(params.syncSince, undefined);
});

test("older servers still paginate completely on every background refresh", async () => {
  let requests = 0;
  const load = createReportLoader(async (_path, params) => {
    requests += 1;
    return { timeLogs: [{ _id: String(params.page) }], totalPages: 2 };
  });
  await load("/old", "timeLogs");
  const next = await load("/old", "timeLogs", {}, { force: false });
  assert.equal(requests, 4);
  assert.deepEqual(next.timeLogs.map((row) => row._id), ["1", "2"]);
});

test("a renamed/deleted task forces a full replacement and drops stale cached records", async () => {
  let generation = 0;
  const load = createReportLoader(async (_path, params) => generation++ === 0
    ? { sync: marker, timeLogs: [{ _id: "old", task: { taskName: "Old name" } }] }
    : (assert.equal(params.syncReferences, "references"), { sync: { ...marker, references: "new-references" }, timeLogs: [{ _id: "new", task: { taskName: "Renamed" } }] }));
  await load("/rename", "timeLogs");
  const next = await load("/rename", "timeLogs", {}, { force: false });
  assert.deepEqual(next.timeLogs.map((row) => row._id), ["new"]);
  assert.equal(next.timeLogs[0].task.taskName, "Renamed");
});

test("failed later pages cannot replace a complete cached report with partial data", async () => {
  let stage = "initial";
  const load = createReportLoader(async (_path, params) => {
    if (stage === "initial") return { sync: marker, timeLogs: [{ _id: "complete" }] };
    if (stage === "failed") {
      if (params.page === 2) throw new Error("offline");
      return { sync: marker, totalPages: 2, timeLogs: [{ _id: "partial" }] };
    }
    return { sync: marker, delta: true, timeLogs: [] };
  });
  await load("/failure", "timeLogs");
  stage = "failed";
  await assert.rejects(load("/failure", "timeLogs"), /offline/);
  stage = "recover";
  const recovered = await load("/failure", "timeLogs", {}, { force: false });
  assert.deepEqual(recovered.timeLogs.map((row) => row._id), ["complete"]);
});

test("concurrent background refreshes share a request and logout rejects late results", async () => {
  let session = "original";
  let resolve;
  let calls = 0;
  const load = createReportLoader(() => { calls += 1; return new Promise((done) => { resolve = done; }); }, () => session);
  const one = load("/concurrent", "timeLogs", {}, { force: false });
  const two = load("/concurrent", "timeLogs", {}, { force: false });
  assert.equal(calls, 1);
  session = "changed";
  resolve({ timeLogs: [], sync: marker });
  const result = await Promise.allSettled([one, two]);
  assert.ok(result.every((item) => item.status === "rejected"));
});

test("five-minute reconciliation replaces delta caches to recover missed deletions", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const requests = [];
  const load = createReportLoader(async (_path, params) => { requests.push(params); return { sync: marker, timeLogs: [] }; });
  await load("/reconcile", "timeLogs");
  t.mock.timers.tick(5 * 60000);
  await load("/reconcile", "timeLogs", {}, { force: false });
  assert.equal(requests[1].syncSince, undefined);
});
