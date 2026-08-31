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

// Admin can manage projects
router.post("/", protect, authorizeRoles("admin"), createProject);
router.put("/:id", protect, authorizeRoles("admin"), updateProject);
router.delete("/:id", protect, authorizeRoles("admin"), deleteProject);

module.exports = router;