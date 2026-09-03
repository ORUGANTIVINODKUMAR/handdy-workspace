const Employee = require("../models/Employee");
const generateToken = require("../utils/generateToken");
const Team = require("../models/Team");
const { syncEmployeeTeam } = require("../services/teamAssignmentService");
const { sendPasswordResetEmail } = require("../utils/mailer");
const { validateProjectRates } = require("../services/projectRateService");
const {
  generatePasswordResetToken,
  hashResetToken,
} = require("../utils/passwordResetUtils");

// ======================================================
// BUILD SAFE USER RESPONSE
// ======================================================
const buildUserResponse = (employee) => {
  return {
    id: employee._id,

    employeeId: employee.employeeId,

    fullName: employee.fullName,

    firstName: employee.firstName || "",
    lastName: employee.lastName || "",

    email: employee.email,

    role: employee.role,

    department: employee.department || "",
    designation: employee.designation || "",
    team: employee.team || null,

    companyName: employee.companyName || "",

    address1: employee.address1 || "",
    address2: employee.address2 || "",

    city: employee.city || "",
    state: employee.state || "",
    postalCode: employee.postalCode || "",

    country: employee.country || "",
    phoneNumber: employee.phoneNumber || "",

    projectRates: employee.projectRates || [],

    isActive: employee.isActive,

    lastLoginAt: employee.lastLoginAt,

    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
};

// ======================================================
// ERROR HANDLER
// ======================================================
const handleControllerError = (res, error) => {
  console.error("Auth Controller Error:", error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  if (error.code === 11000) {
    const duplicateField =
      Object.keys(error.keyPattern || {})[0] || "field";

    return res.status(400).json({
      success: false,
      message: `${duplicateField} already exists.`,
    });
  }

  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((item) => item.message)
      .join(" ");

    return res.status(400).json({
      success: false,
      message,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
};

// ======================================================
// REGISTER EMPLOYEE
// ======================================================
const register = async (req, res) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      password,
      role,
      department,
      designation,
      team,
      projectRates,
    } = req.body;

    if (
      !employeeId ||
      !fullName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee ID, Full Name, Email and Password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedEmployeeId =
      employeeId.trim().toUpperCase();

    const normalizedFullName =
      fullName.trim();

    const normalizedRole = role || "employee";
    const normalizedProjectRates = await validateProjectRates(projectRates);
    if (["employee", "team_lead"].includes(normalizedRole)) {
      const validTeam = team && await Team.exists({ _id: team, isActive: true });
      if (!validTeam) {
        return res.status(400).json({ success: false, message: "An active team is required for employees and Team Leads." });
      }
    }

    const employeeExists =
      await Employee.findOne({
        email: normalizedEmail,
      });

    if (employeeExists) {
      return res.status(400).json({
        success: false,
        message:
          "An employee with this email already exists.",
      });
    }

    const employeeIdExists =
      await Employee.findOne({
        employeeId: normalizedEmployeeId,
      });

    if (employeeIdExists) {
      return res.status(400).json({
        success: false,
        message:
          "An employee with this Employee ID already exists.",
      });
    }

    const nameParts =
      normalizedFullName.split(/\s+/);

    const employee =
      await Employee.create({
        employeeId: normalizedEmployeeId,

        fullName: normalizedFullName,

        firstName:
          nameParts[0] || "",

        lastName:
          nameParts.slice(1).join(" "),

        email: normalizedEmail,

        password,

        role: normalizedRole,

        department:
          department?.trim() || "",

        designation:
          designation?.trim() || "",

        projectRates: normalizedProjectRates,
      });

    await syncEmployeeTeam(employee, team);

    const token =
      generateToken(employee._id, employee.tokenVersion);

    return res.status(201).json({
      success: true,

      message:
        "Employee registered successfully.",

      token,

      user:
        buildUserResponse(employee),
    });
  } catch (error) {
    return handleControllerError(
      res,
      error
    );
  }
};

// ======================================================
// LOGIN EMPLOYEE
// ======================================================
const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,

        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const employee =
      await Employee.findOne({
        email: normalizedEmail,
      }).select("+password +tokenVersion");

    if (!employee) {
      return res.status(401).json({
        success: false,

        message:
          "Invalid email or password.",
      });
    }

    if (!employee.isActive) {
      return res.status(403).json({
        success: false,

        message:
          "Your account is inactive. Please contact the administrator.",
      });
    }

    const passwordMatches =
      await employee.comparePassword(
        password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,

        message:
          "Invalid email or password.",
      });
    }

    employee.lastLoginAt =
      new Date();

    await employee.save();

    const token =
      generateToken(employee._id, employee.tokenVersion);

    return res.status(200).json({
      success: true,

      message:
        "Login successful.",

      token,

      user:
        buildUserResponse(employee),
    });
  } catch (error) {
    return handleControllerError(
      res,
      error
    );
  }
};

