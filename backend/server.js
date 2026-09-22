require("dotenv").config();

const dns = require("dns");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");

const connectDatabase = require("./src/config/db");
const { verifyEmailTransport } = require("./src/utils/mailer");
const Employee = require("./src/models/Employee");
const Project = require("./src/models/Project");
const { ensureAuthSessionIndexes } = require("./src/services/authSessionService");

const DEFAULT_PROJECT_NAMES = [
  "Software",
  "FTC WCPA",
  "KCPA",
  "KCPA & Renau",
  "CPA & Unit 1",
];

const ensureDefaultProjects = async () => {
  const owner = await Employee.findOne({ isActive: true }).select("_id").lean();
  if (!owner) {
    console.warn("Default projects were not created because no active employee exists yet.");
    return;
  }

  for (const projectName of DEFAULT_PROJECT_NAMES) {
    const existingProject = await Project.findOne({ projectName });
    if (existingProject) {
      continue;
    }

    await Project.create({
      projectCode: `DEFAULT-${projectName.replace(/[^A-Z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase()}`,
      projectName,
      createdBy: owner._id,
    });
  }
};

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

const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== "production") return;

  const missing = ["MONGODB_URI", "JWT_SECRET"].filter(
    (name) => !String(process.env[name] || "").trim()
  );
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const jwtSecret = String(process.env.JWT_SECRET);
  if (jwtSecret.length < 32 || /replace|change|secret/i.test(jwtSecret)) {
    throw new Error("JWT_SECRET must be a non-placeholder value of at least 32 characters in production.");
  }
};

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
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
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
const browserOrigins = [...new Set([...configuredOrigins, ...developmentOrigins])];

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

// Keep missing API paths as JSON responses instead of returning the React app.
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

const desktopInstallerPath = path.resolve(dashboardBuildPath, "downloads", "CRM-Setup.exe");
app.get("/downloads/CRM-Setup.exe", (req, res) => {
  if (!fs.existsSync(desktopInstallerPath)) {
    console.error(`Desktop installer not found at: ${desktopInstallerPath}`);
    return res.status(404).json({
      success: false,
      message: "The CRM Windows installer is not available yet.",
    });
  }

  return res.download(desktopInstallerPath, "CRM-Setup.exe", {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
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
const startServer = async () => {
  try {
    validateProductionConfig();
    await verifyEmailTransport();
    await connectDatabase();
    await ensureAuthSessionIndexes();
    await ensureDefaultProjects();

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
