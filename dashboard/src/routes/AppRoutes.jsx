import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";


// ==========================================
// ADMIN IMPORTS
// ==========================================

import AdminEmployees
  from "../pages/admin/AdminEmployees";

import AdminProjects
  from "../pages/admin/AdminProjects";

import AdminPlaceholderPage
  from "../pages/admin/AdminPlaceholderPage";

import AdminClients
  from "../pages/admin/AdminClients";

import AdminTeams
  from "../pages/admin/AdminTeams";

import AdminTasks
  from "../pages/admin/AdminTasks";

import AdminAddTask
  from "../pages/admin/AdminAddTask";

import AdminShifts
  from "../pages/admin/AdminShifts";

import AdminAddShift
  from "../pages/admin/AdminAddShift";

import AdminSchedule
  from "../pages/admin/AdminSchedule";

import AdminSettings
  from "../pages/admin/AdminSettings";

// ==========================================
// TEAM LEAD IMPORTS
// ==========================================

import TeamLeadTasks
  from "../pages/teamLead/TeamLeadTasks";

import TeamLeadAddTask
  from "../pages/teamLead/TeamLeadAddTask";

import TeamLeadApps
  from "../pages/teamLead/TeamLeadApps";

import TeamLeadHelp
  from "../pages/teamLead/TeamLeadHelp";



// ==========================================
// EMPLOYEE IMPORTS
// ==========================================

import EmployeeApps
  from "../pages/employee/EmployeeApps";

import EmployeeHelp
  from "../pages/employee/EmployeeHelp";

import EmployeeListPage
  from "../pages/employee/EmployeeListPage";

import EmployeeDetailsPage
  from "../pages/employee/EmployeeDetailsPage";

import RoleReportPage
  from "../pages/shared/RoleReportPage";

import AdminReportPage
  from "../pages/admin/AdminReportPage";

import BillingPage
  from "../pages/shared/BillingPage";

// ==========================================
// PROFILE
// ==========================================

import ProfilePage
  from "../pages/profile/ProfilePage";


// ==========================================
// PROTECTED ROUTE
// ==========================================

import ProtectedRoute
  from "./ProtectedRoute";


// ==========================================
// ROLE WRAPPERS
// ==========================================

function AdminOnly({ children }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      {children}
    </ProtectedRoute>
  );
}


function TeamLeadOnly({ children }) {
  return (
    <ProtectedRoute allowedRoles={["team_lead"]}>
      {children}
    </ProtectedRoute>
  );
}


function EmployeeOnly({ children }) {
  return (
    <ProtectedRoute allowedRoles={["employee"]}>
      {children}
    </ProtectedRoute>
  );
}

function AttendanceStaffOnly({ children }) {
  return (
    <ProtectedRoute allowedRoles={["hr", "manager"]}>
      {children}
    </ProtectedRoute>
  );
}


// ==========================================
// APP ROUTES
// ==========================================

