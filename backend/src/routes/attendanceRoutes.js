const express = require("express");
const router = express.Router();

const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getMyTeamTodayAttendance,
  getMyTeamAttendanceHistory,
  getAllAttendanceHistory,
} = require("../controllers/attendanceController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

// Personal attendance
router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);

// Team Lead - today's attendance for assigned team only
router.get(
  "/team/today",
  protect,
  authorizeRoles("team_lead"),
  getMyTeamTodayAttendance
);
router.get(
  "/team/history",
  protect,
  authorizeRoles("team_lead"),
  getMyTeamAttendanceHistory
);
// Admin - company-wide attendance history
router.get(
  "/admin/history",
  protect,
  authorizeRoles("admin"),
  getAllAttendanceHistory
);


// Personal attendance views
router.get("/today", protect, getTodayAttendance);
router.get("/history", protect, getAttendanceHistory);

module.exports = router;