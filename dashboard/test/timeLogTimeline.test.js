import assert from "node:assert/strict";
import test from "node:test";

import { buildTimeLogTimeline, sumTimelineSeconds } from "../src/utils/timeLogTimeline.js";

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
