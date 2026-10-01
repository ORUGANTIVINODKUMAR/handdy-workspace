const time = (value) => value ? new Date(value).getTime() : NaN;

// Pauses belong to one employee/task log. Never search another log for a
// predecessor: task, project, client and employee ownership stay unchanged.
function mergeCompletedIdlePauses(log, taskType) {
  if (taskType !== "work") return false;
  const start = time(log.startedAt);
  const end = log.stoppedAt ? time(log.stoppedAt) : Infinity;
  if (!Number.isFinite(start) || Number.isNaN(end)) return false;
  const pauses = [...(log.pauses || [])].sort((a, b) => time(a.pausedAt) - time(b.pausedAt));
  let cursor = start;
  let changed = false;
  for (const pause of pauses) {
    const pauseStart = time(pause.pausedAt);
    const pauseEnd = time(pause.resumedAt);
    const overlaps = pauses.some((other) => other !== pause
      && time(other.pausedAt) < pauseEnd
      && (other.resumedAt ? time(other.resumedAt) : end) > pauseStart);
    if (pause.reason === "idle" && !pause.mergedIntoPreviousWork
      && Number.isFinite(pauseEnd) && pauseEnd > pauseStart
      && pauseStart > cursor && pauseEnd <= end && !overlaps) {
      pause.mergedIntoPreviousWork = true;
      changed = true;
    }
    // Consecutive idle/break pauses have no intervening work, even when the
    // earlier idle was merged. Open/malformed pauses block later attribution.
    cursor = Math.max(cursor, Number.isFinite(pauseEnd) ? pauseEnd : end);
  }
  return changed;
}

function calculateTimeLogTotals(log, endTime) {
  const start = time(log.startedAt);
  const end = time(endTime);
  let cursor = start;
  let totalPausedSeconds = 0;
  let totalIdleSeconds = 0;
  const pauses = [...(log.pauses || [])]
    .filter((pause) => !pause.mergedIntoPreviousWork)
    .sort((a, b) => time(a.pausedAt) - time(b.pausedAt));
  for (const pause of pauses) {
    const pauseStart = Math.max(cursor, time(pause.pausedAt));
    const pauseEnd = Math.min(end, pause.resumedAt ? time(pause.resumedAt) : end);
    if (pauseEnd > pauseStart) {
      const seconds = Math.floor((pauseEnd - pauseStart) / 1000);
      totalPausedSeconds += seconds;
      if (pause.reason === "idle") totalIdleSeconds += seconds;
    }
    if (Number.isFinite(pauseEnd)) cursor = Math.max(cursor, pauseEnd);
  }
  return {
    totalPausedSeconds,
    totalIdleSeconds,
    totalWorkedSeconds: Math.max(0, Math.floor((end - start) / 1000) - totalPausedSeconds),
  };
}

module.exports = { mergeCompletedIdlePauses, calculateTimeLogTotals };
