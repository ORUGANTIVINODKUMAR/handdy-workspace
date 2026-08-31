import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminTimesheetsAttendance() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [month, setMonth] = useState("");
  const [timezone, setTimezone] = useState("");

  const handleGo = () => {
    console.log({
      team,
      employee,
      month,
      timezone,
    });
  };

  return (
    <DashboardLayout title="Attendance">
      <section className="admin-card timesheets-attendance-card">
        <div className="timesheets-attendance-heading">
          <h2>Attendance</h2>
        </div>

        <p className="timesheet-help-text">
          Please select team, employee and date. Then click Go to generate your
          report
        </p>

        <div className="timesheets-attendance-controls">
          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
          >
            <option value="">Select team</option>
            <option value="development">Development Team</option>
            <option value="testing">Testing Team</option>
            <option value="support">Support Team</option>
          </select>

          <select
            value={employee}
            onChange={(event) => setEmployee(event.target.value)}
          >
            <option value="">Select employee</option>
            <option value="admin">System Admin</option>
          </select>

          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />

          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            <option value="">Select Timezone</option>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="UTC">UTC</option>
          </select>

          <button
            type="button"
            className="timesheets-attendance-go"
            onClick={handleGo}
          >
            Go
          </button>
        </div>

        <div className="timesheets-attendance-report">
          No record found
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminTimesheetsAttendance;