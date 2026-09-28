// Managers intentionally inherit the same application permissions as admins.
// Alpha remains a distinct super-admin role for alpha-only operations.
const ADMIN_ROLES = new Set(["admin", "alpha", "manager"]);

const isAdminRole = (role) => ADMIN_ROLES.has(role);
const isAlphaRole = (role) => role === "alpha";

module.exports = { isAdminRole, isAlphaRole };
