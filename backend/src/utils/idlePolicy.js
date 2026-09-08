const defaults = require("../../../desktop-app/idle-policy-defaults.json");

function normalizeIdlePolicy(settings = {}) {
  const idleThresholdMinutes = settings.idleThresholdMinutes ?? defaults.idleThresholdMinutes;
  return {
    idleThresholdMinutes,
    autoLogoutMinutes: settings.autoLogoutMinutes ?? Math.max(defaults.autoLogoutMinutes, idleThresholdMinutes + 1),
  };
}

function validateIdlePolicy({ idleThresholdMinutes, autoLogoutMinutes }) {
  if (!Number.isInteger(idleThresholdMinutes) || idleThresholdMinutes < defaults.minIdleMinutes || idleThresholdMinutes > defaults.maxIdleMinutes) {
    return `Idle threshold must be a whole number from ${defaults.minIdleMinutes} to ${defaults.maxIdleMinutes} minutes.`;
  }
  if (!Number.isInteger(autoLogoutMinutes) || autoLogoutMinutes < defaults.minLogoutMinutes || autoLogoutMinutes > defaults.maxLogoutMinutes) {
    return `Auto logout must be a whole number from ${defaults.minLogoutMinutes} to ${defaults.maxLogoutMinutes} minutes.`;
  }
  return autoLogoutMinutes <= idleThresholdMinutes ? "Auto logout must be greater than the idle pause threshold." : "";
}

module.exports = { defaults, normalizeIdlePolicy, validateIdlePolicy };
