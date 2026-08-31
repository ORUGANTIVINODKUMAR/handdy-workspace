import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminProjectHours() {
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timezone, setTimezone] = useState("");

  return (
    <DashboardLayout title="Project Hours">
      <section className="admin-card project-hours-card">
        <h2 className="project-hours-title">
          Report based on the client, project and task
        </h2>

        <p className="timesheet-help-text">
          Please select client, project, task and date. Then click Go to generate your report
        </p>

        <div className="project-hours-controls">
          <select
            value={client}
            onChange={(event) => setClient(event.target.value)}
          >
            <option value="">Select client</option>
            <option value="internal">Internal Company</option>
            <option value="client-a">Client A</option>
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

          <select
            value={task}
            onChange={(event) => setTask(event.target.value)}
          >
            <option value="">Select task</option>
            <option value="task-1">Development</option>
            <option value="task-2">Testing</option>
          </select>

          <div className="project-hours-date-control">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="project-hours-date-control">
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
            <option value="">Select Timezone</option>
            <option value="Asia/Kolkata">
              Asia/Kolkata
            </option>
            <option value="UTC">UTC</option>
          </select>

          <button
            type="button"
            className="project-hours-go-button"
          >
            Go
          </button>
        </div>

        <div className="project-hours-empty-report">
          No record found
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminProjectHours;