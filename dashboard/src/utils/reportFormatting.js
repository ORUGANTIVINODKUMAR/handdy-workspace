export const formatReportDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours) return `${hours}h ${minutes}m${remainder ? ` ${remainder}s` : ""}`;
  if (minutes) return `${minutes}m${remainder ? ` ${remainder}s` : ""}`;
  return `${remainder}s`;
};

export const formatReportDateTime = (value) => new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
}).format(new Date(value));

export const reportEntryStatus = (record, entry) => {
  if (entry.source === "between_sessions") return "Idle between tasks";
  if (entry.type === "untracked") return "Untracked";
  if (entry.isOpen) return entry.type === "break" ? "On break" : entry.type === "idle" ? "Idle" : "Running";
  if (record.stopReason === "desktop_disconnected" && entry.end === record.stoppedAt) return "Desktop disconnected";
  return "Completed";
};
