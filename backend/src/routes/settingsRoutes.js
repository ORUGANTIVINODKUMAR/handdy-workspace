const express = require("express");

const {
  getIdlePolicy,
  updateIdlePolicy,
} = require("../controllers/settingsController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const router = express.Router();

router.get("/idle-policy", protect, getIdlePolicy);
router.put(
  "/idle-policy",
  protect,
  authorizeRoles("admin"),
  updateIdlePolicy
);

module.exports = router;

