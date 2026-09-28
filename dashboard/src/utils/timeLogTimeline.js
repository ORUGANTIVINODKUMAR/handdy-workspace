const validTime = (value) => {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : null;
};

export const isIntentionalBreak = (pause) => ["break", "manual"].includes(pause?.reason);

export function buildTimeLogTimeline(record, now = Date.now()) {
  const sessionStart = validTime(record?.startedAt);
  if (sessionStart === null) return [];

  const stoppedAt = validTime(record?.stoppedAt);
  const sessionEnd = stoppedAt ?? now;
  if (sessionEnd < sessionStart) return [];

  const pauses = [...(record.pauses || [])]
    .map((pause, originalIndex) => ({
      ...pause,
      originalIndex,
      startMs: validTime(pause.pausedAt),
      endMs: validTime(pause.resumedAt),
    }))
    .filter((pause) => pause.startMs !== null)
    .sort((first, second) => first.startMs - second.startMs);

  const entries = [];
  const counters = { work: 0, break: 0, idle: 0 };
  let cursor = sessionStart;

  const addEntry = (type, startMs, endMs, isOpen = false) => {
    if (endMs < startMs) return;
    counters[type] += 1;
    entries.push({
      type,
      sequence: counters[type],
      start: new Date(startMs).toISOString(),
      end: isOpen ? null : new Date(endMs).toISOString(),
      durationSeconds: Math.max(0, Math.floor((endMs - startMs) / 1000)),
      isOpen,
    });
  };

  for (const pause of pauses) {
    const pauseStart = Math.min(sessionEnd, Math.max(sessionStart, pause.startMs));
    if (pauseStart > cursor) addEntry("work", cursor, pauseStart);

    const openPause = pause.endMs === null && stoppedAt === null;
    const pauseEnd = Math.min(sessionEnd, Math.max(pauseStart, pause.endMs ?? sessionEnd));

    // Clamp to cursor so a pause that overlaps a previously emitted pause
    // (e.g. an idle window that started before a break resumed) only
    // contributes the seconds not already accounted for, avoiding double
    // counting the shared time in both entries and in the summed totals.
    const effectivePauseStart = Math.max(pauseStart, cursor);
    if (effectivePauseStart < pauseEnd) {
      addEntry(isIntentionalBreak(pause) ? "break" : "idle", effectivePauseStart, pauseEnd, openPause);
    }
    cursor = Math.max(cursor, pauseEnd);
  }

  if (cursor < sessionEnd || (entries.length === 0 && cursor === sessionEnd)) {
    addEntry("work", cursor, sessionEnd, stoppedAt === null);
  }

  return entries;
}

// A selected task represents worked time for that task. Break and idle
// segments belong to the surrounding timer session, not to the task filter.
export const buildReportTimeLogTimeline = (
  record,
  { taskFiltered = false, now = Date.now() } = {},
) => {
  const entries = buildTimeLogTimeline(record, now);
  return taskFiltered
    ? entries.filter((entry) => entry.type === "work")
    : entries;
};

export const sumTimelineSeconds = (records, type, now = Date.now()) =>
  records.reduce(
    (total, record) => total + buildTimeLogTimeline(record, now)
      .filter((entry) => entry.type === type)
      .reduce((entryTotal, entry) => entryTotal + entry.durationSeconds, 0),
    0,
  );
