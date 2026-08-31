const express = require("express");

const {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/scheduleController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/authorizeRoles");

const router = express.Router();

// CREATE SCHEDULE
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createSchedule
);

// GET ALL SCHEDULES
router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAllSchedules
);

// GET ONE SCHEDULE
router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  getScheduleById
);

// UPDATE SCHEDULE
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateSchedule
);

// DELETE SCHEDULE
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteSchedule
);

module.exports = router;