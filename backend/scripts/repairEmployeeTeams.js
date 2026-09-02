require("dotenv").config();

const mongoose = require("mongoose");
const Employee = require("../src/models/Employee");
const Team = require("../src/models/Team");

const applyChanges = process.argv.includes("--apply");
const id = (value) => String(value?._id || value || "");

const main = async () => {
  const mongoUri = String(process.env.MONGODB_URI || "").trim();
  if (!mongoUri) throw new Error("MONGODB_URI is required.");

  await mongoose.connect(mongoUri);
  const [teams, employees] = await Promise.all([
    Team.find({ isActive: true }).select("teamName teamLead").lean(),
    Employee.find({}).select("employeeId fullName role team teamLead").lean(),
  ]);

  const teamById = new Map(teams.map((team) => [id(team), team]));
  const teamsByLead = new Map();
  for (const team of teams) {
    const leadId = id(team.teamLead);
    if (!leadId) continue;
    teamsByLead.set(leadId, [...(teamsByLead.get(leadId) || []), team]);
  }

  const repairs = [];
  const unresolved = [];

  for (const employee of employees) {
    if (employee.role === "admin") continue;

    let expectedTeam = null;
    let expectedLead = null;

    if (employee.role === "team_lead") {
      const ledTeams = teamsByLead.get(id(employee)) || [];
      if (ledTeams.length > 1) {
        unresolved.push(`${employee.employeeId}: leads more than one active team`);
        continue;
      }
      expectedTeam = ledTeams[0] || null;
    } else if (employee.team && teamById.has(id(employee.team))) {
      expectedTeam = teamById.get(id(employee.team));
      expectedLead = expectedTeam.teamLead || null;
    } else if (employee.teamLead) {
      const matchingTeams = teamsByLead.get(id(employee.teamLead)) || [];
      if (matchingTeams.length === 1) {
        expectedTeam = matchingTeams[0];
        expectedLead = expectedTeam.teamLead || null;
      } else {
        unresolved.push(`${employee.employeeId}: team is missing and team lead does not identify exactly one active team`);
        continue;
      }
    } else {
      continue;
    }

    const expectedTeamId = id(expectedTeam);
    const expectedLeadId = id(expectedLead);
    if (id(employee.team) === expectedTeamId && id(employee.teamLead) === expectedLeadId) continue;

    repairs.push({
      employee,
      expectedTeamId: expectedTeam?._id || null,
      expectedLeadId: expectedLead || null,
      teamName: expectedTeam?.teamName || "Unassigned",
    });
  }

  for (const repair of repairs) {
    console.log(`${repair.employee.employeeId} (${repair.employee.fullName}) -> ${repair.teamName}`);
    if (applyChanges) {
      await Employee.updateOne(
        { _id: repair.employee._id },
        { $set: { team: repair.expectedTeamId, teamLead: repair.expectedLeadId } }
      );
    }
  }

  for (const message of unresolved) console.warn(`REVIEW: ${message}`);
  console.log(`${applyChanges ? "Applied" : "Found"} ${repairs.length} safe repair(s); ${unresolved.length} record(s) require manual review.`);
  if (!applyChanges && repairs.length) console.log("Run npm run repair:teams to apply the listed safe repairs.");
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
