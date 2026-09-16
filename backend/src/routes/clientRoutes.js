const express = require("express");
const Client = require("../models/Client");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const { escapeRegExp } = require("../utils/requestUtils");

const router = express.Router();
router.use(protect, authorizeRoles("admin", "manager", "hr"));

router.get("/", async (req, res) => {
  try {
    const filter = { status: { $ne: "Inactive" } };
    if (req.query.search) {
      filter.clientName = { $regex: escapeRegExp(req.query.search), $options: "i" };
    }
    const clients = await Client.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, count: clients.length, clients });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load clients." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { clientName } = req.body;
    if (!clientName?.trim()) return res.status(400).json({ success: false, message: "Client name is required." });
    const client = await Client.create({ clientName: clientName.trim(), createdBy: req.user._id });
    return res.status(201).json({ success: true, message: "Client created successfully.", client });
  } catch (error) {
    return res.status(error.name === "ValidationError" ? 400 : 500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const clientName = req.body.clientName?.trim();
    if (!clientName) return res.status(400).json({ success: false, message: "Client name is required." });
    const updates = { clientName };
    const client = await Client.findByIdAndUpdate(req.params.id, updates, { returnDocument: "after", runValidators: true });
    if (!client) return res.status(404).json({ success: false, message: "Client not found." });
    return res.json({ success: true, message: "Client updated successfully.", client });
  } catch (error) {
    return res.status(error.name === "CastError" || error.name === "ValidationError" ? 400 : 500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, { status: "Inactive" }, { returnDocument: "after" });
    if (!client) return res.status(404).json({ success: false, message: "Client not found." });
    return res.json({ success: true, message: "Client deactivated successfully.", client });
  } catch (error) {
    return res.status(error.name === "CastError" ? 400 : 500).json({ success: false, message: "Unable to deactivate client." });
  }
});

module.exports = router;
