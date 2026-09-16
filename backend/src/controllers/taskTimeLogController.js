const TaskTimeLog = require("../models/TaskTimeLog");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Team = require("../models/Team");
const { getPagination } = require("../utils/requestUtils");

// Start Timer
const startTimer = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const { project, task } = req.body;

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
        // A team lead's own team already proves they lead the task's team, so
        // they don't also need to appear in assignedTo (they never can — see
        // validateTaskRelations, which restricts assignedTo to role:"employee").
        const isTeamLead = req.user.role === "team_lead";
        const assignmentScope = !hasActiveTeam
            ? { _id: null }
            : isTeamLead
                ? teamMatch
                : {
                    $and: [
                        teamMatch,
                        {
                            $or: [
                                { assignToAllEmployees: true },
                                { assignedTo: employeeId },
                            ],
                        },
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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
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

        if (runningTimer) {
            const projectExists = await Project.findById(runningTimer.project).select("teams");
            const projectTeams = (projectExists?.teams || []).map(String);
            const isLegacyUnrestrictedProject = projectTeams.length === 0;
            const projectAssignedToUserTeam = req.user.team && projectTeams.includes(String(req.user.team));
            if (!isLegacyUnrestrictedProject && !projectAssignedToUserTeam) {
                return res.status(403).json({
                    success: false,
                    message: "This project is not assigned to your team.",
                });
            }
        }

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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
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
        if (startDate || endDate) {
            filter.startedAt = {};

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                filter.startedAt.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.startedAt.$lte = end;
            }
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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
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
        return res.status(500).json({ success: false, message: error.message });
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
        if (startDate || endDate) {
            filter.startedAt = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                filter.startedAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.startedAt.$lte = end;
            }
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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Admin - company-wide time logs with report filters
const getAllTimeLogs = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { startDate, endDate, employee, project, task, status } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.startedAt = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                filter.startedAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.startedAt.$lte = end;
            }
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
        return res.status(error.name === "CastError" ? 400 : 500).json({
            success: false,
            message: error.name === "CastError" ? "A report filter is invalid." : error.message,
        });
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
