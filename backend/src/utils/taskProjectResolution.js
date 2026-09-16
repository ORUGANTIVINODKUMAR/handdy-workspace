const Task = require("../models/Task");
const Project = require("../models/Project");

// Prefer the explicit project-to-team relationship. Older data can still be
// resolved from task history until an administrator assigns its projects.
const resolveTeamsProject = async (teamIds) => {
  const assignedProjects = await Project.find({
    teams: { $all: teamIds },
    status: "Active",
    deletedAt: null,
  }).select("_id").lean();

  if (assignedProjects.length === 1) {
    return { status: "resolved", projectId: String(assignedProjects[0]._id) };
  }
  if (assignedProjects.length > 1) {
    return {
      status: "conflict",
      projectId: null,
      conflictingProjects: assignedProjects.map((project) => String(project._id)),
    };
  }

  // Fall back to task history for projects created before team assignment was
  // introduced, so existing task workflows continue to resolve as before.
  const tasks = await Task.find({
    $or: [{ team: { $in: teamIds } }, { teams: { $in: teamIds } }],
  }).select("project").lean();

  const distinctProjects = [
    ...new Set(tasks.map((task) => task.project && String(task.project)).filter(Boolean)),
  ];

  if (distinctProjects.length === 0) return { status: "unresolved", projectId: null };
  if (distinctProjects.length === 1) return { status: "resolved", projectId: distinctProjects[0] };
  return { status: "conflict", projectId: null, conflictingProjects: distinctProjects };
};

module.exports = { resolveTeamsProject };
