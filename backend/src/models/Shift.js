const mongoose = require("mongoose");

const breakSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      startTime: {
        type: String,
        required: true,
      },

      endTime: {
        type: String,
        required: true,
      },
    },
    {
      _id: true,
    }
  );

const shiftSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      timezone: {
        type: String,
        required: true,
      },

      shiftType: {
        type: String,
        enum: [
          "Fixed",
          "Flexible",
        ],
        default: "Fixed",
      },

      startTime: {
        type: String,
        required: true,
      },

      endTime: {
        type: String,
        required: true,
      },

      breakType: {
        type: String,
        enum: [
          "Fixed",
          "Flexible",
        ],
        default: "Fixed",
      },

      breaks: {
        type: [breakSchema],
        default: [],
      },

      status: {
        type: String,
        enum: [
          "Active",
          "Inactive",
        ],
        default: "Active",
      },

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Employee",

        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

const Shift =
  mongoose.model(
    "Shift",
    shiftSchema
  );

module.exports = Shift;