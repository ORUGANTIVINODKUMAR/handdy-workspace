const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { buildProjectRateCopyPlan, applyProjectRateCopy } = require("../src/utils/projectRateRepair");

require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const option = (name) => args[args.indexOf(name) + 1];
  for (const name of ["--source", "--target"]) {
    if (!args.includes(name) || !/^[a-f\d]{24}$/i.test(option(name) || "")) {
      throw new Error("Usage: node scripts/copyRecreatedProjectRates.js --source PROJECT_ID --target PROJECT_ID [--employees ID,ID] [--apply]");
    }
  }
  const employeeIds = args.includes("--employees") ? String(option("--employees") || "").split(",") : null;
  if (employeeIds && employeeIds.some((value) => !/^[\w-]+$/.test(value))) throw new Error("Supply valid employee IDs.");
  if (apply && !employeeIds) throw new Error("Applying requires an explicit reviewed list of --employees IDs.");
  if (args.length !== 4 + (apply ? 1 : 0) + (employeeIds ? 2 : 0) || new Set(args).size !== args.length) {
    throw new Error("Unexpected or repeated arguments.");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const sourceId = new mongoose.Types.ObjectId(option("--source"));
  const targetId = new mongoose.Types.ObjectId(option("--target"));
  const [sourceProject, targetProject, workedEmployeeIds] = await Promise.all([
    db.collection("projects").findOne({ _id: sourceId }),
    db.collection("projects").findOne({ _id: targetId }),
    db.collection("task_time_logs").distinct("employee", { project: targetId }),
  ]);
  const employees = await db.collection("employees").find(
    { _id: { $in: workedEmployeeIds }, ...(employeeIds ? { employeeId: { $in: employeeIds } } : {}) },
    { projection: { employeeId: 1, fullName: 1, projectRates: 1, updatedAt: 1 } },
  ).toArray();
  const { repairs, skipped } = buildProjectRateCopyPlan({ sourceProject, targetProject, employees, workedEmployeeIds });
  console.log(`${apply ? "APPLY" : "PREVIEW"}: ${sourceProject.projectName} (${sourceId}) -> ${targetProject.projectName} (${targetId})`);
  for (const { employee, chargeRate } of repairs) console.log(`${employee.employeeId} ${employee.fullName}: copy existing hourly rate ${chargeRate}`);
  for (const entry of skipped) console.log(`SKIP ${entry.employeeId} ${entry.fullName}: ${entry.reason}`);
  const missingEmployees = employeeIds ? employeeIds.length - employees.length : workedEmployeeIds.length - employees.length;
  if (missingEmployees) console.log(`SKIP ${missingEmployees} time-log employee reference(s) with no employee record.`);
  if (!apply || !repairs.length) {
    console.log(`${repairs.length} rate(s) ${apply ? "remaining" : "proposed"}. No database changes made.`);
    return;
  }

  // The backup contains only billing fields, never credentials. Keep it local.
  const now = new Date();
  const backupDir = path.resolve(__dirname, "../.local-repairs");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `project-rates-${now.toISOString().replace(/[:.]/g, "-")}.json`);
  const entries = repairs.map((repair) => ({ ...repair, newRateId: new mongoose.Types.ObjectId() }));
  fs.writeFileSync(backupPath, JSON.stringify({ createdAt: now, sourceId, targetId, entries }, null, 2), { flag: "wx" });
  console.log(`Billing-field backup: ${backupPath}`);
  let applied = 0;
  for (const repair of entries) {
    if (await applyProjectRateCopy({ employeesCollection: db.collection("employees"), repair, targetProjectId: targetId, newRateId: repair.newRateId, now })) {
      applied++;
      console.log(`UPDATED ${repair.employee.employeeId}`);
    } else console.log(`CONFLICT ${repair.employee.employeeId}: rates changed since the preview; left unchanged.`);
  }
  console.log(`Applied ${applied} of ${repairs.length} copied rate(s).`);
  if (applied !== repairs.length) process.exitCode = 1;
};

if (require.main === module) {
  main().catch(() => {
    // Driver errors can contain connection details. Do not print credentials.
    console.error("Rate repair failed. Check project IDs, project status/team assignments, arguments, database connectivity and backup permissions.");
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}
