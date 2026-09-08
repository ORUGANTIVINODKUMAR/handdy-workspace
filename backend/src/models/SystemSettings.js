const mongoose = require("mongoose");
const { defaults, normalizeIdlePolicy, validateIdlePolicy } = require("../utils/idlePolicy");

const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["global"],
      default: "global",
    },
    idleThresholdMinutes: {
      type: Number,
      min: 1,
      max: 240,
      default: defaults.idleThresholdMinutes,
      validate: Number.isInteger,
    },
    autoLogoutMinutes: {
      type: Number,
      min: defaults.minLogoutMinutes,
      max: defaults.maxLogoutMinutes,
      validate: Number.isInteger,
    },
  },
  { timestamps: true }
);

systemSettingsSchema.pre("validate", function () {
  const error = validateIdlePolicy(normalizeIdlePolicy(this));
  if (error) this.invalidate("autoLogoutMinutes", error);
});

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
