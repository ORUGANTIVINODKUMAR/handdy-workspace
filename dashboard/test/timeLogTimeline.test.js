import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChronologicalReportTimeline,
  buildReportTimeLogTimeline,
  buildTimeLogTimeline,
  sumTimelineSeconds,
} from "../src/utils/timeLogTimeline.js";
import { formatReportDuration } from "../src/utils/reportFormatting.js";

test("combines sessions into a single chronological report and keeps seconds visible", () => {
  const records = [
    { _id: "later", startedAt: "2026-09-29T10:10:00Z", stoppedAt: "2026-09-29T10:10:04Z", pauses: [] },
    { _id: "earlier", startedAt: "2026-09-29T10:00:00Z", stoppedAt: "2026-09-29T10:00:51Z", pauses: [] },
  ];
  const rows = buildChronologicalReportTimeline(records);
  assert.deepEqual(rows.map(({ record }) => record._id), ["earlier", "later"]);
  assert.equal(formatReportDuration(rows[0].entry.durationSeconds), "51s");
  assert.equal(formatReportDuration(rows[1].entry.durationSeconds), "4s");
});

test("marks same-day between-task gaps as idle without assigning them to worked time", () => {
  const records = [
    { _id: "later", startedAt: "2026-09-29T10:02:00Z", stoppedAt: "2026-09-29T10:03:00Z", pauses: [] },
    { _id: "earlier", startedAt: "2026-09-29T10:00:00Z", stoppedAt: "2026-09-29T10:01:00Z", pauses: [] },
  ];
  const rows = buildChronologicalReportTimeline(records, { includeGaps: true });
  assert.deepEqual(rows.map(({ entry }) => entry.type), ["work", "idle", "work"]);
  assert.equal(rows[1].entry.durationSeconds, 60);
  assert.equal(rows[1].entry.source, "between_sessions");
  assert.equal(rows[1].record._id, "earlier");
  assert.equal(sumTimelineSeconds(records, "work"), 120);
});

test("gaps for one employee stay in time order beside another employee's work", () => {
  const records = [
    { _id: "a2", employee: { _id: "a" }, startedAt: "2026-09-29T13:00:00Z", stoppedAt: "2026-09-29T13:05:00Z", pauses: [] },
    { _id: "b", employee: { _id: "b" }, startedAt: "2026-09-29T12:00:00Z", stoppedAt: "2026-09-29T12:05:00Z", pauses: [] },
    { _id: "a1", employee: { _id: "a" }, startedAt: "2026-09-29T11:00:00Z", stoppedAt: "2026-09-29T11:05:00Z", pauses: [] },
  ];
  const rows = buildChronologicalReportTimeline(records, { includeGaps: true });
  assert.deepEqual(rows.map(({ entry }) => entry.start), [...rows.map(({ entry }) => entry.start)].sort());
  assert.equal(rows.filter(({ entry }) => entry.source === "between_sessions").length, 1);
});

test("a ten-second task switch is idle, but overnight time is not", () => {
  const sameDay = [
    { _id: "work", startedAt: "2026-09-29T10:00:00Z", stoppedAt: "2026-09-29T10:01:00Z", pauses: [] },
    { _id: "break", task: { taskType: "break" }, startedAt: "2026-09-29T10:01:10Z", stoppedAt: "2026-09-29T10:02:00Z", pauses: [] },
  ];
  const rows = buildChronologicalReportTimeline(sameDay, { includeGaps: true });
  assert.deepEqual(rows.map(({ entry }) => [entry.type, entry.durationSeconds]), [
    ["work", 60], ["idle", 10], ["break", 50],
  ]);
  assert.equal(sumTimelineSeconds(sameDay, "break"), 50);

  const nextDay = [{ ...sameDay[1], startedAt: "2026-09-30T10:01:10Z", stoppedAt: "2026-09-30T10:02:00Z" }];
  assert.equal(buildChronologicalReportTimeline([sameDay[0], ...nextDay], { includeGaps: true })
    .filter(({ entry }) => entry.source === "between_sessions").length, 0);
});

