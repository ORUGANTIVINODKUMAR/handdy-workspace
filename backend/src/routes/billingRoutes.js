const express = require("express");
const { getBillingEmployees, getBillingReport } = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const router = express.Router();
router.use(protect, authorizeRoles("admin"));
router.get("/employees", getBillingEmployees);
router.get("/report", getBillingReport);

module.exports = router;
