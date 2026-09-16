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

// All logged-in users can view projects
router.get("/", protect, getAllProjects);
router.get("/:id", protect, getProjectById);

// Admin and Manager can manage projects
router.post("/", protect, authorizeRoles("admin", "manager", "hr"), createProject);
router.put("/:id", protect, authorizeRoles("admin", "manager", "hr"), updateProject);
router.delete("/:id", protect, authorizeRoles("admin", "manager", "hr"), deleteProject);

module.exports = router;