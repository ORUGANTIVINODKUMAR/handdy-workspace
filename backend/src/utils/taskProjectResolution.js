const Task = require("../models/Task");

// Team has no stored `project` field. A team's project is inferred from
// that team's existing task history instead, so brand-new teams or teams
// whose tasks span multiple projects fall back to an explicit manual pick.
const resolveTeamsProject = async (teamIds) => {
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