test("splits a running task into chronological work and break segments", () => {
  const timeline = buildTimeLogTimeline({
    startedAt: "2026-09-17T13:15:57.000Z",
    status: "running",
    pauses: [
      { reason: "break", pausedAt: "2026-09-17T13:16:01.000Z", resumedAt: "2026-09-17T13:18:08.000Z" },
      { reason: "break", pausedAt: "2026-09-17T13:19:11.000Z", resumedAt: "2026-09-17T13:19:53.000Z" },
    ],
  }, new Date("2026-09-17T13:21:00.000Z").getTime());

  assert.deepEqual(timeline.map(({ type, sequence, durationSeconds, isOpen }) => ({ type, sequence, durationSeconds, isOpen })), [
    { type: "work", sequence: 1, durationSeconds: 4, isOpen: false },
    { type: "break", sequence: 1, durationSeconds: 127, isOpen: false },
    { type: "work", sequence: 2, durationSeconds: 63, isOpen: false },
    { type: "break", sequence: 2, durationSeconds: 42, isOpen: false },
    { type: "work", sequence: 3, durationSeconds: 67, isOpen: true },
  ]);
});

test("keeps idle pauses separate from intentional breaks", () => {
  const record = {
    startedAt: "2026-09-17T10:00:00.000Z",
    stoppedAt: "2026-09-17T10:10:00.000Z",
    pauses: [
      { reason: "idle", pausedAt: "2026-09-17T10:02:00.000Z", resumedAt: "2026-09-17T10:03:00.000Z" },
      { reason: "manual", pausedAt: "2026-09-17T10:05:00.000Z", resumedAt: "2026-09-17T10:07:00.000Z" },
    ],
  };

  assert.equal(sumTimelineSeconds([record], "idle"), 60);
  assert.equal(sumTimelineSeconds([record], "break"), 120);
  assert.equal(sumTimelineSeconds([record], "work"), 420);
});

test("task-filtered report timelines contain only work segments", () => {
  const record = {
    startedAt: "2026-09-17T10:00:00.000Z",
    stoppedAt: "2026-09-17T10:10:00.000Z",
    pauses: [
      { reason: "break", pausedAt: "2026-09-17T10:02:00.000Z", resumedAt: "2026-09-17T10:03:00.000Z" },
      { reason: "idle", pausedAt: "2026-09-17T10:05:00.000Z", resumedAt: "2026-09-17T10:06:00.000Z" },
    ],
  };

  const filtered = buildReportTimeLogTimeline(record, { taskFiltered: true });
  assert.deepEqual(filtered.map((entry) => entry.type), ["work", "work", "work"]);
  assert.equal(filtered.reduce((sum, entry) => sum + entry.durationSeconds, 0), 480);
});

test("clamps overlapping pauses so their shared time is never double-counted", () => {
  // 300s session with a break from 100s-200s and an idle pause from
  // 150s-250s: the two pauses overlap for 50s (150s-200s), which must only
  // be attributed once so the segments still sum to the session length.
  const record = {
    startedAt: "2026-09-17T10:00:00.000Z",
    stoppedAt: "2026-09-17T10:05:00.000Z",
    pauses: [
      { reason: "break", pausedAt: "2026-09-17T10:01:40.000Z", resumedAt: "2026-09-17T10:03:20.000Z" },
      { reason: "idle", pausedAt: "2026-09-17T10:02:30.000Z", resumedAt: "2026-09-17T10:04:10.000Z" },
    ],
  };

  const timeline = buildTimeLogTimeline(record);
  const totalSeconds = timeline.reduce((sum, entry) => sum + entry.durationSeconds, 0);

  assert.equal(totalSeconds, 300);
  assert.deepEqual(timeline.map(({ type, durationSeconds }) => ({ type, durationSeconds })), [
    { type: "work", durationSeconds: 100 },
    { type: "break", durationSeconds: 100 },
    { type: "idle", durationSeconds: 50 },
    { type: "work", durationSeconds: 50 },
  ]);
});
