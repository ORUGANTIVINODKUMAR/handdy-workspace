const mongoose = require("mongoose");

const deviceLoginRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  requestTokenHash: { type: String, required: true, select: false },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  existingSession: { type: mongoose.Schema.Types.ObjectId, ref: "AuthSession", required: true, index: true },
  requestedSession: { type: mongoose.Schema.Types.ObjectId, ref: "AuthSession", required: true },
  deviceId: { type: String, required: true },
  deviceName: { type: String, required: true, maxlength: 160 },
  clientType: { type: String, enum: ["desktop", "web"], default: "desktop" },
  status: {
    type: String,
    enum: ["pending", "approving", "approved", "denied", "expired", "cancelled", "superseded"],
    default: "pending",
    required: true,
    index: true,
  },
  expiresAt: { type: Date, required: true, index: true },
  cleanupAt: { type: Date, required: true },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

deviceLoginRequestSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });
deviceLoginRequestSchema.index({ existingSession: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model("DeviceLoginRequest", deviceLoginRequestSchema);
