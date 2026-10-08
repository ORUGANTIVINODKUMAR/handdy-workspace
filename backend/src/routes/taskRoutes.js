const express = require("express");

const {
  createTask,
  createTasksBulk,
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
const catalogCache = require("../middleware/catalogCache");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Team = require("../models/Team");
const Employee = require("../models/Employee");

// ==============================================
// CREATE TASK
// Admin + Team Lead
// ==============================================
router.post(
  "/",
  protect,
  authorizeRoles("admin", "team_lead", "manager", "hr"),
  createTask
);

router.post(
  "/bulk",
  protect,
  authorizeRoles("admin", "team_lead", "manager", "hr"),
  createTasksBulk
);

// ==============================================
// GET ALL TASKS
// Logged-in users
// ==============================================
router.get(
  "/",
  protect,
  catalogCache([Task, Project, Team, Employee]),
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
  authorizeRoles("admin", "team_lead", "manager", "hr"),
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
  authorizeRoles("admin", "team_lead", "manager", "hr"),
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
  authorizeRoles("admin", "team_lead", "manager", "hr"),
  updateTask
);

// ==============================================
// DELETE TASK
// ==============================================
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "team_lead", "manager", "hr"),
  deleteTask
);

module.exports = router;
