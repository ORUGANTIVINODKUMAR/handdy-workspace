const express = require("express");

const {
  getAllEmployees,
  getMyTeam,
  getMyTeamMemberById,
  getEmployeeById,
  updateEmployee,
  resetEmployeePassword,
  assignTeamLead,
  deleteEmployee,
} = require("../controllers/employeeController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const router = express.Router();

// Admin - get all employees
router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAllEmployees
);

// Team Lead - get only assigned team members
router.get(
  "/my-team",
  protect,
  authorizeRoles("team_lead"),
  getMyTeam
);

// Team Lead - get one assigned team member by ID
router.get(
  "/my-team/:id",
  protect,
  authorizeRoles("team_lead"),
  getMyTeamMemberById
);

// Admin - assign or remove Team Lead for an employee
router.put(
  "/:id/team-lead",
  protect,
  authorizeRoles("admin"),
  assignTeamLead
);

// Admin - get employee by ID
router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  getEmployeeById
);

// Admin - update employee
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateEmployee
);

// Admin - reset an employee's password
router.put(
  "/:id/reset-password",
  protect,
  authorizeRoles("admin"),
  resetEmployeePassword
);

// Admin - delete employee
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteEmployee
);

module.exports = router;