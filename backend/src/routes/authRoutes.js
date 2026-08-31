const express = require("express");

const {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const { createRateLimit } = require("../middleware/rateLimit");

const router = express.Router();

const loginLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

const registrationLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many registration attempts. Please try again later.",
});

// Only administrators can create employee accounts.
router.post(
  "/register",
  protect,
  authorizeRoles("admin"),
  registrationLimiter,
  register
);
router.post("/login", loginLimiter, login);

// Protected current-user routes
router.post("/logout", protect, logout);

router.get("/me", protect, getProfile);

// Update current user's profile
router.put("/profile", protect, updateProfile);

// Keep old GET route temporarily for compatibility
router.get("/profile", protect, getProfile);

module.exports = router;
