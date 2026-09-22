const ADMIN_ROLES = new Set(["admin", "alpha"]);

const isAdminRole = (role) => ADMIN_ROLES.has(role);
const isAlphaRole = (role) => role === "alpha";

module.exports = { isAdminRole, isAlphaRole };
