// Catalog of role-configurable permissions.
//
// Admin-level roles (admin, alpha, manager - see utils/roles.js) always hold
// every permission and are not configurable, which preserves the existing
// "managers inherit admin" policy. The roles below are configurable. Their
// DEFAULT_ROLE_PERMISSIONS reproduce exactly what the routes allowed before
// this catalog existed, so nothing changes until an administrator edits a role.
//
// `enforcement` tells the Permissions screen how honest each checkbox is:
//   "backend"  - checked by an API middleware/guard
//   "frontend" - only controls UI (e.g. exports are generated in the browser)
//   "none"     - catalogued for future use; no endpoint is gated by it yet
const CONFIGURABLE_ROLES = ["hr", "team_lead", "employee"];

const PERMISSION_CATEGORIES = [
  {
    key: "tasks",
    label: "Task permissions",
    permissions: [
      { key: "view_tasks", label: "View tasks", enforcement: "none" },
      { key: "create_tasks", label: "Create tasks", enforcement: "backend" },
      { key: "edit_tasks", label: "Edit tasks", enforcement: "backend" },
      { key: "assign_tasks", label: "Assign tasks", enforcement: "backend" },
      { key: "reassign_tasks", label: "Reassign tasks", enforcement: "backend" },
      { key: "complete_tasks", label: "Complete tasks", enforcement: "none" },
      { key: "archive_tasks", label: "Archive tasks", enforcement: "backend" },
      { key: "view_task_timesheets", label: "View task timesheets", enforcement: "none" },
      { key: "add_manual_entries", label: "Add manual timesheet entries", enforcement: "backend", sensitive: true },
    ],
  },
  {
    key: "teams",
    label: "Team permissions",
    permissions: [
      { key: "view_teams", label: "View teams", enforcement: "none" },
      { key: "create_teams", label: "Create teams", enforcement: "backend" },
      { key: "edit_teams", label: "Edit teams", enforcement: "backend" },
      { key: "assign_team_members", label: "Assign employees to teams", enforcement: "none", sensitive: true },
      { key: "remove_team_members", label: "Remove employees from teams", enforcement: "none", sensitive: true },
      { key: "assign_team_leads", label: "Assign team leads", enforcement: "backend", sensitive: true },
      { key: "view_team_timesheets", label: "View team timesheets", enforcement: "backend" },
      { key: "view_team_productivity", label: "View team productivity reports", enforcement: "none" },
    ],
  },
  {
    key: "clients_projects",
    label: "Client and project permissions",
    permissions: [
      { key: "view_clients", label: "View clients", enforcement: "none" },
      { key: "manage_clients", label: "Create/edit clients", enforcement: "backend" },
      { key: "view_projects", label: "View projects", enforcement: "none" },
      { key: "manage_projects", label: "Create/edit projects", enforcement: "backend" },
      { key: "assign_projects", label: "Assign projects", enforcement: "none" },
    ],
  },
  {
    key: "reports_billing",
    label: "Reports and billing permissions",
    permissions: [
      { key: "view_personal_reports", label: "View personal reports", enforcement: "none" },
      { key: "view_team_reports", label: "View team reports", enforcement: "none" },
      { key: "view_all_reports", label: "View all employee reports", enforcement: "backend" },
      { key: "export_reports", label: "Export Excel/PDF", enforcement: "none" },
      { key: "view_billing_amounts", label: "View billing amounts", enforcement: "backend", sensitive: true },
      { key: "manage_service_rates", label: "Manage employee service rates", enforcement: "none", sensitive: true },
      { key: "view_financial_reports", label: "View financial reports", enforcement: "none", sensitive: true },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap((category) =>
  category.permissions.map((permission) => permission.key));
const PERMISSION_KEY_SET = new Set(ALL_PERMISSION_KEYS);

// Mirrors the roles previously hard-coded in the route files.
const DEFAULT_ROLE_PERMISSIONS = {
  hr: [
    "view_tasks", "create_tasks", "edit_tasks", "assign_tasks", "reassign_tasks", "archive_tasks",
    "view_teams", "create_teams", "edit_teams",
    "view_clients", "manage_clients", "view_projects", "manage_projects",
    "view_personal_reports", "view_all_reports", "export_reports", "view_billing_amounts",
  ],
  team_lead: [
    "view_tasks", "create_tasks", "edit_tasks", "assign_tasks", "reassign_tasks", "archive_tasks",
    "view_teams", "view_team_timesheets", "view_team_reports",
    "view_clients", "view_projects", "view_personal_reports", "export_reports",
  ],
  employee: [
    "view_tasks", "view_clients", "view_projects", "view_personal_reports", "export_reports",
  ],
};

const isConfigurableRole = (role) => CONFIGURABLE_ROLES.includes(role);

// Returns the cleaned permission list, or the first unknown key as `invalid`.
const normalizePermissionList = (requested) => {
  if (!Array.isArray(requested)) return { invalid: "not-a-list" };
  const invalid = requested.find((key) => !PERMISSION_KEY_SET.has(key));
  if (invalid !== undefined) return { invalid: String(invalid) };
  return { permissions: [...new Set(requested)] };
};

module.exports = {
  ALL_PERMISSION_KEYS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  isConfigurableRole,
  normalizePermissionList,
};
