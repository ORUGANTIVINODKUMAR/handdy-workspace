const SERVICE_TYPES = [
  "FTC",
  "Tax",
  "Bookkeeping",
  "Audit",
  "Business Tax Return",
];

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeServiceRates = (value, { required = true } = {}) => {
  if (!Array.isArray(value)) {
    throw createValidationError("Service rates must be provided as a list.");
  }
  if (required && value.length === 0) {
    throw createValidationError("Add at least one service type and charge rate.");
  }

  const seen = new Set();
  return value.map((assignment, index) => {
    const serviceType = typeof assignment?.serviceType === "string"
      ? assignment.serviceType.trim()
      : "";
    const rawRate = assignment?.chargeRate;
    const chargeRate = rawRate === "" || rawRate === null || rawRate === undefined
      ? Number.NaN
      : Number(rawRate);

    if (!SERVICE_TYPES.includes(serviceType)) {
      throw createValidationError(`Select a valid service type for service row ${index + 1}.`);
    }
    if (seen.has(serviceType)) {
      throw createValidationError(`${serviceType} cannot be assigned more than once.`);
    }
    if (!Number.isFinite(chargeRate) || chargeRate <= 0 || chargeRate > 1_000_000) {
      throw createValidationError(`Enter a valid positive charge rate for ${serviceType}.`);
    }

    seen.add(serviceType);
    return {
      serviceType,
      chargeRate: Math.round((chargeRate + Number.EPSILON) * 100) / 100,
    };
  });
};

module.exports = { SERVICE_TYPES, normalizeServiceRates };
