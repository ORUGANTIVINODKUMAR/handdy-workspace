require("dotenv").config();

const mongoose = require("mongoose");
const Employee = require("../src/models/Employee");

const required = (name) => {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const run = async () => {
  const mongoUri = required("MONGODB_URI");
  const email = required("EXEMPT_EMPLOYEE_EMAIL").toLowerCase();
  const employeeId = required("EXEMPT_EMPLOYEE_ID").toUpperCase();
  const fullName = required("EXEMPT_EMPLOYEE_NAME");
  const password = String(process.env.EXEMPT_EMPLOYEE_PASSWORD || "");
  const team = String(process.env.EXEMPT_EMPLOYEE_TEAM_ID || "").trim() || null;

  if (password && password.length < 8) {
    throw new Error("EXEMPT_EMPLOYEE_PASSWORD must contain at least 8 characters.");
  }

  await mongoose.connect(mongoUri);

  let employee = await Employee.findOne({
    $or: [{ email }, { employeeId }],
  }).select("+idleTrackingExempt +password");

  if (!employee) {
    if (!password) {
      throw new Error(
        "EXEMPT_EMPLOYEE_PASSWORD is required when creating a new employee."
      );
    }

    const nameParts = fullName.split(/\s+/);
    employee = await Employee.create({
      employeeId,
      fullName,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      email,
      password,
      role: "employee",
      team,
      idleTrackingExempt: false,
    });
  } else {
    employee.employeeId = employeeId;
    employee.fullName = fullName;
    employee.email = email;
    employee.role = "employee";
    employee.isActive = true;

    if (team) {
      employee.team = team;
    }

    if (password) {
      employee.password = password;
    }
  }

  // Only one employee may hold the backend-managed exemption.
  await Employee.updateMany(
    { _id: { $ne: employee._id }, idleTrackingExempt: true },
    { $set: { idleTrackingExempt: false } }
  );

  employee.idleTrackingExempt = true;
  await employee.save();

  console.log(
    `Idle-exempt employee is ready: ${employee.employeeId} (${employee.email})`
  );
};

run()
  .catch((error) => {
    console.error(`Unable to create idle-exempt employee: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

