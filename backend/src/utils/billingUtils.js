const DEFAULT_TIMEZONE = "Asia/Kolkata";
const MAX_BILLING_RANGE_DAYS = 366;

const parseDateKey = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) throw new Error("Dates must use YYYY-MM-DD format.");
  const [, year, month, day] = match.map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) throw new Error("The selected date is invalid.");
  return { year, month, day };
};

const addDateKeyDays = (dateKey, days) => {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const getTimezoneOffsetMilliseconds = (date, timezone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const representedUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return representedUtc - date.getTime();
};

const dateKeyToUtc = (dateKey, timezone = DEFAULT_TIMEZONE) => {
  const { year, month, day } = parseDateKey(dateKey);
  const localAsUtc = Date.UTC(year, month - 1, day);
  let instant = new Date(localAsUtc);
  instant = new Date(localAsUtc - getTimezoneOffsetMilliseconds(instant, timezone));
  return new Date(localAsUtc - getTimezoneOffsetMilliseconds(instant, timezone));
};

const getDateKeyInTimezone = (date, timezone = DEFAULT_TIMEZONE) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const getBillingDateRange = (startDate, endDate, timezone = DEFAULT_TIMEZONE) => {
  parseDateKey(startDate);
  parseDateKey(endDate);
  if (endDate < startDate) throw new Error("To date cannot be before From date.");
  const calendarDays = Math.round(
    (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / 86_400_000,
  ) + 1;
  if (calendarDays > MAX_BILLING_RANGE_DAYS) {
    throw new Error(`Billing reports cannot exceed ${MAX_BILLING_RANGE_DAYS} days.`);
  }
  return {
    start: dateKeyToUtc(startDate, timezone),
    endExclusive: dateKeyToUtc(addDateKeyDays(endDate, 1), timezone),
    calendarDays,
  };
};

const getBillingEmployeeAccess = (user, requestedId) => {
  const targetId = String(requestedId || "");
  if (user?.role !== "admin") {
    return { forbidden: true, targetId, filter: null };
  }
  const filter = { _id: targetId };
  return { forbidden: false, targetId, filter };
};

const overlapSeconds = (startA, endA, startB, endB) => {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  return Math.max(0, (end - start) / 1000);
};

const splitLogByDay = (log, rangeStart, rangeEnd, timezone) => {
  const logStart = new Date(log.startedAt);
  const logEnd = new Date(log.stoppedAt);
  const clippedStart = new Date(Math.max(logStart.getTime(), rangeStart.getTime()));
  const clippedEnd = new Date(Math.min(logEnd.getTime(), rangeEnd.getTime()));
  if (clippedEnd <= clippedStart) return [];

  const pauses = (log.pauses || []).
    filter((pause) => pause.pausedAt && pause.resumedAt).
    map((pause) => ({ start: new Date(pause.pausedAt), end: new Date(pause.resumedAt) }));
  const segments = [];
  let cursor = clippedStart;
  while (cursor < clippedEnd) {
    const date = getDateKeyInTimezone(cursor, timezone);
    const nextBoundary = dateKeyToUtc(addDateKeyDays(date, 1), timezone);
    const segmentEnd = new Date(Math.min(clippedEnd.getTime(), nextBoundary.getTime()));
    const elapsedSeconds = (segmentEnd.getTime() - cursor.getTime()) / 1000;
    const pausedSeconds = pauses.reduce(
      (total, pause) => total + overlapSeconds(cursor, segmentEnd, pause.start, pause.end),
      0,
    );
    const seconds = Math.max(0, Math.floor(elapsedSeconds - pausedSeconds));
    if (seconds > 0) segments.push({ date, startedAt: cursor, stoppedAt: segmentEnd, seconds });
    cursor = segmentEnd;
  }

  const isWholeLog = clippedStart.getTime() === logStart.getTime() && clippedEnd.getTime() === logEnd.getTime();
  if (isWholeLog && segments.length === 1 && Number.isFinite(log.totalWorkedSeconds)) {
    segments[0].seconds = Math.max(0, Math.floor(log.totalWorkedSeconds));
  }
  return segments;
};

const aggregateBillingLogs = ({ logs, employee, startDate, endDate, timezone, rangeStart, rangeEnd }) => {
  const taskGroups = new Map();
  const dailyGroups = new Map();
  let taskSeconds = 0;
  let breakSeconds = 0;

  for (const log of logs) {
    const task = log.taskRecord || {};
    const project = log.projectRecord || {};
    const isBreak = task.taskType === "break";
    for (const segment of splitLogByDay(log, rangeStart, rangeEnd, timezone)) {
      if (isBreak) breakSeconds += segment.seconds;
      else taskSeconds += segment.seconds;

      if (!isBreak) {
        const key = `${project._id || log.project}:${task._id || log.task}`;
        const current = taskGroups.get(key) || {
          projectId: String(project._id || log.project),
          projectCode: project.projectCode || "",
          projectName: project.projectName || "Deleted project",
          clientName: project.clientName || "",
          taskId: String(task._id || log.task),
          taskCode: task.taskCode || "",
          taskName: task.taskName || "Deleted task",
          taskDescription: task.description || "",
          totalSeconds: 0,
        };
        current.totalSeconds += segment.seconds;
        taskGroups.set(key, current);
      }

      const day = dailyGroups.get(segment.date) || { date: segment.date, taskSeconds: 0, breakSeconds: 0, entries: [] };
      if (isBreak) day.breakSeconds += segment.seconds;
      else day.taskSeconds += segment.seconds;
      day.entries.push({
        logId: String(log._id),
        type: isBreak ? "break" : "work",
        projectId: String(project._id || log.project),
        projectName: project.projectName || "Deleted project",
        clientName: project.clientName || "",
        taskId: String(task._id || log.task),
        taskName: task.taskName || "Deleted task",
        taskDescription: task.description || "",
        startedAt: segment.startedAt.toISOString(),
        stoppedAt: segment.stoppedAt.toISOString(),
        durationSeconds: segment.seconds,
      });
      dailyGroups.set(segment.date, day);
    }
  }

  const taskSummary = [...taskGroups.values()].sort((a, b) =>
    a.projectName.localeCompare(b.projectName) || a.taskName.localeCompare(b.taskName));
  const projectsMap = new Map();
  for (const task of taskSummary) {
    const project = projectsMap.get(task.projectId) || {
      projectId: task.projectId,
      projectCode: task.projectCode,
      projectName: task.projectName,
      clientName: task.clientName,
      totalSeconds: 0,
      tasks: [],
    };
    project.totalSeconds += task.totalSeconds;
    project.tasks.push(task);
    projectsMap.set(task.projectId, project);
  }

  const dailyDetails = [...dailyGroups.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of dailyDetails) {
    day.totalSeconds = day.taskSeconds + day.breakSeconds;
    day.entries.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  return {
    employee,
    period: { startDate, endDate, timezone },
    summary: {
      taskSeconds,
      breakSeconds,
      totalSeconds: taskSeconds + breakSeconds,
      workingDays: dailyDetails.length,
      taskCount: new Set(taskSummary.map((task) => task.taskId)).size,
      projectCount: projectsMap.size,
    },
    projects: [...projectsMap.values()],
    taskSummary,
    dailyDetails,
  };
};

module.exports = {
  DEFAULT_TIMEZONE,
  MAX_BILLING_RANGE_DAYS,
  aggregateBillingLogs,
  getBillingDateRange,
  getBillingEmployeeAccess,
  getDateKeyInTimezone,
};
