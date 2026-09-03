const mongoose = require("mongoose");

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeProjectRates = (value, { required = true } = {}) => {
  if (!Array.isArray(value)) {
    throw createValidationError("Project rates must be provided as a list.");
  }
  if (required && value.length === 0) {
    throw createValidationError("Add at least one project and charge rate.");
  }

  const seen = new Set();
  return value.map((assignment, index) => {
    const project = String(assignment?.project?._id || assignment?.project || "").trim();
    const rawRate = assignment?.chargeRate;
    const chargeRate = rawRate === "" || rawRate === null || rawRate === undefined
      ? Number.NaN
      : Number(rawRate);

    if (!mongoose.isValidObjectId(project)) {
      throw createValidationError(`Select a valid project for project row ${index + 1}.`);
    }
    if (seen.has(project)) {
      throw createValidationError("The same project cannot be assigned more than once.");
    }
    if (!Number.isFinite(chargeRate) || chargeRate <= 0 || chargeRate > 1_000_000) {
      throw createValidationError(`Enter a valid positive charge rate for project row ${index + 1}.`);
    }

    seen.add(project);
    return {
      project,
      chargeRate: Math.round((chargeRate + Number.EPSILON) * 100) / 100,
    };
  });
};

module.exports = { normalizeProjectRates };
