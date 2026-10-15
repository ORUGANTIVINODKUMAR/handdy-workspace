const mongoose = require("mongoose");
const { loginNotificationPlugin } = require("../services/loginNotifications");

const authSessionSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  deviceId: { type: String, required: true },
  deviceName: { type: String, required: true, maxlength: 160 },
  clientType: { type: String, enum: ["desktop", "web"], default: "desktop" },
  status: {
    type: String,
    enum: ["pending", "active", "revoked", "logged_out", "expired", "denied"],
    required: true,
    default: "pending",
  },
  loginAt: { type: Date, default: null },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  revokeReason: { type: String, default: "" },
}, { timestamps: true });

authSessionSchema.index(
  { employee: 1, clientType: 1, status: 1 },
  {
    name: "one_active_desktop_session_per_employee",
    unique: true,
    partialFilterExpression: { clientType: "desktop", status: "active" },
  },
);
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

authSessionSchema.plugin(loginNotificationPlugin);
authSessionSchema.plugin(require("../services/authCache").authCachePlugin);
module.exports = mongoose.model("AuthSession", authSessionSchema);
