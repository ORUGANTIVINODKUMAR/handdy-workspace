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
  const activeType = record.task?.taskType === "break" ? "break" : "work";
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
    if (pauseStart > cursor) addEntry(activeType, cursor, pauseStart);

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
    addEntry(activeType, cursor, sessionEnd, stoppedAt === null);
  }

  return entries;
}

// A selected task represents its own work or break segments, not idle pauses.
export const buildReportTimeLogTimeline = (
  record,
  { taskFiltered = false, now = Date.now() } = {},
) => {
  const entries = buildTimeLogTimeline(record, now);
  return taskFiltered
    ? entries.filter((entry) => entry.type === (record.task?.taskType === "break" ? "break" : "work"))
    : entries;
};

export const sumTimelineSeconds = (records, type, now = Date.now()) =>
  records.reduce(
    (total, record) => total + buildTimeLogTimeline(record, now)
      .filter((entry) => entry.type === type)
      .reduce((entryTotal, entry) => entryTotal + entry.durationSeconds, 0),
    0,
  );

// Reports receive sessions newest first, but each session contains its own
// older work/break/idle segments. Flatten before sorting so the visible table
// and exported rows tell the same chronological story.
export const buildChronologicalReportTimeline = (
  records,
  { taskFiltered = false, includeGaps = false, now = Date.now() } = {},
) => {
  const rows = records.flatMap((record, recordIndex) =>
  buildReportTimeLogTimeline(record, { taskFiltered, now }).map((entry, entryIndex) => ({
    record,
    entry,
    key: `${record._id || recordIndex}-${entry.type}-${entry.sequence}-${entryIndex}`,
    recordIndex,
    entryIndex,
  })),
  ).sort((first, second) =>
  new Date(first.entry.start).getTime() - new Date(second.entry.start).getTime()
  || first.recordIndex - second.recordIndex
  || first.entryIndex - second.entryIndex,
  );
  if (!includeGaps || taskFiltered) return rows;

  const result = [];
  const lastEndByEmployee = new Map();
  const lastRecordByEmployee = new Map();
  const dayKey = (time) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(time));
  for (const row of rows) {
    const employeeKey = row.record.employee?._id || row.record.employee || "personal";
    const previousEnd = lastEndByEmployee.get(employeeKey);
    const startMs = new Date(row.entry.start).getTime();
    if (previousEnd && startMs > previousEnd && dayKey(previousEnd) === dayKey(startMs)) {
      result.push({
        // Charge the between-task idle gap to the preceding task/project.
        record: lastRecordByEmployee.get(employeeKey) || row.record,
        entry: {
          type: "idle", source: "between_sessions", sequence: 0,
          start: new Date(previousEnd).toISOString(),
          end: row.entry.start,
          durationSeconds: Math.floor((startMs - previousEnd) / 1000),
          isOpen: false,
        },
        key: `gap-${employeeKey}-${previousEnd}-${startMs}`,
      });
    }
    result.push(row);
    const endMs = row.entry.end ? new Date(row.entry.end).getTime() : now;
    if (endMs >= (previousEnd || 0)) {
      lastEndByEmployee.set(employeeKey, endMs);
      lastRecordByEmployee.set(employeeKey, row.record);
    }
  }
  return result.sort((first, second) =>
    new Date(first.entry.start).getTime() - new Date(second.entry.start).getTime()
    || (first.entry.source === "between_sessions" ? -1 : 0) - (second.entry.source === "between_sessions" ? -1 : 0),
  );
};
