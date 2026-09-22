const express = require("express");

const {
  startTimer,
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
const { authorizeRoles } = require("../middleware/authorizeRoles");

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
  authorizeRoles("admin", "manager", "hr"),
  getAllTimeLogs
);

// Team Lead - view time logs for assigned team only
router.get(
  "/team",
  protect,
  authorizeRoles("team_lead"),
  getMyTeamTimeLogs
);

// Admin, Team Lead, and Employee can control their own timer
router.post("/start", protect, startTimer);
router.post("/pause", protect, pauseTimer);
router.post("/resume", protect, resumeTimer);
router.post("/stop", protect, stopTimer);
router.patch("/note", protect, updateNote);
router.get("/active", protect, getActiveTimer);
router.get("/history", protect, getMyTimeLogs);
router.get("/my", protect, getMyTimeLogs);

module.exports = router;
