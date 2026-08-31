const Schedule = require("../models/Schedule");
const Team = require("../models/Team");
const Employee = require("../models/Employee");
const Shift = require("../models/Shift");
const { getPagination } = require("../utils/requestUtils");

const validateScheduleRelations = async ({ team, employee, shift }) => {
  const [validTeam, validEmployee, validShift] = await Promise.all([
    Team.exists({ _id: team, isActive: true }),
    Employee.exists({ _id: employee, isActive: true }),
    Shift.exists({ _id: shift, status: "Active" }),
  ]);
  if (!validTeam) return "Selected team is invalid or inactive.";
  if (!validEmployee) return "Selected employee is invalid or inactive.";
  if (!validShift) return "Selected shift is invalid or inactive.";
  return null;
};

// ======================================
// CREATE SCHEDULE
// ======================================
const createSchedule = async (req, res) => {
  try {
    const relationError = await validateScheduleRelations(req.body);
    if (relationError) {
      return res.status(400).json({ success: false, message: relationError });
    }

    const schedule = await Schedule.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const populatedSchedule = await Schedule.findById(
      schedule._id
    )
      .populate("team")
      .populate("employee", "employeeId fullName")
      .populate("shift")
      .populate("createdBy", "fullName");

    return res.status(201).json({
      success: true,
      message: "Schedule created successfully.",
      schedule: populatedSchedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GET ALL SCHEDULES
// ======================================
const getAllSchedules = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const team = req.query.team || "";
    const employee = req.query.employee || "";
    const shift = req.query.shift || "";
    const status = req.query.status || "";
    const date = req.query.date || "";

    const filter = {};

    if (team) {
      filter.team = team;
    }

    if (employee) {
      filter.employee = employee;
    }

    if (shift) {
      filter.shift = shift;
    }

    if (status) {
      filter.status = status;
    }

    if (date) {
      const startDate = new Date(date);

      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      filter.date = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const totalSchedules =
      await Schedule.countDocuments(filter);

    const schedules = await Schedule.find(filter)
      .populate("team")
      .populate("employee", "employeeId fullName")
      .populate("shift")
      .populate("createdBy", "fullName")
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      count: schedules.length,
      totalSchedules,
      totalPages: Math.ceil(
        totalSchedules / limit
      ),
      schedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// GET SCHEDULE BY ID
// ======================================
const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(
      req.params.id
    )
      .populate("team")
      .populate("employee", "employeeId fullName")
      .populate("shift")
      .populate("createdBy", "fullName");

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    return res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// UPDATE SCHEDULE
// ======================================
const updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(
      req.params.id
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    const relationError = await validateScheduleRelations({
      team: req.body.team ?? schedule.team,
      employee: req.body.employee ?? schedule.employee,
      shift: req.body.shift ?? schedule.shift,
    });
    if (relationError) {
      return res.status(400).json({ success: false, message: relationError });
    }

    const updatedSchedule =
      await Schedule.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("team")
        .populate(
          "employee",
          "employeeId fullName"
        )
        .populate("shift")
        .populate("createdBy", "fullName");

    return res.status(200).json({
      success: true,
      message: "Schedule updated successfully.",
      schedule: updatedSchedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// DELETE SCHEDULE
// ======================================
const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(
      req.params.id
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    schedule.status = "Inactive";
    await schedule.save();

    return res.status(200).json({
      success: true,
      message: "Schedule deactivated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