// ======================================================
// GET CURRENT USER PROFILE
// GET /api/auth/me
// ======================================================
const getProfile = async (req, res) => {
  try {
    const employee =
      await Employee.findById(
        req.user._id
      );

    if (!employee) {
      return res.status(404).json({
        success: false,

        message:
          "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,

      user:
        buildUserResponse(employee),
    });
  } catch (error) {
    return handleControllerError(
      res,
      error
    );
  }
};

// ======================================================
// UPDATE CURRENT USER PROFILE
// PUT /api/auth/profile
// ======================================================
const updateProfile = async (
  req,
  res
) => {
  try {
    const employee =
      await Employee.findById(
        req.user._id
      );

    if (!employee) {
      return res.status(404).json({
        success: false,

        message:
          "Employee not found.",
      });
    }

    const {
      companyName,
      firstName,
      lastName,
      fullName,
      email,
      address1,
      address2,
      city,
      state,
      postalCode,
      country,
      phoneNumber,
    } = req.body;

    // ==================================================
    // EMAIL
    // ==================================================

    if (email !== undefined) {
      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,

          message:
            "Email cannot be empty.",
        });
      }

      if (
        normalizedEmail !==
        employee.email
      ) {
        const existingEmployee =
          await Employee.findOne({
            email: normalizedEmail,

            _id: {
              $ne: employee._id,
            },
          });

        if (existingEmployee) {
          return res.status(400).json({
            success: false,

            message:
              "An employee with this email already exists.",
          });
        }

        employee.email =
          normalizedEmail;
      }
    }

    // ==================================================
    // PROFILE FIELDS
    // ==================================================

    if (companyName !== undefined) {
      employee.companyName =
        String(companyName).trim();
    }

    if (firstName !== undefined) {
      employee.firstName =
        String(firstName).trim();
    }

    if (lastName !== undefined) {
      employee.lastName =
        String(lastName).trim();
    }

    if (address1 !== undefined) {
      employee.address1 =
        String(address1).trim();
    }

    if (address2 !== undefined) {
      employee.address2 =
        String(address2).trim();
    }

    if (city !== undefined) {
      employee.city =
        String(city).trim();
    }

    if (state !== undefined) {
      employee.state =
        String(state).trim();
    }

    if (postalCode !== undefined) {
      employee.postalCode =
        String(postalCode).trim();
    }

    if (country !== undefined) {
      employee.country =
        String(country).trim();
    }

    if (phoneNumber !== undefined) {
      employee.phoneNumber =
        String(phoneNumber).trim();
    }

    // ==================================================
    // FULL NAME
    // ==================================================

    if (
      fullName !== undefined &&
      String(fullName).trim()
    ) {
      employee.fullName =
        String(fullName).trim();
    } else {
      const generatedFullName = [
        employee.firstName,
        employee.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (generatedFullName) {
        employee.fullName =
          generatedFullName;
      }
    }

    await employee.save();

    return res.status(200).json({
      success: true,

      message:
        "Profile updated successfully.",

      user:
        buildUserResponse(employee),
    });
  } catch (error) {
    return handleControllerError(
      res,
      error
    );
  }
};

// ======================================================
// FORGOT PASSWORD - request a reset link by email
// ======================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Always respond the same way whether or not the email exists, so this
    // endpoint can't be used to discover which emails have accounts.
    const genericResponse = () =>
      res.status(200).json({
        success: true,
        message:
          "If an account exists for that email, a password reset link has been sent.",
      });

    if (!email || typeof email !== "string") {
      return genericResponse();
    }

    const normalizedEmail = email.trim().toLowerCase();

    const employee = await Employee.findOne({
      email: normalizedEmail,
      isActive: true,
    }).select("_id email");

    if (!employee) {
      return genericResponse();
    }

    const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

    // findByIdAndUpdate (not .save()) avoids re-validating the full document
    // against a partially-selected employee record.
    await Employee.findByIdAndUpdate(employee._id, {
      $set: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: expiresAt,
      },
    });

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: employee.email, resetUrl });
    } catch (mailError) {
      console.error("Unable to send password reset email:", mailError);
    }

    return genericResponse();
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ======================================================
// RESET PASSWORD - consume a reset token
// ======================================================
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid reset token is required.",
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const employee = await Employee.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+tokenVersion +passwordResetTokenHash +passwordResetExpires");

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired.",
      });
    }

    employee.password = password;
    employee.passwordResetTokenHash = null;
    employee.passwordResetExpires = null;
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Your password has been reset. You can now log in.",
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ======================================================
// CHANGE PASSWORD - logged-in user changes their own password
// ======================================================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters.",
      });
    }

    const employee = await Employee.findById(req.user._id).select(
      "+password +tokenVersion"
    );

    const passwordMatches = await employee.comparePassword(currentPassword);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    employee.password = newPassword;
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;

    await employee.save();

    // Bumping tokenVersion invalidates other sessions; issue this session a
    // fresh token in the same response so the caller isn't logged out too.
    const token = generateToken(employee._id, employee.tokenVersion);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      token,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ======================================================
// LOGOUT EMPLOYEE
// ======================================================
const logout = async (req, res) => {
  await Employee.findByIdAndUpdate(req.user._id, {
    $inc: { tokenVersion: 1 },
  });

  return res.status(200).json({
    success: true,

    message:
      "Logout successful.",
  });
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
};
