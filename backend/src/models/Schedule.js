const mongoose = require("mongoose");

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

// Matches the query pattern in scheduleController.js's hasConflictingSchedule
// (employee + date range lookup) and getAllSchedules (date-sorted, often
// filtered by employee).
scheduleSchema.index({ employee: 1, date: 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;