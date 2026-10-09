const mongoose = require("mongoose");

// One document per configurable role. A role with no document uses
// DEFAULT_ROLE_PERMISSIONS, so no data migration is required and existing
// access is unchanged until an administrator saves a role.
const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true, enum: ["hr", "team_lead", "employee"] },
    permissions: { type: [String], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true, collection: "role_permissions" },
);

module.exports = mongoose.model("RolePermission", rolePermissionSchema);
