const mongoose = require("mongoose");

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
      default: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);

