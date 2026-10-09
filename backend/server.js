require("dotenv").config();

const dns = require("dns");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const errorHandler = require("./src/middleware/errorHandler");

const connectDatabase = require("./src/config/db");
const { validateProductionConfig } = require("./src/config/productionConfig");
const { verifyEmailTransport } = require("./src/utils/mailer");
const { ensureAuthSessionIndexes } = require("./src/services/authSessionService");
const { closeStaleDesktopTimers } = require("./src/services/desktopTimerLease");
const { refreshPermissionOverrides } = require("./src/services/permissionService");

// ==============================
// ROUTES
// ==============================
const authRoutes = require("./src/routes/authRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const projectRoutes = require("./src/routes/projectRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const taskTimeLogRoutes = require("./src/routes/taskTimeLogRoutes");
const shiftRoutes = require("./src/routes/shiftRoutes");
const scheduleRoutes = require("./src/routes/scheduleRoutes");
const teamRoutes = require("./src/routes/teamRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const billingRoutes = require("./src/routes/billingRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const permissionRoutes = require("./src/routes/permissionRoutes");

// ==============================
// MONGODB DNS
// ==============================
if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(
    process.env.MONGODB_DNS_SERVERS.split(",").map((value) => value.trim())
  );
}

const app = express();

// Render sits the app behind a single reverse-proxy hop; trust that hop's
// X-Forwarded-For so req.ip (used by the rate limiters) reflects the real
// client IP instead of the proxy's address.
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const dashboardBuildPath = path.resolve(__dirname, "../dashboard/dist");

// ==============================
// MIDDLEWARE
// ==============================
app.use(express.json({ limit: "1mb" }));

// Strip any Mongo operator ($-prefixed) or dot-prefixed keys from user input
// before it can reach any Model.find()/update() call, closing off NoSQL
// operator injection via query params, body fields, or route params.
// Express 5 exposes req.query as a getter-only property, so this sanitizes
// each object's keys in place instead of using the package's own middleware
// (which reassigns req.query and would throw under Express 5).
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  if (process.env.NODE_ENV === "production") {
    res.set({
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": [
        "default-src 'self'",
        "base-uri 'self'",
        "connect-src 'self'",
        "font-src 'self' data:",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data: blob:",
        "object-src 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "upgrade-insecure-requests",
      ].join("; "),
    });
  }
  next();
});

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const developmentOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];
const browserOrigins = [...new Set([
  ...configuredOrigins,
  ...(process.env.NODE_ENV === "production" ? [] : developmentOrigins),
])];

// Electron pages loaded with loadFile send the opaque `null` origin. Keep it
// available even when browser origins are supplied through CORS_ORIGINS.
const allowedOrigins = [...new Set([...browserOrigins, "null"])];

app.use(
  cors({
    origin: allowedOrigins,

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ==============================
// API ROUTES
// ==============================
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/time-logs", taskTimeLogRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/permissions", permissionRoutes);

// Keep missing API paths as JSON responses instead of returning the React app.
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// ==============================
// HEALTH CHECK
// ==============================
app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Employee Time & Attendance Backend is Running",
  });
});

// Desktop installers are distributed directly by the organization, not
// through the employee web dashboard.
app.get("/downloads/{*splat}", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Desktop downloads are not available from the browser.",
  });
});

// ==============================
// PRODUCTION DASHBOARD
// ==============================
// Render builds the React dashboard before starting this server. Serving the
// static files here keeps the dashboard and API on one domain: / and /api.
if (fs.existsSync(dashboardBuildPath)) {
  app.use(express.static(dashboardBuildPath));

  app.get("/{*splat}", (req, res) => {
    return res.sendFile(path.join(dashboardBuildPath, "index.html"));
  });
}

// ==============================
// 404
// ==============================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// ==============================
// START SERVER
// ==============================
app.use(errorHandler);

const startServer = async () => {
  try {
    validateProductionConfig();
    await verifyEmailTransport();
    await connectDatabase();
    await ensureAuthSessionIndexes();
    await refreshPermissionOverrides();
    const timerSweep = setInterval(() => {
      closeStaleDesktopTimers().catch((error) => console.error("Unable to close stale desktop timers:", error));
    }, 30_000);
    timerSweep.unref();
    await closeStaleDesktopTimers();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          "================================="
        );

        console.log(
          `Server running on: http://localhost:${PORT}`
        );

        console.log(
          `Health check: http://localhost:${PORT}/health`
        );

        console.log(
          "================================="
        );
      }
    );
  } catch (error) {
    console.error(
      "Failed to start server:"
    );

    console.error(error);

    process.exit(1);
  }
};

startServer();
