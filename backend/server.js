require("dotenv").config();

const dns = require("dns");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const connectDatabase = require("./src/config/db");

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

// ==============================
// MONGODB DNS
// ==============================
if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(
    process.env.MONGODB_DNS_SERVERS.split(",").map((value) => value.trim())
  );
}

const app = express();

const PORT = process.env.PORT || 5000;
const dashboardBuildPath = path.resolve(__dirname, "../dashboard/dist");

// ==============================
// MIDDLEWARE
// ==============================
app.use(express.json({ limit: "1mb" }));

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const browserOrigins = configuredOrigins.length
  ? configuredOrigins
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ];

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
    await connectDatabase();

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
