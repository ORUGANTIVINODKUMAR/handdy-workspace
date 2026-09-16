const Project = require("../models/Project");
const { normalizeProjectRates } = require("../utils/projectRates");

// A project charge rate is optional for every role. Billing already treats
// a missing rate as "not configured" rather than an error (see
// aggregateBillingLogs in billingUtils.js), so nothing downstream assumes
// every employee has one.
const projectRatesRequiredForRole = () => false;

const validateProjectRates = async (value, { existingProjectIds = [], required = true } = {}) => {
  const projectRates = normalizeProjectRates(value, { required });
  const projectIds = projectRates.map((assignment) => assignment.project);
  const projects = await Project.find({ _id: { $in: projectIds } }).select("_id status").lean();

  if (projects.length !== projectIds.length) {
    const error = new Error("One or more selected projects do not exist.");
    error.statusCode = 400;
    throw error;
  }

  const existing = new Set(existingProjectIds.map(String));
  const newlySelectedInactiveProject = projects.find(
    (project) => project.status !== "Active" && !existing.has(String(project._id)),
  );
  if (newlySelectedInactiveProject) {
    const error = new Error("New charge rates can only be assigned to active projects.");
    error.statusCode = 400;
    throw error;
  }

  return projectRates;
};

module.exports = { validateProjectRates, projectRatesRequiredForRole };
