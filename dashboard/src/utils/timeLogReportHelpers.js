import { isIntentionalBreak } from "./timeLogTimeline.js";

// Shared by AdminReportPage and RoleReportPage so their summary totals and
// per-row timelines can never drift apart again.

export const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

// A project with no team restriction (legacy records) is available to every team.
export const projectServesTeam = (project, teamId) => !teamId
  || !project?.teams?.length
  || project.teams.some((item) => String(item?._id || item) === String(teamId));

export const getPauseSeconds = (record, reason) => {
  const now = Date.now();

  return (record.pauses || []).reduce((total, pause) => {
    if (!pause.pausedAt || (reason && pause.reason !== reason)) return total;
    const end = pause.resumedAt ? new Date(pause.resumedAt).getTime() : now;
    const start = new Date(pause.pausedAt).getTime();
    return total + Math.max(0, Math.floor((end - start) / 1000));
  }, 0);
};

// A running/paused timer has no totalWorkedSeconds yet (only set when
// stopped), so it must be computed live from startedAt minus paused time.
export const getWorkedSeconds = (record) => {
  if (record.task?.taskType === "break") return 0;
  if (record.status === "stopped") {
    return Math.max(0, Number(record.totalWorkedSeconds) || 0);
  }

  if (!record.startedAt) return 0;
  const end = record.stoppedAt ? new Date(record.stoppedAt).getTime() : Date.now();
  const elapsed = Math.max(0, Math.floor((end - new Date(record.startedAt).getTime()) / 1000));
  return Math.max(0, elapsed - getPauseSeconds(record));
};

// Uses the same "idle" classification as the per-row timeline
// (isIntentionalBreak): any pause whose reason isn't "break" or "manual"
// counts as idle, so this total can never drift from the Idle rows shown
// in the table/export built from buildTimeLogTimeline.
export const getIdleSeconds = (record) => {
  if (record.status === "stopped" && record.totalIdleSeconds !== undefined) {
    return Math.max(0, Number(record.totalIdleSeconds) || 0);
  }

  const now = Date.now();
  return (record.pauses || []).reduce((total, pause) => {
    if (!pause.pausedAt || isIntentionalBreak(pause)) return total;
    const end = pause.resumedAt ? new Date(pause.resumedAt).getTime() : now;
    const start = new Date(pause.pausedAt).getTime();
    return total + Math.max(0, Math.floor((end - start) / 1000));
  }, 0);
};
