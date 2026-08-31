/*
 * Imports the supplied Users_Report.xlsx into the development database.
 * Usage: node scripts/importUsersReport.js <path-to-xlsx>
 *
 * Only these columns are used: Name, EmployeeID, Email, Role, Team, TeamLeader.
 * Department and Designation are intentionally ignored.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const XLSX = require(path.resolve(__dirname, "../../dashboard/node_modules/xlsx"));
const connectDatabase = require("../src/config/db");
const Employee = require("../src/models/Employee");
const Team = require("../src/models/Team");

const DEFAULT_PASSWORD = process.env.IMPORT_USER_PASSWORD || "Welcome@123";
const inputFile = process.argv[2];

const normalizeRole = (role) => String(role || "").toLowerCase().replace(/\s|_/g, "") === "teamleader"
  ? "team_lead"
  : "employee";

const findEmployee = (row) => Employee.findOne({
  $or: [
    { email: String(row.Email || "").trim().toLowerCase() },
    { employeeId: String(row.EmployeeID || "").trim().toUpperCase() },
  ],
});

const run = async () => {
  if (!inputFile) throw new Error("Provide the path to Users_Report.xlsx.");

  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const validRows = rows.filter((row) => row.Name && row.EmployeeID && row.Email && row.Team);
  if (!validRows.length) throw new Error("No valid user rows were found in the workbook.");

  await connectDatabase();

  let admin = await Employee.findOne({ role: "admin", isActive: true }).select("+password");
  if (!admin) {
    admin = await Employee.create({
      employeeId: "IMPORT-ADMIN",
      fullName: "Test Administrator",
      email: "admin@test.local",
      password: DEFAULT_PASSWORD,
      role: "admin",
      isActive: true,
    });
  }

  const teamMap = new Map();
  for (const teamName of [...new Set(validRows.map((row) => String(row.Team).trim()))]) {
    let team = await Team.findOne({ teamName });
    if (!team) {
      team = await Team.create({ teamName, createdBy: admin._id, isActive: true });
    } else if (!team.isActive) {
      team.isActive = true;
      await team.save();
    }
    teamMap.set(teamName, team);
  }

  const peopleByName = new Map();
  let created = 0;
  let updated = 0;

  for (const row of validRows) {
    const existing = await findEmployee(row).select("+password");
    const person = existing || new Employee({ password: DEFAULT_PASSWORD });
    person.employeeId = String(row.EmployeeID).trim().toUpperCase();
    person.fullName = String(row.Name).trim();
    person.email = String(row.Email).trim().toLowerCase();
    person.role = normalizeRole(row.Role);
    person.team = teamMap.get(String(row.Team).trim())._id;
    person.isActive = true;
    // Deliberately do not copy Department or Designation from the spreadsheet.
    if (!existing) created += 1;
    else updated += 1;
    await person.save();
    peopleByName.set(person.fullName.toLowerCase(), person);
  }

  for (const row of validRows.filter((item) => normalizeRole(item.Role) === "team_lead")) {
    const lead = peopleByName.get(String(row.Name).trim().toLowerCase());
    const team = teamMap.get(String(row.Team).trim());
    team.teamLead = lead._id;
    await team.save();
  }

  for (const row of validRows.filter((item) => normalizeRole(item.Role) === "employee")) {
    const person = peopleByName.get(String(row.Name).trim().toLowerCase());
    const leadName = String(row.TeamLeader || "").trim().toLowerCase();
    const lead = peopleByName.get(leadName);
    person.teamLead = lead?._id || null;
    await person.save();
  }

  console.log(JSON.stringify({
    imported: validRows.length,
    created,
    updated,
    teams: teamMap.size,
    defaultPassword: DEFAULT_PASSWORD,
    ignoredColumns: ["Department", "Designation"],
  }, null, 2));
};

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
