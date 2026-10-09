const express = require("express");

const {
  startTimer,
  heartbeatTimer,
  pauseTimer,
  resumeTimer,
  updateNote,
  stopTimer,
  getActiveTimer,
  getMyTeamTimeLogs,
  getMyTimeLogs,
  getAllTimeLogs,
  getLiveTimers,
} = require("../controllers/taskTimeLogController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, requirePermission } = require("../middleware/authorizeRoles");
const { createManualEntry, deleteManualEntry, getManualEntryOptions } = require("../controllers/manualTimeEntryController");

const router = express.Router();

router.get(
  "/live",
  protect,
  authorizeRoles("admin", "team_lead"),
  getLiveTimers
);

router.get(
  "/admin",
  protect,
  requirePermission("view_all_reports"),
  getAllTimeLogs
);

// Team Lead - view time logs for assigned team only
router.get(
  "/team",
  protect,
  authorizeRoles("team_lead"),
  requirePermission("view_team_timesheets"),
  getMyTeamTimeLogs
);

// Manual (back-filled) entries: permission-gated, scope-checked in the controller.
router.get("/manual/options", protect, requirePermission("add_manual_entries"), getManualEntryOptions);
router.post("/manual", protect, requirePermission("add_manual_entries"), createManualEntry);
router.delete("/manual/:id", protect, requirePermission("add_manual_entries"), deleteManualEntry);

// Admin, Team Lead, and Employee can control their own timer
router.post("/start", protect, startTimer);
router.post("/heartbeat", protect, heartbeatTimer);
router.post("/pause", protect, pauseTimer);
router.post("/resume", protect, resumeTimer);
router.post("/stop", protect, stopTimer);
router.patch("/note", protect, updateNote);
router.get("/active", protect, getActiveTimer);
router.get("/history", protect, getMyTimeLogs);
router.get("/my", protect, getMyTimeLogs);

module.exports = router;
