const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
);

export const API_ENVIRONMENT = import.meta.env.DEV ? "development" : "production";
