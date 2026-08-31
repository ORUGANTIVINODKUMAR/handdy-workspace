const express =
  require("express");

const {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift,
} = require(
  "../controllers/shiftController"
);

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const {
  authorizeRoles,
} = require(
  "../middleware/authorizeRoles"
);

const router =
  express.Router();

// ==============================
// CREATE SHIFT
// ==============================
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createShift
);

// ==============================
// GET ALL SHIFTS
// ==============================
router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAllShifts
);

// ==============================
// GET ONE SHIFT
// ==============================
router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  getShiftById
);

// ==============================
// UPDATE SHIFT
// ==============================
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateShift
);

// ==============================
// DELETE SHIFT
// ==============================
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteShift
);

module.exports = router;