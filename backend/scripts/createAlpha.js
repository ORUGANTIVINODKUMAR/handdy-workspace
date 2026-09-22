require("dotenv").config();

const mongoose = require("mongoose");
const Employee = require("../src/models/Employee");
const { revokeEmployeeSessions } = require("../src/services/authSessionService");

const required = (name) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const run = async () => {
  const email = required("ALPHA_EMAIL").toLowerCase();
  const employeeId = required("ALPHA_EMPLOYEE_ID").toUpperCase();
  const fullName = required("ALPHA_NAME");
  const password = required("ALPHA_PASSWORD");
  if (password.length < 12) throw new Error("ALPHA_PASSWORD must contain at least 12 characters.");

  await mongoose.connect(required("MONGODB_URI"));
  const nameParts = fullName.split(/\s+/);
  const matches = await Employee.find({ $or: [{ email }, { employeeId }] })
    .select("+password +tokenVersion +rememberedSessionTokenHash +rememberedSessionExpires +rememberedSessions");
  if (matches.length > 1 || matches.some((employee) => employee.role !== "alpha")) {
    throw new Error("That email or employee ID belongs to a non-Alpha account. Existing accounts are never converted.");
  }

  let employee = matches[0];
  const created = !employee;
  if (!employee) {
    employee = new Employee({ role: "alpha" });
  } else {
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;
    employee.rememberedSessionTokenHash = null;
    employee.rememberedSessionExpires = null;
    employee.rememberedSessions = [];
  }
  employee.employeeId = employeeId;
  employee.fullName = fullName;
  employee.firstName = nameParts[0] || "";
  employee.lastName = nameParts.slice(1).join(" ");
  employee.email = email;
  employee.password = password;
  employee.role = "alpha";
  employee.isActive = true;
  await employee.save();
  if (!created) await revokeEmployeeSessions(employee._id, "alpha_terminal_rotation");
  console.log(`Alpha account ${created ? "created" : "updated"}: ${employee.employeeId} (${employee.email})`);
};

run()
  .catch((error) => {
    console.error(`Unable to create Alpha account: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
