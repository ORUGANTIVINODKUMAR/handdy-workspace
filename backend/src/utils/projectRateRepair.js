const id = (value) => String(value?._id || value || "");

// Used only by the explicit maintenance command. Billing must continue to
// resolve rates by project ID, even when two projects share the same name.
const buildProjectRateCopyPlan = ({ sourceProject, targetProject, employees, workedEmployeeIds }) => {
  if (!sourceProject || !targetProject || id(sourceProject) === id(targetProject)) {
    throw new Error("Select two different existing projects.");
  }
  if (sourceProject.status !== "Completed" || targetProject.status !== "Active" || targetProject.deletedAt) {
    throw new Error("The source must be completed and the destination must be active.");
  }
  if (sourceProject.projectName.trim().toLowerCase() !== targetProject.projectName.trim().toLowerCase()) {
    throw new Error("This repair is only for a recreated project with the same name.");
  }
  const teamKey = (project) => [...new Set((project.teams || []).map(id))].sort().join(",");
  if (teamKey(sourceProject) !== teamKey(targetProject)) {
    throw new Error("The projects have different team assignments; review their rates manually.");
  }

  const worked = new Set(workedEmployeeIds.map(id));
  const repairs = [];
  const skipped = [];
  for (const employee of employees) {
    if (!worked.has(id(employee))) continue;
    const rates = employee.projectRates || [];
    const sourceRates = rates.filter((rate) => id(rate.project) === id(sourceProject));
    const targetRates = rates.filter((rate) => id(rate.project) === id(targetProject));
    let reason = null;
    if (targetRates.length) reason = "Destination already has a rate; preserved without changes.";
    else if (sourceRates.length !== 1) reason = "No unique existing source rate; needs manual configuration.";
    else {
      const rate = sourceRates[0].chargeRate;
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0.01 || rate > 1_000_000) {
        reason = "Source rate is invalid; needs manual configuration.";
      }
    }
    if (reason) skipped.push({ employeeId: employee.employeeId, fullName: employee.fullName, reason });
    else repairs.push({ employee, chargeRate: sourceRates[0].chargeRate });
  }
  return { repairs, skipped };
};

const applyProjectRateCopy = async ({ employeesCollection, repair, targetProjectId, newRateId, now }) => {
  const result = await employeesCollection.updateOne(
    // A concurrent rate edit must cause a skip, never be overwritten.
    { _id: repair.employee._id, projectRates: repair.employee.projectRates },
    {
      $push: { projectRates: { _id: newRateId, project: targetProjectId, chargeRate: repair.chargeRate } },
      $set: { updatedAt: now },
    },
  );
  return result.modifiedCount === 1;
};

module.exports = { buildProjectRateCopyPlan, applyProjectRateCopy };
