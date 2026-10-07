const express = require("express");

const {
  getAllEmployees,
  getEmployeeOptions,
  getMyTeam,
  getMyTeamMemberById,
  getEmployeeById,
  updateEmployee,
  updateEmployeePermissions,
  resetEmployeePassword,
  assignTeamLead,
  deleteEmployee,
} = require("../controllers/employeeController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, authorizeAccess, authorizeRolesOrPermissions } = require("../middleware/authorizeRoles");

const router = express.Router();

// Operational selectors need identity/team data, not account administration.
router.get(
  "/options",
  protect,
  authorizeRolesOrPermissions({ roles: ["hr"], permissions: ["create_employees", "edit_employees"] }),
  getEmployeeOptions
);

// Admin, or anyone granted create_employees/edit_employees - get all employees
router.get(
  "/",
  protect,
  authorizeAccess("create_employees", "edit_employees"),
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

// Admin, or anyone granted create_employees/edit_employees - get employee by ID
router.get(
  "/:id",
  protect,
  authorizeAccess("create_employees", "edit_employees"),
  getEmployeeById
);

// Admin, or anyone granted edit_employees - update employee
router.put(
  "/:id",
  protect,
  authorizeAccess("edit_employees"),
  updateEmployee
);

// Admin - grant or revoke a delegated employee's permissions
router.put(
  "/:id/permissions",
  protect,
  authorizeRoles("admin"),
  updateEmployeePermissions
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
