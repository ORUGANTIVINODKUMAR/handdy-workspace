const TaskTimeLog = require("../models/TaskTimeLog");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Team = require("../models/Team");
const { getPagination } = require("../utils/requestUtils");
const { getBillingDateRange } = require("../utils/billingUtils");
const sendErrorResponse = require("../utils/sendErrorResponse");
const { isAdminRole } = require("../utils/roles");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

// Builds a `startedAt` range filter from optional startDate/endDate query
// params (YYYY-MM-DD), using APP_TIMEZONE day boundaries — the same helper
// scheduleController.js uses — instead of the server's local time, so a
// report filter means the same calendar day everywhere it's deployed.
const buildStartedAtRangeFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  const range = getBillingDateRange(startDate || endDate, endDate || startDate, APP_TIMEZONE);
  const filter = {};
  if (startDate) filter.$gte = range.start;
  if (endDate) filter.$lt = range.endExclusive;
  return filter;
};

// Start Timer
const startTimer = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const { project, task, note } = req.body;

        if (!project || !task) {
            return res.status(400).json({
                success: false,
                message: "Project and task are required.",
            });
        }

        const projectExists = await Project.findById(project);

        if (!projectExists || projectExists.status !== "Active" || projectExists.deletedAt) {
            return res.status(404).json({
                success: false,
                message: "Project not found.",
            });
        }

        const hasActiveTeam = req.user.team
            ? Boolean(await Team.exists({ _id: req.user.team, isActive: true }))
            : false;
        const teamMatch = { $or: [{ team: req.user.team }, { teams: req.user.team }] };
        const isElevatedRole = isAdminRole(req.user.role) || ["manager", "hr"].includes(req.user.role);
        // A team lead's own team already proves they lead the task's team, so
        // they don't also need to appear in assignedTo (they never can — see
        // validateTaskRelations, which restricts assignedTo to role:"employee").
        const isTeamLead = req.user.role === "team_lead";
        // Being individually named in a task's assignedTo must be sufficient
        // on its own — it must not require the requester to currently have
        // an active team, and must not be gated behind the team-match check
        // the way assignToAllEmployees (which opens a task to a whole team)
        // legitimately is. Elevated roles (admin/manager/hr), who normally
        // carry no team at all, follow the same no-restriction convention
        // used by getTaskVisibility in taskController.js.
        const assignmentScope = isElevatedRole
            ? {}
            : isTeamLead
                ? (hasActiveTeam ? teamMatch : { _id: null })
                : {
                    $or: [
                        { assignedTo: employeeId },
                        ...(hasActiveTeam ? [{ $and: [teamMatch, { assignToAllEmployees: true }] }] : []),
                    ],
                };

        const taskExists = await Task.findOne({
            _id: task,
            project,
            isActive: true,
            deletedAt: null,
            ...assignmentScope,
        });

        if (!taskExists) {
            return res.status(404).json({
                success: false,
                message: "Task not found, not assigned to you, or does not belong to the selected project.",
            });
        }

        const activeTimer = await TaskTimeLog.findOne({
            employee: employeeId,
            status: { $in: ["running", "paused"] },
        });

        if (activeTimer) {
            return res.status(400).json({
                success: false,
                message: "You already have an active timer.",
            });
        }

        const timeLog = await TaskTimeLog.create({
            employee: employeeId,
            project,
            task,
            note: typeof note === "string" ? note.trim().slice(0, 2000) : undefined,
            startedAt: new Date(),
            status: "running",
            isActiveTimer: true,
        });

        await timeLog.populate("project", "projectCode projectName serviceType");
        await timeLog.populate("task", "taskCode taskName idleLogout");

        return res.status(201).json({
            success: true,
            message: "Timer started successfully.",
            timeLog,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You already have an active timer.",
            });
        }
        return sendErrorResponse(res, error, "Unable to start timer.");
    }
};
// Pause Timer
const pauseTimer = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const requestedReason = req.body?.reason;
        const reason = requestedReason === "idle" ? "idle" : requestedReason === "break" ? "break" : "manual";

        const runningTimer = await TaskTimeLog.findOne({ employee: employeeId, status: "running" }).select("task project");

        if (reason === "idle") {
            const taskAllowsIdleLogout = runningTimer
                ? Boolean(await Task.exists({ _id: runningTimer.task, idleLogout: true }))
                : false;
            if (req.user.idleTrackingExempt || !taskAllowsIdleLogout) {
                return res.status(200).json({
                    success: true,
                    skipped: true,
                    message: "Idle tracking is disabled for this employee or task.",
                });
            }
        }

        // Deliberately no re-check here that runningTimer's project is still
        // assigned to the user's team. That check used to 403 pause when a
        // team/project reassignment happened mid-session, but resume/stop
        // have no equivalent check — so a user who hit the 403 on pause
        // could never end their own already-running timer. Eligibility is
        // enforced once, up front, in startTimer's assignmentScope; a later
        // reassignment shouldn't be able to trap a timer the user legitimately
        // started. (This only affects control of an already-running timer —
        // it does not loosen who can *start* a new one.)

        const activeTimer = await TaskTimeLog.findOneAndUpdate(
            {
                employee: employeeId,
                status: "running",
            },
            {
                $push: {
                    pauses: {
                        pausedAt: new Date(),
                        resumedAt: null,
                        reason,
                    },
                },
                $set: { status: "paused" },
            },
            { returnDocument: "after" }
        );

        if (!activeTimer) {
            return res.status(404).json({
                success: false,
                message: "No running timer found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: reason === "idle"
                ? "Timer paused because the system is idle."
                : "Timer paused successfully.",
            timeLog: activeTimer,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to pause timer.");
    }
};
// Resume Timer
const resumeTimer = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const requestedReason = req.body?.reason;
        const reason = requestedReason === "idle" ? "idle" : requestedReason === "break" ? "break" : "manual";
        const filter = {
            employee: employeeId,
            status: "paused",
            pauses: {
                $elemMatch: {
                    resumedAt: null,
                    ...(reason === "idle" ? { reason: "idle" } : reason === "break" ? { reason: { $in: ["break", "manual"] } } : {}),
                },
            },
        };
        const pauseFilter = {
            "elem.resumedAt": null,
            ...(reason === "idle" ? { "elem.reason": "idle" } : reason === "break" ? { "elem.reason": { $in: ["break", "manual"] } } : {}),
        };

        const pausedTimer = await TaskTimeLog.findOneAndUpdate(
            filter,
            {
                $set: {
                    "pauses.$[elem].resumedAt": new Date(),
                    status: "running",
                },
            },
            {
                arrayFilters: [pauseFilter],
                returnDocument: "after",
            }
        );

        if (!pausedTimer) {
            return res.status(404).json({
                success: false,
                message: "No paused timer found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: reason === "idle"
                ? "Activity detected. Timer resumed automatically."
                : "Timer resumed successfully.",
            timeLog: pausedTimer,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to resume timer.");
    }
};
// Stop Timer
const stopTimer = async (req, res) => {
    try {
        const employeeId = req.user._id;

        const activeTimer = await TaskTimeLog.findOne({
            employee: employeeId,
            status: { $in: ["running", "paused"] },
        });

        if (!activeTimer) {
            return res.status(404).json({
                success: false,
                message: "No active timer found.",
            });
        }

        const stoppedAt = new Date();
        let totalPausedSeconds = 0;
        let totalIdleSeconds = 0;

        for (const pause of activeTimer.pauses) {
            const pauseEnd = pause.resumedAt || stoppedAt;

            const pauseSeconds = Math.floor(
                (pauseEnd.getTime() - pause.pausedAt.getTime()) / 1000
            );
            totalPausedSeconds += pauseSeconds;

            if (pause.reason === "idle") {
                totalIdleSeconds += pauseSeconds;
            }

            if (!pause.resumedAt) {
                pause.resumedAt = stoppedAt;
            }
        }

        const totalElapsedSeconds = Math.floor(
            (stoppedAt.getTime() - activeTimer.startedAt.getTime()) / 1000
        );

        const totalWorkedSeconds = Math.max(
            totalElapsedSeconds - totalPausedSeconds,
            0
        );

        activeTimer.stoppedAt = stoppedAt;
        activeTimer.totalPausedSeconds = totalPausedSeconds;
        activeTimer.totalIdleSeconds = totalIdleSeconds;
        activeTimer.totalWorkedSeconds = totalWorkedSeconds;
        activeTimer.status = "stopped";
        activeTimer.isActiveTimer = false;
        if (req.body?.logoutReason === "inactivity") {
            activeTimer.logoutReason = "inactivity";
            activeTimer.autoLogoutAt = stoppedAt;
        } else if (req.body?.logoutReason === "manual") {
            activeTimer.logoutReason = "manual";
        }

        await activeTimer.save();

        return res.status(200).json({
            success: true,
            message: "Timer stopped successfully.",
            timeLog: activeTimer,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to stop timer.");
    }
};
// Get logged-in user's personal time-log history
const getMyTimeLogs = async (req, res) => {
    try {
        const employeeId = req.user._id;

        const { page, limit, skip } = getPagination(req.query);

        const {
            startDate,
            endDate,
            project,
            task,
            status,
        } = req.query;

        const filter = {
            employee: employeeId,
        };

        // Date range filter
        const startedAtFilter = buildStartedAtRangeFilter(startDate, endDate);
        if (startedAtFilter) {
            filter.startedAt = startedAtFilter;
        }

        // Project filter
        if (project) {
            filter.project = project;
        }

        // Task filter
        if (task) {
            filter.task = task;
        }

        // Timer status filter
        if (status) {
            filter.status = status;
        }

        const totalRecords = await TaskTimeLog.countDocuments(filter);

        const timeLogs = await TaskTimeLog.find(filter)
            .populate("project", "projectCode projectName serviceType")
            .populate("task", "taskCode taskName")
            .sort("-startedAt")
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            page,
            limit,
            totalPages: Math.ceil(totalRecords / limit),
            count: timeLogs.length,
            totalRecords,
            timeLogs,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to fetch time logs.");
    }
};
// Get Active Timer
const getActiveTimer = async (req, res) => {
    try {
        const employeeId = req.user._id;

        const activeTimer = await TaskTimeLog.findOne({
            employee: employeeId,
            status: { $in: ["running", "paused"] },
        })
            .populate("project", "projectCode projectName serviceType")
            .populate("task", "taskCode taskName idleLogout");

        return res.status(200).json({
            success: true,
            timeLog: activeTimer || null,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to fetch active timer.");
    }
};

// Active company/team timers used by the live web task trackers.
const getLiveTimers = async (req, res) => {
    try {
        const filter = { status: { $in: ["running", "paused"] }, isActiveTimer: true };
        if (req.user.role === "team_lead") {
            const teamIds = await Team.find({ teamLead: req.user._id, isActive: true }).distinct("_id");
            const employeeIds = await Employee.find({ team: { $in: teamIds }, isActive: true }).distinct("_id");
            filter.employee = { $in: employeeIds };
        }

        const timeLogs = await TaskTimeLog.find(filter)
            .populate({
                path: "employee",
                select: "employeeId fullName email team",
                populate: { path: "team", select: "teamName" },
            })
            .populate("project", "projectCode projectName clientName")
            .populate("task", "taskCode taskName taskType")
            .sort("-startedAt")
            .lean();

        return res.status(200).json({ success: true, count: timeLogs.length, timeLogs });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to fetch live timers.");
    }
};
// Get time logs for employees assigned to the logged-in Team Lead
const getMyTeamTimeLogs = async (req, res) => {
    try {
        const teamLeadId = req.user._id;

        const { page, limit, skip } = getPagination(req.query);

        const teamMembers = await Employee.find({
            teamLead: teamLeadId,
            isActive: true,
        }).select("_id");

        const teamMemberIds = teamMembers.map((employee) => employee._id);

        const { startDate, endDate, employee, project, task, status } = req.query;
        const filter = { employee: { $in: teamMemberIds } };

        if (employee) {
            if (!teamMemberIds.some((id) => id.toString() === employee)) {
                return res.status(403).json({ success: false, message: "You cannot view time logs for this employee." });
            }
            filter.employee = employee;
        }
        const startedAtFilter = buildStartedAtRangeFilter(startDate, endDate);
        if (startedAtFilter) {
            filter.startedAt = startedAtFilter;
        }
        if (project) filter.project = project;
        if (task) filter.task = task;
        if (status) filter.status = status;

        const totalRecords = await TaskTimeLog.countDocuments(filter);
        const timeLogs = await TaskTimeLog.find(filter)
            .populate(
                "employee",
                "employeeId fullName email department designation"
            )
            .populate("project", "projectCode projectName serviceType")
            .populate("task", "taskCode taskName")
            .sort("-startedAt")
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            page,
            limit,
            totalPages: Math.ceil(totalRecords / limit),
            count: timeLogs.length,
            totalRecords,
            timeLogs,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to fetch team time logs.");
    }
};

// Admin - company-wide time logs with report filters
const getAllTimeLogs = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { startDate, endDate, employee, project, task, status } = req.query;
        const filter = {};

        const startedAtFilter = buildStartedAtRangeFilter(startDate, endDate);
        if (startedAtFilter) {
            filter.startedAt = startedAtFilter;
        }

        if (employee) filter.employee = employee;
        if (project) filter.project = project;
        if (task) filter.task = task;
        if (status) filter.status = status;

        const totalRecords = await TaskTimeLog.countDocuments(filter);
        const timeLogs = await TaskTimeLog.find(filter)
            .populate("employee", "employeeId fullName email department designation")
            .populate("project", "projectCode projectName serviceType")
            .populate("task", "taskCode taskName")
            .sort("-startedAt")
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            page,
            limit,
            totalPages: Math.ceil(totalRecords / limit),
            count: timeLogs.length,
            totalRecords,
            timeLogs,
        });
    } catch (error) {
        return sendErrorResponse(res, error, "Unable to fetch time logs.");
    }
};
module.exports = {
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getMyTeamTimeLogs,
    getActiveTimer,
    getLiveTimers,
    getMyTimeLogs,
    getAllTimeLogs,
};
