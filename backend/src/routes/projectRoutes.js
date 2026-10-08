const express = require("express");

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const router = express.Router();
const catalogCache = require("../middleware/catalogCache");
const Project = require("../models/Project");
const Client = require("../models/Client");
const Team = require("../models/Team");
const Employee = require("../models/Employee");

// All logged-in users can view projects
router.get("/", protect, catalogCache([Project, Client, Team, Employee], { shared: true }), getAllProjects);
router.get("/:id", protect, getProjectById);

// Admin and Manager can manage projects
router.post("/", protect, authorizeRoles("admin", "manager", "hr"), createProject);
router.put("/:id", protect, authorizeRoles("admin", "manager", "hr"), updateProject);
router.delete("/:id", protect, authorizeRoles("admin", "manager", "hr"), deleteProject);

module.exports = router;
