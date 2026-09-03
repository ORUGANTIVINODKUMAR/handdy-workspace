const mongoose = require("mongoose");
const { SERVICE_TYPES } = require("../utils/serviceRates");

const taskSchema = new mongoose.Schema(
  {
    taskCode: {
      type: String,
      required: [true, "Task code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    taskName: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    taskType: {
      type: String,
      enum: {
        values: ["work", "break"],
        message: "Task type must be work or break",
      },
      default: "work",
    },

    serviceType: {
      type: String,
      enum: {
        values: [...SERVICE_TYPES, null],
        message: "Select a valid service type",
      },
      trim: true,
      default: null,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    // `team` is retained as the primary legacy reference. A task can also be
    // assigned to more than one team through this collection.
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    assignToAllEmployees: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    idleLogout: {
      type: Boolean,
      default: false,
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

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
