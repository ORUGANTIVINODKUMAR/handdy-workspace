const Employee = require("../models/Employee");
const { escapeRegExp, getPagination } = require("../utils/requestUtils");
const Team = require("../models/Team");
const { syncEmployeeTeam } = require("../services/teamAssignmentService");
const { validateProjectRates } = require("../services/projectRateService");

const populateEmployeeRates = (query) => query.populate(
  "projectRates.project",
  "projectCode projectName status",
);

const handleEmployeeError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Employee ID or email already exists.",
    });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
  return res.status(500).json({
    success: false,
    message: "Unable to process the employee request.",
  });
};

// Get all employees
const getAllEmployees = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = req.query.search || "";
    const role = req.query.role || ""
    const department = req.query.department || "";
    const team = req.query.team || "";
    const isActive = req.query.isActive; // This can be 'true', 'false', or undefined
    const allowedSorts = new Set([
      "createdAt", "-createdAt", "fullName", "-fullName",
      "employeeId", "-employeeId", "email", "-email",
    ]);
    const sort = allowedSorts.has(req.query.sort)
      ? req.query.sort
      : "-createdAt";


    const filter = {};
    if (search) {
      const safeSearch = escapeRegExp(search);
      filter.$or = [
        { employeeId: { $regex: safeSearch, $options: "i" } },
        { fullName: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { role: { $regex: safeSearch, $options: "i" } },
        { department: { $regex: safeSearch, $options: "i" } },
        { designation: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (role) {
      filter.role = role;
    }

    if (department) {
      filter.department = department;
    }
    if (team) {
      filter.team = team;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    const totalEmployees = await Employee.countDocuments(filter);

    const employees = await populateEmployeeRates(Employee.find(filter)
      .select("-password")
      .populate("team", "teamName isActive")
      .populate("teamLead", "employeeId fullName")
      .sort(sort)
      .skip(skip)
      .limit(limit));

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalEmployees / limit),
      count: employees.length,
      employees,
      totalEmployees,
    });
  } catch (error) {
    return handleEmployeeError(res, error);
  }
};
// Get one employee by MongoDB ID
const getEmployeeById = async (req, res) => {
  try {
    const employee = await populateEmployeeRates(Employee.findById(req.params.id).select("-password")
      .populate("team", "teamName isActive")
      .populate("teamLead", "employeeId fullName"));

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Update employee
const updateEmployee = async (req, res) => {
  try {
  
    const employee = await Employee.findById(req.params.id).select("+rememberedSessionTokenHash +rememberedSessionExpires");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const allowedFields = [
      "employeeId", "fullName", "email", "role", "department",
      "designation", "companyName", "address1", "address2", "city",
      "state", "postalCode", "country", "phoneNumber", "isActive",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) employee[field] = req.body[field];
    }

    if (req.body.projectRates !== undefined) {
      const existingProjectIds = employee.projectRates.map((assignment) => assignment.project);
      employee.projectRates = await validateProjectRates(req.body.projectRates, { existingProjectIds });
    }

    if (req.body.password !== undefined) {
      if (typeof req.body.password !== "string" || req.body.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
      }
      employee.password = req.body.password;
      employee.rememberedSessionTokenHash = null;
      employee.rememberedSessionExpires = null;
    }

    if (req.body.isActive === false) {
      employee.rememberedSessionTokenHash = null;
      employee.rememberedSessionExpires = null;
    }

    const requestedTeam = req.body.team !== undefined ? req.body.team : employee.team;
    await syncEmployeeTeam(employee, requestedTeam);
    const updatedEmployee = await populateEmployeeRates(Employee.findById(employee._id)
      .populate("team", "teamName isActive")
      .populate("teamLead", "employeeId fullName"));

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      employee: updatedEmployee,
    });
  } catch (error) {
    return handleEmployeeError(res, error);
  }
};
// Admin - reset an employee's password directly
const resetEmployeePassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const employee = await Employee.findById(req.params.id).select("+tokenVersion +rememberedSessionTokenHash +rememberedSessionExpires");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    employee.password = password;
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;
    employee.rememberedSessionTokenHash = null;
    employee.rememberedSessionExpires = null;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    return handleEmployeeError(res, error);
  }
};
// Admin - assign or remove a Team Lead for an employee
const assignTeamLead = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { teamLeadId } = req.body;

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Remove Team Lead assignment
    if (!teamLeadId) {
      employee.teamLead = null;
      employee.team = null;
      await employee.save();

      return res.status(200).json({
        success: true,
        message: "Team Lead assignment removed successfully.",
        employee,
      });
    }

    const teamLead = await Employee.findOne({
      _id: teamLeadId,
      role: "team_lead",
      isActive: true,
    });

    if (!teamLead) {
      return res.status(400).json({
        success: false,
        message: "Selected Team Lead is invalid or inactive.",
      });
    }

    if (employee._id.toString() === teamLead._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "An employee cannot be assigned as their own Team Lead.",
      });
    }

    employee.teamLead = teamLead._id;
    const leadTeam = await Team.findOne({ teamLead: teamLead._id, isActive: true });
    employee.team = leadTeam?._id || null;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Team Lead assigned successfully.",
      employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Deactivate an employee instead of deleting linked historical records.
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select("+rememberedSessionTokenHash +rememberedSessionExpires");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (employee._id.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    employee.isActive = false;
    employee.teamLead = null;
    employee.team = null;
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;
    employee.rememberedSessionTokenHash = null;
    employee.rememberedSessionExpires = null;
    await employee.save();

    await Employee.updateMany(
      { teamLead: employee._id },
      { $set: { teamLead: null } }
    );
    await Team.updateMany(
      { teamLead: employee._id },
      { $set: { teamLead: null } }
    );

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Get employees assigned to the logged-in Team Lead
const getMyTeam = async (req, res) => {
  try {
    const teamLeadId = req.user._id;

    const employees = await populateEmployeeRates(Employee.find({
      teamLead: teamLeadId,
      isActive: true,
    })
      .select("-password")
      .populate("team", "teamName")
      .sort("fullName"));

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Team Lead - get one assigned team member by ID
const getMyTeamMemberById = async (req, res) => {
  try {
    const teamLeadId = req.user._id;

    const employee = await populateEmployeeRates(Employee.findOne({
      _id: req.params.id,
      teamLead: teamLeadId,
      isActive: true,
    }).select("-password"));

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Team member not found or not assigned to you.",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  getAllEmployees,
  getMyTeam,
  getMyTeamMemberById,
  getEmployeeById,
  updateEmployee,
  resetEmployeePassword,
  deleteEmployee,
  assignTeamLead,
};
