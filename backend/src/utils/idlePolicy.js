// Backend and desktop-app are siblings in this monorepo, and in local dev we
// want a single source of truth for these defaults. But the backend must
// also be able to boot standalone (e.g. deployed/built without the sibling
// desktop-app/ directory present), so fall back to a hardcoded copy of that
// file's contents if the require fails.
const FALLBACK_DEFAULTS = {
  idleThresholdMinutes: 1,
  autoLogoutMinutes: 3,
  minIdleMinutes: 1,
  maxIdleMinutes: 240,
  minLogoutMinutes: 2,
  maxLogoutMinutes: 480,
};

let defaults;
try {
  defaults = require("../../../desktop-app/idle-policy-defaults.json");
} catch {
  defaults = FALLBACK_DEFAULTS;
}

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
