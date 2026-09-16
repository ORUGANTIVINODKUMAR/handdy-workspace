const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Project = require("../models/Project");
const Team = require("../models/Team");
const { escapeRegExp, getPagination } = require("../utils/requestUtils");
const { resolveTeamsProject } = require("../utils/taskProjectResolution");

const normalizeAssignments = (assignedTo) => {
  const values = Array.isArray(assignedTo)
    ? assignedTo
    : assignedTo
    ? [assignedTo]
    : [];
  return [...new Set(values.map(String))];
};

const generateTaskCode = async () => {
  let taskCode;
  do {
    taskCode = `TSK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  } while (await Task.exists({ taskCode }));
  return taskCode;
};

const normalizeTeamIds = (value) => [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean))];

const getTeamsForTask = async (user, requestedTeams) => {
  if (["admin", "manager", "hr"].includes(user.role)) {
    const teamIds = normalizeTeamIds(requestedTeams);
    if (!teamIds.length) return { error: "Select at least one team for this task." };
    const teams = await Team.find({ _id: { $in: teamIds }, isActive: true });
    return teams.length === teamIds.length ? { teams, teamIds } : { error: "One or more selected teams are invalid or inactive." };
  }

  const teams = await Team.find({ teamLead: user._id, isActive: true });
  if (teams.length !== 1) {
    return { error: teams.length === 0 ? "You are not assigned to an active team." : "Your account must lead exactly one active team." };
  }
  const requestedIds = normalizeTeamIds(requestedTeams);
  if (requestedIds.length && (requestedIds.length !== 1 || requestedIds[0] !== String(teams[0]._id))) {
    return { error: "You cannot create tasks for another team." };
  }
  return { teams, teamIds: [String(teams[0]._id)] };
};

const validateTaskRelations = async ({ project, teams, assignedTo, user }) => {
  if (project) {
    const selectedProject = await Project.findOne({ _id: project, status: "Active", deletedAt: null }).select("teams").lean();
    if (!selectedProject) return "Select an active project.";
    const projectTeams = (selectedProject.teams || []).map(String);
    if (projectTeams.length && teams.some((teamId) => !projectTeams.includes(String(teamId)))) {
      return "The selected project is not assigned to every selected team.";
    }
  }

  if (assignedTo.length === 0) return null;

  const employeeFilter = { _id: { $in: assignedTo }, team: { $in: teams }, role: "employee", isActive: true };

  const validEmployees = await Employee.countDocuments(employeeFilter);
  if (validEmployees !== assignedTo.length) {
    return user.role === "team_lead"
      ? "Tasks can only be assigned to active members of your team."
      : "One or more selected employees are invalid or inactive.";
  }

  return null;
};

const getTaskVisibility = async (user) => {
  if (["admin", "manager", "hr"].includes(user.role)) return null;

  if (user.role === "employee") {
    if (!user.team) return { _id: null };
    const activeTeam = await Team.exists({ _id: user.team, isActive: true });
    if (!activeTeam) return { _id: null };
    return {
      $and: [
        { $or: [{ team: user.team }, { teams: user.team }] },
        { $or: [{ assignToAllEmployees: true }, { assignedTo: user._id }] },
      ],
    };
  }
  const teamIds = await Team.find({ teamLead: user._id, isActive: true }).distinct("_id");
  return { $or: [{ team: { $in: teamIds } }, { teams: { $in: teamIds } }] };
};

const applyTeamLeadMutationScope = async (filter, user) => {
  if (user.role !== "team_lead") return filter;
  const teamIds = await Team.find({ teamLead: user._id, isActive: true }).distinct("_id");
  return { ...filter, $or: [{ team: { $in: teamIds } }, { teams: { $in: teamIds } }] };
};

// ======================================================
// CREATE TASK
// ======================================================
const createTask = async (req, res) => {
  try {
    const {
      taskCode,
      taskName,
      description,
      taskType,
      project,
      team,
      teams,
      assignedTo,
      assignToAllEmployees,
      isActive,
      idleLogout,
    } = req.body;

    if (!taskName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task name is required.",
      });
    }

    const normalizedTaskType = taskType || "work";

    if (normalizedTaskType === "work" && !project) {
      return res.status(400).json({ success: false, message: "Select a project for this work task." });
    }

    const resolvedTaskCode = taskCode?.trim().toUpperCase() || await generateTaskCode();
    const existingTask = await Task.findOne({ taskCode: resolvedTaskCode });

    if (existingTask) {
      return res.status(400).json({
        success: false,
        message: "Task code already exists.",
      });
    }

    const teamResolution = await getTeamsForTask(req.user, teams || team);
    if (!teamResolution.teams) {
      return res.status(400).json({ success: false, message: teamResolution.error });
    }

    // A team's project is inferred from its task history. If there's no
    // history yet (brand-new team) or it's ambiguous (teams historically
    // used different projects), the task is simply created without one —
    // it gets attached the next time any task for that team specifies it.
    let resolvedProject = project;
    if (!resolvedProject) {
      const resolution = await resolveTeamsProject(teamResolution.teamIds);
      if (resolution.status === "resolved") {
        resolvedProject = resolution.projectId;
      }
    }

    const normalizedAssignments = normalizeAssignments(assignedTo);
    const relationError = await validateTaskRelations({
      project: resolvedProject,
      teams: teamResolution.teamIds,
      assignedTo: normalizedAssignments,
      user: req.user,
    });

    if (relationError) {
      return res.status(400).json({ success: false, message: relationError });
    }

    const task = await Task.create({
      taskCode: resolvedTaskCode,
      taskName: taskName.trim(),
      description: description?.trim() || "",

      taskType: normalizedTaskType,

      project: resolvedProject || null,
      team: teamResolution.teamIds[0],
      teams: teamResolution.teamIds,

      assignedTo:
        assignToAllEmployees === true
          ? []
          : normalizedAssignments,

      assignToAllEmployees:
        assignToAllEmployees === true,

      isActive:
        isActive !== undefined ? isActive : true,

      idleLogout: Boolean(idleLogout),

      createdBy: req.user._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project", "projectCode projectName serviceType")
      .populate("team", "teamName")
      .populate("teams", "teamName")
      .populate(
        "assignedTo",
        "employeeId fullName email"
      )
      .populate("createdBy", "fullName");

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task: populatedTask,
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// GET ALL TASKS
// ======================================================
const getAllTasks = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const search = req.query.search?.trim() || "";
    const taskType =
      req.query.taskType?.trim() || "";
    const project =
      req.query.project?.trim() || "";
    const team = req.query.team?.trim() || "";
    const assignedTo =
      req.query.assignedTo?.trim() || "";
    const active = req.query.active;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder =
      req.query.sortOrder === "asc" ? 1 : -1;

    const allowedSortFields = [
      "taskCode",
      "taskName",
      "taskType",
      "createdAt",
      "updatedAt",
    ];

    const safeSortBy = allowedSortFields.includes(
      sortBy
    )
      ? sortBy
      : "createdAt";

    const filter = { deletedAt: null };

    const conditions = [];

    if (search) {
      const safeSearch = escapeRegExp(search);
      conditions.push({ $or: [
        {
          taskCode: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          taskName: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ] });
    }

    if (taskType) {
      filter.taskType = taskType;
    }

    if (project) {
      filter.project = project;
    }

    if (team) {
      filter.$or = [{ team }, { teams: team }];
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (active === "true") {
      filter.isActive = true;
    }

    if (active === "false") {
      filter.isActive = false;
    }

    const visibility = await getTaskVisibility(req.user);
    if (visibility) conditions.push(visibility);
    if (conditions.length > 0) filter.$and = conditions;

    const totalTasks =
      await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate(
        "project",
        "projectCode projectName serviceType"
      )
      .populate("team", "teamName")
      .populate("teams", "teamName")
      .populate(
        "assignedTo",
        "employeeId fullName email"
      )
      .populate("createdBy", "fullName")
      .sort({
        [safeSortBy]: sortOrder,
      })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,

      page,
      limit,

      totalPages: Math.max(
        Math.ceil(totalTasks / limit),
        1
      ),

      count: tasks.length,
      totalTasks,

      tasks,
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// GET TASK BY ID
// ======================================================
const getTaskById = async (req, res) => {
  try {
    const visibility = await getTaskVisibility(req.user);
    const idFilter = { _id: req.params.id, deletedAt: null };
    if (visibility) idFilter.$and = [visibility];

    const task = await Task.findOne(idFilter)
      .populate(
        "project",
        "projectCode projectName serviceType"
      )
      .populate("team", "teamName")
      .populate("teams", "teamName")
      .populate(
        "assignedTo",
        "employeeId fullName email"
      )
      .populate("createdBy", "fullName");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// UPDATE TASK
// ======================================================
const updateTask = async (req, res) => {
  try {
    const mutationFilter = await applyTeamLeadMutationScope(
      { _id: req.params.id, deletedAt: null },
      req.user
    );
    const task = await Task.findOne(mutationFilter);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const {
      taskCode,
      taskName,
      description,
      taskType,
      project,
      team,
      teams,
      assignedTo,
      assignToAllEmployees,
      isActive,
      idleLogout,
    } = req.body;

    if (
      taskCode !== undefined &&
      taskCode.trim().toUpperCase() !==
        task.taskCode
    ) {
      const duplicateTask =
        await Task.findOne({
          taskCode: taskCode
            .trim()
            .toUpperCase(),

          _id: {
            $ne: task._id,
          },
        });

      if (duplicateTask) {
        return res.status(400).json({
          success: false,
          message:
            "Task code already exists.",
        });
      }

      task.taskCode =
        taskCode.trim().toUpperCase();
    }

    if (taskName !== undefined) {
      task.taskName = taskName.trim();
    }

    if (description !== undefined) {
      task.description =
        description.trim();
    }

    if (taskType !== undefined) {
      task.taskType = taskType;
    }

    if (project !== undefined) {
      task.project = project || null;
    }

    const teamResolution = await getTeamsForTask(
      req.user,
      teams !== undefined ? teams : team !== undefined ? team : (task.teams?.length ? task.teams : task.team)
    );
    if (!teamResolution.teams) {
      return res.status(400).json({ success: false, message: teamResolution.error });
    }
    task.team = teamResolution.teamIds[0];
    task.teams = teamResolution.teamIds;

    if (
      assignToAllEmployees !== undefined
    ) {
      task.assignToAllEmployees =
        Boolean(assignToAllEmployees);

      if (task.assignToAllEmployees) {
        task.assignedTo = [];
      }
    }

    if (
      assignedTo !== undefined &&
      !task.assignToAllEmployees
    ) {
      task.assignedTo = Array.isArray(
        assignedTo
      )
        ? assignedTo
        : assignedTo
        ? [assignedTo]
        : [];
    }

    if (isActive !== undefined) {
      task.isActive = Boolean(isActive);
    }

    if (idleLogout !== undefined) {
      task.idleLogout = Boolean(idleLogout);
    }

    if (task.taskType === "work" && !task.project) {
      return res.status(400).json({ success: false, message: "Select a project for this work task." });
    }

    const normalizedAssignments = normalizeAssignments(task.assignedTo);
    const relationError = await validateTaskRelations({
      project: task.project,
      teams: task.teams?.length ? task.teams : [task.team],
      assignedTo: normalizedAssignments,
      user: req.user,
    });
    if (relationError) {
      return res.status(400).json({ success: false, message: relationError });
    }

    await task.save();

    const updatedTask =
      await Task.findById(task._id)
        .populate(
          "project",
          "projectCode projectName serviceType"
        )
        .populate("team", "teamName")
        .populate("teams", "teamName")
        .populate(
          "assignedTo",
          "employeeId fullName email"
        )
        .populate(
          "createdBy",
          "fullName"
        );

    return res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// DELETE TASK
// ======================================================
const deleteTask = async (req, res) => {
  try {
    const mutationFilter = await applyTeamLeadMutationScope(
      { _id: req.params.id, deletedAt: null },
      req.user
    );
    const task = await Task.findOne(mutationFilter);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    task.isActive = false;
    task.deletedAt = new Date();
    await task.save();

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// TOGGLE ACTIVE / INACTIVE
// ======================================================
const toggleTaskStatus = async (req, res) => {
  try {
    const mutationFilter = await applyTeamLeadMutationScope(
      { _id: req.params.id, deletedAt: null },
      req.user
    );
    const task = await Task.findOne(mutationFilter);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    task.isActive = !task.isActive;

    await task.save();

    return res.status(200).json({
      success: true,

      message: task.isActive
        ? "Task activated successfully."
        : "Task deactivated successfully.",

      task,
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// RESOLVE PROJECT FOR TEAM(S)
// ======================================================
const resolveProjectForTeams = async (req, res) => {
  try {
    const teamsParam = req.query.teams ? req.query.teams.split(",") : [];
    const teamResolution = await getTeamsForTask(req.user, teamsParam);
    if (!teamResolution.teams) {
      return res.status(400).json({ success: false, message: teamResolution.error });
    }

    const resolution = await resolveTeamsProject(teamResolution.teamIds);

    let project = null;
    if (resolution.status === "resolved") {
      project = await Project.findById(resolution.projectId).select("projectCode projectName serviceType");
    }

    return res.status(200).json({
      success: true,
      status: resolution.status,
      projectId: resolution.projectId,
      project,
      conflictingProjects: resolution.conflictingProjects || [],
    });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

// ======================================================
// ERROR HANDLER
// ======================================================
const handleTaskError = (res, error) => {
  console.error(
    "Task Controller Error:",
    error
  );

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Task code already exists.",
    });
  }

  if (error.name === "ValidationError") {
    const message = Object.values(
      error.errors
    )
      .map((item) => item.message)
      .join(" ");

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID provided.",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      error.message ||
      "Something went wrong.",
  });
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  resolveProjectForTeams,
};
