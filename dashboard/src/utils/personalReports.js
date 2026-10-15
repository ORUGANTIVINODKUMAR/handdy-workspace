import { dateKeyInTimezone } from "./appDate.js";

// Distinct calendar days (in the business timezone) on which a timer was started.
export const countWorkedDays = (records) => new Set(
  records
    .filter((record) => record?.startedAt)
    .map((record) => dateKeyInTimezone(new Date(record.startedAt))),
).size;
