const express = require("express");

const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  resolveProjectForTeams,
} = require("../controllers/taskController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/authorizeRoles");

const router = express.Router();

// ==============================================
// CREATE TASK
// Admin + Team Lead
// ==============================================
router.post(
  "/",
  protect,
  authorizeRoles("admin", "team_lead"),
  createTask
);

// ==============================================
// GET ALL TASKS
// Logged-in users
// ==============================================
router.get(
  "/",
  protect,
  getAllTasks
);

// ==============================================
// RESOLVE PROJECT FOR TEAM(S)
// IMPORTANT:
// Keep this BEFORE /:id
// ==============================================
router.get(
  "/resolve-project",
  protect,
  authorizeRoles("admin", "team_lead"),
  resolveProjectForTeams
);

// ==============================================
// TOGGLE ACTIVE / INACTIVE
// IMPORTANT:
// Keep this BEFORE /:id
// ==============================================
router.patch(
  "/:id/toggle-status",
  protect,
  authorizeRoles("admin", "team_lead"),
  toggleTaskStatus
);

// ==============================================
// GET TASK
// ==============================================
router.get(
  "/:id",
  protect,
  getTaskById
);

// ==============================================
// UPDATE TASK
// ==============================================
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "team_lead"),
  updateTask
);

// ==============================================
// DELETE TASK
// ==============================================
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "team_lead"),
  deleteTask
);

module.exports = router;