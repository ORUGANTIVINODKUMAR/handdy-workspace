const mongoose = require("mongoose");

const pauseSchema = new mongoose.Schema(
  {
    pausedAt: {
      type: Date,
      required: true,
    },

    resumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const taskTimeLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    stoppedAt: {
      type: Date,
      default: null,
    },

    pauses: {
      type: [pauseSchema],
      default: [],
    },

    totalPausedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWorkedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["running", "paused", "stopped"],
      default: "running",
    },

    isActiveTimer: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "task_time_logs",
  }
);

taskTimeLogSchema.index(
  { employee: 1, isActiveTimer: 1 },
  {
    unique: true,
    partialFilterExpression: { isActiveTimer: true },
  }
);

taskTimeLogSchema.index({ employee: 1, status: 1, startedAt: 1, stoppedAt: 1 });

module.exports = mongoose.model("TaskTimeLog", taskTimeLogSchema);
