const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (query = {}) => {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const requestedLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : DEFAULT_PAGE_SIZE;
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

  return { page, limit, skip: (page - 1) * limit };
};

const getDateKey = (date = new Date()) => {
  const timezone = process.env.APP_TIMEZONE || "Asia/Kolkata";

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
};

module.exports = {
  escapeRegExp,
  getDateKey,
  getPagination,
  MAX_PAGE_SIZE,
};
