const mongoose = require("mongoose");
const { getDateKeyInTimezone } = require("../utils/billingUtils");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const scheduleSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },

    scheduleTitle: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      required: true,
    },

    scheduleDateKey: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

scheduleSchema.pre("validate", function setScheduleDateKey() {
  if (this.date) this.scheduleDateKey = getDateKeyInTimezone(this.date, APP_TIMEZONE);
});

scheduleSchema.index({ employee: 1, date: 1 });
scheduleSchema.index(
  { employee: 1, scheduleDateKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "Active",
      scheduleDateKey: { $type: "string" },
    },
  },
);

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;
