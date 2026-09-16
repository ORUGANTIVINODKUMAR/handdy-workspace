const DEVELOPMENT_API_BASE_URL = "http://localhost:5000/api";
const PRODUCTION_APP_ORIGIN = "https://handdy-workspace.onrender.com";
const PRODUCTION_API_BASE_URL = `${PRODUCTION_APP_ORIGIN}/api`;

const normalizeApiBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const resolveApiBaseUrl = ({ isPackaged, override } = {}) => normalizeApiBaseUrl(
  override || (isPackaged ? PRODUCTION_API_BASE_URL : DEVELOPMENT_API_BASE_URL)
);

module.exports = {
  DEVELOPMENT_API_BASE_URL,
  PRODUCTION_APP_ORIGIN,
  PRODUCTION_API_BASE_URL,
  normalizeApiBaseUrl,
  resolveApiBaseUrl,
};
