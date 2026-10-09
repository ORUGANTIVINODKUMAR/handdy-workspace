const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getMyPermissions, getPermissionConfig, updateRolePermissions } = require("../controllers/permissionController");

const router = express.Router();

// Managers hold admin-level access elsewhere, but changing who may do what is
// limited to the admin and alpha roles.
const adminOnly = (req, res, next) =>
  ["admin", "alpha"].includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: "Only an administrator can manage permissions." });

router.get("/me", protect, getMyPermissions);
router.get("/", protect, adminOnly, getPermissionConfig);
router.put("/roles/:role", protect, adminOnly, updateRolePermissions);

module.exports = router;
