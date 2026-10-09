// "Today" for every date-based CRM screen, in the same business timezone the
// backend uses for day boundaries (APP_TIMEZONE, default Asia/Kolkata). Using
// the browser's own timezone made a screen open on a different calendar day
// than the server's reports around midnight.
export const APP_TIMEZONE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_TIMEZONE) || "Asia/Kolkata";

export const dateKeyInTimezone = (date = new Date(), timezone = APP_TIMEZONE) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
  } catch {
    // An invalid timezone setting must not break every report screen.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
  }
};

export const todayDateKey = (now = new Date()) => dateKeyInTimezone(now);

// Calendar arithmetic on YYYY-MM-DD keys, independent of any timezone.
export const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

// Day of week (0 = Sunday) of a YYYY-MM-DD key.
export const dayOfWeekOfDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};
