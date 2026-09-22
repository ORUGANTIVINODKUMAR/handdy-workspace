const Employee = require("../models/Employee");
const Team = require("../models/Team");
const { isAdminRole } = require("../utils/roles");

const clearTeamsLedBy = async (employeeId, exceptTeamId = null) => {
  const filter = { teamLead: employeeId };
  if (exceptTeamId) filter._id = { $ne: exceptTeamId };
  const teams = await Team.find(filter).select("_id");
  const teamIds = teams.map((team) => team._id);
  if (teamIds.length > 0) {
    await Team.updateMany({ _id: { $in: teamIds } }, { $set: { teamLead: null } });
    await Employee.updateMany({ team: { $in: teamIds } }, { $set: { teamLead: null } });
  }
};

const syncEmployeeTeam = async (employee, requestedTeamId) => {
  const teamId = requestedTeamId || null;

  if (isAdminRole(employee.role) || !teamId) {
    await clearTeamsLedBy(employee._id);
    employee.team = null;
    employee.teamLead = null;
    await employee.save();
    return employee;
  }

  const team = await Team.findOne({ _id: teamId, isActive: true });
  if (!team) {
    const error = new Error("Selected team is invalid or inactive.");
    error.statusCode = 400;
    throw error;
  }

  if (employee.role === "team_lead") {
    const previousLeadId = team.teamLead || null;
    await clearTeamsLedBy(employee._id, team._id);
    if (team.teamLead && !team.teamLead.equals(employee._id)) {
      await Employee.findByIdAndUpdate(team.teamLead, { $set: { team: null } });
    }
    employee.team = team._id;
    employee.teamLead = null;
    await employee.save();
    team.teamLead = employee._id;
    await team.save();
    const memberScope = previousLeadId
      ? { role: "employee", $or: [{ team: team._id }, { teamLead: previousLeadId }] }
      : { role: "employee", team: team._id };
    await Employee.updateMany(
      memberScope,
      { $set: { team: team._id, teamLead: employee._id } },
    );
    return employee;
  }

  await clearTeamsLedBy(employee._id);
  const refreshedTeam = await Team.findById(team._id);
  employee.team = team._id;
  employee.teamLead = refreshedTeam?.teamLead || null;
  await employee.save();
  return employee;
};

module.exports = { syncEmployeeTeam, clearTeamsLedBy };
