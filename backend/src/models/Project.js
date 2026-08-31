const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    projectCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    clientName: {
      type: String,
      default: "",
    },

    // Existing records use clientName. This reference enables a reliable
    // client → project relationship without invalidating older projects.
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    // A shared service project (for example Audit) can be available to
    // several clients. `client` remains as the primary legacy reference.
    clients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    }],

    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold"],
      default: "Active",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
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

module.exports = mongoose.model("Project", projectSchema);
