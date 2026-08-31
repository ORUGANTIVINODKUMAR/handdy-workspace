import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminProjectWorkDetails() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [project, setProject] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timezone, setTimezone] = useState("");

  const [rows] = useState([]);

  const handleGo = () => {
    console.log({
      team,
      employee,
      project,
      fromDate,
      toDate,
      timezone,
    });
  };

  return (
    <DashboardLayout title="Project Work Details">
      <section className="admin-card project-work-card">
        <h2 className="project-work-title">
          Project work details
        </h2>

        <p className="timesheet-help-text">
          Please select team, employee, project and date and click Go to generate
          the report
        </p>

        <div className="project-work-controls">
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

          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
          >
            <option value="">Select project</option>
            <option value="project-1">
              Employee Time & Attendance System
            </option>
          </select>

          <div className="project-work-date">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="project-work-date">
            <label>To</label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
            />
          </div>

          <select
            value={timezone}
            onChange={(event) =>
              setTimezone(event.target.value)
            }
          >
            <option value="">
              Select Timezone
            </option>

            <option value="Asia/Kolkata">
              Asia/Kolkata
            </option>

            <option value="UTC">
              UTC
            </option>
          </select>

          <button
            type="button"
            className="project-work-go-button"
            onClick={handleGo}
          >
            Go
          </button>
        </div>

        <div className="project-work-report">
          <div className="project-work-report-title">
            Project Work Report
          </div>

          <div className="project-work-table-wrapper">
            <table className="project-work-table">
              <thead>
                <tr>
                  <th>Employee name</th>
                  <th>Project name</th>
                  <th>
                    Total hours worked
                    <small> (hh:mm:ss)</small>
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="project-work-empty"
                    >
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.employeeName}</td>
                      <td>{row.projectName}</td>
                      <td>{row.totalHoursWorked}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminProjectWorkDetails;