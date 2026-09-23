const LOCAL_DEVELOPMENT_URL = "http://localhost:5173";

const getFrontendUrl = (env = process.env) => {
  const configuredUrl = String(env.FRONTEND_URL || env.RENDER_EXTERNAL_URL || "").trim();
  return (configuredUrl || LOCAL_DEVELOPMENT_URL).replace(/\/$/, "");
};

const validateProductionConfig = (env = process.env) => {
  if (env.NODE_ENV !== "production") return;

  const missing = ["MONGODB_URI", "JWT_SECRET"].filter(
    (name) => !String(env[name] || "").trim()
  );
  if (!String(env.FRONTEND_URL || env.RENDER_EXTERNAL_URL || "").trim()) {
    missing.push("FRONTEND_URL (or RENDER_EXTERNAL_URL)");
  }
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const jwtSecret = String(env.JWT_SECRET);
  if (jwtSecret.length < 32 || /replace|change|secret/i.test(jwtSecret)) {
    throw new Error("JWT_SECRET must be a non-placeholder value of at least 32 characters in production.");
  }

  let frontendUrl;
  try {
    frontendUrl = new URL(getFrontendUrl(env));
  } catch {
    throw new Error("FRONTEND_URL must be a valid absolute URL in production.");
  }
  const hostname = frontendUrl.hostname.toLowerCase();
  if (frontendUrl.protocol !== "https:" || hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "[::1]" || /^127\./.test(hostname)) {
    throw new Error("FRONTEND_URL must use HTTPS and must not point to localhost in production.");
  }
  if (frontendUrl.username || frontendUrl.password || frontendUrl.search || frontendUrl.hash || frontendUrl.pathname !== "/") {
    throw new Error("FRONTEND_URL must be an HTTPS origin without credentials, a path, query, or fragment.");
  }
};

module.exports = {
  getFrontendUrl,
  validateProductionConfig,
};