function AppRoutes() {
  return (
    <Routes>

      {/* ======================================
          LOGIN
      ====================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />


      <Route
        path="/admin/login"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/team-lead/login"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />


      {/* ======================================
          ADMIN DASHBOARD
      ====================================== */}

      <Route
        path="/admin/dashboard"
        element={
          <AdminOnly>
            <AdminReportPage title="Employee insights" description="Company project and task timer activity by employee." />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/billing"
        element={<AdminOnly><BillingPage /></AdminOnly>}
      />


      {/* ======================================
          ADMIN ATTENDANCE
      ====================================== */}

      <Route
        path="/admin/attendance"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="My Attendance"
              description="Admin attendance page."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/attendance"
        element={
          <AttendanceStaffOnly>
            <AdminReportPage
              title="Attendance"
              description="Company attendance for all employees."
              mode="attendance"
              allowEmployeeFilter={false}
            />
          </AttendanceStaffOnly>
        }
      />


      {/* ======================================
          ADMIN MY TIMESHEET
      ====================================== */}

      <Route
        path="/admin/my-timesheet"
        element={
          <AdminOnly>
            <AdminReportPage title="My timesheet" description="Your recorded project and task timer activity." scope="personal" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/my-timesheet/details"
        element={
          <AdminOnly>
            <AdminReportPage title="My detailed timesheet" description="Detailed personal project and task timer activity." scope="personal" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/my-timesheet/count"
        element={
          <AdminOnly>
            <AdminReportPage title="My count report" description="Your timer activity and total worked duration." scope="personal" />
          </AdminOnly>
        }
      />

      {/* OLD ADMIN TIMESHEET URLS */}

      <Route
        path="/admin/timesheet"
        element={
          <Navigate
            to="/admin/my-timesheet"
            replace
          />
        }
      />

      <Route
        path="/admin/timesheet/details"
        element={
          <Navigate
            to="/admin/my-timesheet/details"
            replace
          />
        }
      />


      {/* ======================================
          ADMIN TIMESHEETS
      ====================================== */}

      <Route
        path="/admin/timesheets/team"
        element={
          <AdminOnly>
            <AdminReportPage title="Team timesheet" description="Employee totals across company project and task timer activity." variant="team" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/detailed"
        element={
          <AdminOnly>
            <AdminReportPage title="Detailed timesheet" description="Every company timer session with start, finish, worked, idle, and status details." variant="detailed" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/project-hours"
        element={
          <AdminOnly>
            <AdminReportPage title="Project hours" description="Worked and idle duration grouped by project." variant="project" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/attendance"
        element={
          <AdminOnly>
            <AdminReportPage title="Attendance" description="Company attendance from employee check-in and check-out activity." mode="attendance" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/count"
        element={
          <AdminOnly>
            <AdminReportPage title="Count report" description="Company timer records and total worked duration." />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/working-today"
        element={
          <AdminOnly>
            <AdminReportPage title="Who is working today" description="Today’s active and completed timer records by employee." />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/task-tracker"
        element={
          <AdminOnly>
            <AdminReportPage title="Task tracker" description="Task-level timer records across the company." />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/timesheets/project-work"
        element={
          <AdminOnly>
            <AdminReportPage title="Project work details" description="Project and task work records across the company." />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN MONITORING
      ====================================== */}



      <Route
        path="/admin/monitoring/keystrokes"
        element={
          <AdminOnly>
            <AdminReportPage title="Keystrokes used" description="Keyboard activity received from employee desktop applications." mode="tracking" trackingLabel="keyboard activity" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/monitoring/websites"
        element={
          <AdminOnly>
            <AdminReportPage title="Websites used" description="Website activity received from employee desktop applications." mode="tracking" trackingLabel="website activity" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/monitoring/screenshots"
        element={
          <AdminOnly>
            <AdminReportPage title="Screenshots" description="Screenshots received from employee desktop applications." mode="tracking" trackingLabel="screenshots" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/monitoring/application-usage"
        element={
          <AdminOnly>
            <AdminReportPage title="Application usage details" description="Detailed application activity received from employee desktop applications." mode="tracking" trackingLabel="application usage" />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/monitoring/website-usage"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Website usage details"
              description="Detailed website usage."
            />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN PRODUCTIVITY
      ====================================== */}

      <Route
        path="/admin/productivity/report"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Productivity report"
              description="Employee productivity report."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/productivity/hours"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Productive hours"
              description="Productive hours report."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/productivity/projects"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Projects worked on"
              description="Projects worked on report."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/productivity/employees"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Productive employees"
              description="Productive employees report."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/productivity/categories"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Categories worked"
              description="Categories worked report."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/productivity/websites"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Productive websites"
              description="Productive websites report."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/productivity/applications"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Productive applications"
              description="Productive applications report."
            />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN MANAGEMENT
      ====================================== */}

      <Route
        path="/admin/clients"
        element={
          <AdminOnly>
            <AdminClients />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/projects"
        element={
          <AdminOnly>
            <AdminProjects />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/tasks"
        element={
          <AdminOnly>
            <AdminTasks />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/tasks/new"
        element={
          <AdminOnly>
            <AdminAddTask />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/team"
        element={
          <AdminOnly>
            <AdminTeams />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/teams"
        element={
          <Navigate
            to="/admin/team"
            replace
          />
        }
      />

      <Route
        path="/admin/employees"
        element={
          <AdminOnly>
            <AdminEmployees />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN SCHEDULER
      ====================================== */}

      <Route
        path="/admin/scheduler/shift"
        element={
          <AdminOnly>
            <AdminShifts />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/scheduler/shift/add"
        element={
          <AdminOnly>
            <AdminAddShift />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/scheduler/schedule"
        element={
          <AdminOnly>
            <AdminSchedule />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/scheduler/shifts"
        element={
          <Navigate
            to="/admin/scheduler/shift"
            replace
          />
        }
      />

      <Route
        path="/admin/scheduler/shifts/add"
        element={
          <Navigate
            to="/admin/scheduler/shift/add"
            replace
          />
        }
      />

      <Route
        path="/admin/schedule"
        element={
          <Navigate
            to="/admin/scheduler/schedule"
            replace
          />
        }
      />


      {/* ======================================
          ADMIN PERMISSIONS
      ====================================== */}

      <Route
        path="/admin/permissions"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Permissions"
              description="Manage employee and team permissions."
            />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN SUBSCRIPTION
      ====================================== */}

      <Route
        path="/admin/subscription"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Subscription"
              description="Manage subscription details."
            />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN CLASSIFICATION
      ====================================== */}

      <Route
        path="/admin/classification/websites"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Websites"
              description="Website classification."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/classification/applications"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Applications"
              description="Application classification."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/classification/category"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Category"
              description="Manage productivity categories."
            />
          </AdminOnly>
        }
      />


      {/* ======================================
          ADMIN MY ACCOUNT
      ====================================== */}

      <Route
        path="/admin/integrations"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Integrations"
              description="Manage integrations."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <AdminOnly>
            <AdminSettings />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/apps"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Apps"
              description="Download and manage desktop applications."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/getting-started"
        element={
          <AdminOnly>
            <AdminPlaceholderPage
              title="Getting started"
              description="Getting started information."
            />
          </AdminOnly>
        }
      />

      <Route
        path="/admin/monitoring/applications"
        element={
          <AdminOnly>
            <AdminReportPage title="Applications used" description="Application activity received from employee desktop applications." mode="tracking" trackingLabel="application activity" />
          </AdminOnly>
        }
      />


      {/* ======================================
          TEAM LEAD
      ====================================== */}

      <Route
        path="/team-lead/dashboard"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Team activity" description="Recorded project and task timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/employee-insights"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Employee insights" description="Recorded project and task timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheet"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="My timesheet" description="Your recorded project and task timer activity." scope="personal" />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheet/details"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="My detailed timesheet" description="Detailed personal timer activity." scope="personal" />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheet/count"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="My count report" description="Your timer records and total worked duration." scope="personal" />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/team"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Team timesheet" description="Timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/detailed"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Detailed team timesheet" description="Detailed timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/project-hours"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Project hours" description="Project timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/attendance"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Attendance" description="Attendance history for your assigned employees." mode="attendance" />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/count"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Team count report" description="Team timer records and total worked duration." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/working-today"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Who is working today" description="Today’s recorded timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/task-tracker"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Task tracker" description="Task-level timer activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/timesheets/project-work"
        element={
          <TeamLeadOnly>
            <RoleReportPage title="Project work details" description="Project and task activity for your assigned employees." />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/tasks"
        element={
          <TeamLeadOnly>
            <TeamLeadTasks />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/tasks/add"
        element={
          <TeamLeadOnly>
            <TeamLeadAddTask />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/apps"
        element={
          <TeamLeadOnly>
            <TeamLeadApps />
          </TeamLeadOnly>
        }
      />

      <Route
        path="/team-lead/help"
        element={
          <TeamLeadOnly>
            <TeamLeadHelp />
          </TeamLeadOnly>
        }
      />


      {/* ======================================
          EMPLOYEE
      ====================================== */}

      <Route
        path="/employee/dashboard"
        element={
          <EmployeeOnly>
            <RoleReportPage title="Employee insights" description="Your recorded project and task timer activity." showDesktopDownload />
          </EmployeeOnly>
        }
      />

      <Route
        path="/employee/timesheet"
        element={
          <EmployeeOnly>
            <RoleReportPage title="My timesheet" description="Your recorded project and task timer activity." />
          </EmployeeOnly>
        }
      />

      <Route
        path="/employee/timesheet/details"
        element={
          <EmployeeOnly>
            <RoleReportPage title="My detailed timesheet" description="Detailed project and task timer activity." />
          </EmployeeOnly>
        }
      />

      <Route
        path="/employee/timesheet/count"
        element={
          <EmployeeOnly>
            <RoleReportPage title="My count report" description="Your timer records and total worked duration." />
          </EmployeeOnly>
        }
      />

      <Route
        path="/employee/app"
        element={
          <EmployeeOnly>
            <EmployeeApps />
          </EmployeeOnly>
        }
      />

      <Route
        path="/employee/apps"
        element={
          <EmployeeOnly>
            <EmployeeApps />
          </EmployeeOnly>
        }
      />

      <Route
        path="/employee/help"
        element={
          <EmployeeOnly>
            <EmployeeHelp />
          </EmployeeOnly>
        }
      />


      {/* ======================================
          SHARED PROFILE
      ====================================== */}

      <Route
        path="/profile"
        element={
          <ProtectedRoute
            allowedRoles={[
              "admin",
              "team_lead",
              "employee",
            ]}
          >
            <ProfilePage />
          </ProtectedRoute>
        }
      />


      {/* ======================================
          SHARED EMPLOYEE LIST
      ====================================== */}

      <Route
        path="/employees"
        element={
          <ProtectedRoute
            allowedRoles={[
              "admin",
              "team_lead",
            ]}
          >
            <EmployeeListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees/:employeeId"
        element={
          <ProtectedRoute allowedRoles={["admin", "team_lead"]}>
            <EmployeeDetailsPage />
          </ProtectedRoute>
        }
      />


      {/* ======================================
          FALLBACK
      ====================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}

export default AppRoutes;
