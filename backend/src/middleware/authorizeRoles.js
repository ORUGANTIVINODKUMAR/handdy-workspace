const { isAdminRole } = require("../utils/roles");

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
    }

    const allowed = allowedRoles.includes(req.user.role)
      || (isAdminRole(req.user.role) && allowedRoles.includes("admin"));
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};

// Admin-level roles always pass. Anyone else needs at least one of the named
// permissions explicitly granted on their employee record (see
// Employee.permissions). Used for actions an admin can delegate to a
// specific non-admin user.
const authorizeAccess = (...permissionKeys) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
    }

    const granted = req.user.permissions || [];
    if (isAdminRole(req.user.role) || permissionKeys.some((key) => granted.includes(key))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  };
};

module.exports = {
  authorizeRoles,
  authorizeAccess,
  authorizeRolesOrPermissions: ({ roles = [], permissions = [] }) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication is required." });
    if (isAdminRole(req.user.role) || roles.includes(req.user.role)
        || permissions.some((key) => (req.user.permissions || []).includes(key))) return next();
    return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
  },
};
