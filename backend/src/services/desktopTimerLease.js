const TaskTimeLog = require("../models/TaskTimeLog");
const Task = require("../models/Task");
const { mergeCompletedIdlePauses, calculateTimeLogTotals } = require("../utils/idleSegmentMerge");

const HEARTBEAT_TIMEOUT_MS = 90_000;

function stoppedValues(log, stoppedAt, taskType = null) {
  const pauses = (log.pauses || []).map((pause) => ({
    pausedAt: pause.pausedAt,
    resumedAt: pause.resumedAt || stoppedAt,
    reason: pause.reason,
    ...(pause.mergedIntoPreviousWork ? { mergedIntoPreviousWork: true } : {}),
  }));
  const candidate = { ...log, pauses, stoppedAt };
  mergeCompletedIdlePauses(candidate, taskType);
  const totalPausedSeconds = pauses.reduce((sum, pause) =>
    sum + (pause.mergedIntoPreviousWork ? 0 : Math.max(0, Math.floor((pause.resumedAt - pause.pausedAt) / 1000))), 0);
  const totalIdleSeconds = pauses.reduce((sum, pause) =>
    sum + (pause.reason === "idle" && !pause.mergedIntoPreviousWork
      ? Math.max(0, Math.floor((pause.resumedAt - pause.pausedAt) / 1000)) : 0), 0);
  const elapsedSeconds = Math.max(0, Math.floor((stoppedAt - log.startedAt) / 1000));
  return {
    pauses,
    stoppedAt,
    status: "stopped",
    isActiveTimer: false,
    stopReason: "desktop_disconnected",
    totalPausedSeconds,
    totalIdleSeconds,
    totalWorkedSeconds: Math.max(0, elapsedSeconds - totalPausedSeconds),
    ...(pauses.some((pause) => pause.mergedIntoPreviousWork)
      ? calculateTimeLogTotals(candidate, stoppedAt) : {}),
  };
}

async function closeStaleDesktopTimers(now = new Date(), employeeId = null) {
  const cutoff = new Date(now.getTime() - HEARTBEAT_TIMEOUT_MS);
  const filter = {
    isActiveTimer: true,
    status: { $in: ["running", "paused"] },
    desktopHeartbeatAt: { $type: "date", $lte: cutoff },
    ...(employeeId ? { employee: employeeId } : {}),
  };
  const stale = await TaskTimeLog.find(filter).lean();
  let closed = 0;
  for (const log of stale) {
    const isWork = log.pauses?.some((pause) => pause.reason === "idle")
      && await Task.exists({ _id: log.task, taskType: "work" });
    const result = await TaskTimeLog.updateOne(
      { _id: log._id, isActiveTimer: true, status: log.status, desktopHeartbeatAt: log.desktopHeartbeatAt,
        pauses: log.pauses },
      { $set: stoppedValues(log, log.desktopHeartbeatAt, isWork ? "work" : null) },
    );
    closed += result.modifiedCount || 0;
  }
  return closed;
}

module.exports = { closeStaleDesktopTimers, HEARTBEAT_TIMEOUT_MS, stoppedValues };
