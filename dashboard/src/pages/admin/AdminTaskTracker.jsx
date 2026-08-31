import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminTaskTracker() {
  const [team, setTeam] = useState("");

  const [rows] = useState([]);

  const handleGo = () => {
    console.log({
      team,
    });
  };

  return (
    <DashboardLayout title="Task Tracker">
      <section className="admin-card task-tracker-card">

        <h2 className="task-tracker-title">
          Task tracker
        </h2>

        <div className="task-tracker-controls">
          <select
            value={team}
            onChange={(event) =>
              setTeam(event.target.value)
            }
          >
            <option value="">
              Select team
            </option>

            <option value="development">
              Development Team
            </option>

            <option value="testing">
              Testing Team
            </option>

            <option value="support">
              Support Team
            </option>
          </select>

          <button
            type="button"
            className="task-tracker-go-button"
            onClick={handleGo}
          >
            Go
          </button>
        </div>

        {/* STATUS LEGEND */}
        <div className="task-tracker-status-box">

          <div className="task-status-item">
            <span className="task-status-icon logged-in">
              ↪
            </span>

            <span>
              <strong>Logged in</strong>
              {" - "}
              Logged in yet to start timer
            </span>
          </div>

          <div className="task-status-item">
            <span className="task-status-icon away">
              L
            </span>

            <span>
              <strong>Away</strong>
              {" - "}
              Logged in and timer running in break time
            </span>
          </div>

          <div className="task-status-item">
            <span className="task-status-icon online">
              ✓
            </span>

            <span>
              <strong>Online</strong>
              {" - "}
              Logged in and timer running in work time
            </span>
          </div>

          <div className="task-status-item">
            <span className="task-status-icon offline">
              −
            </span>

            <span>
              <strong>Offline</strong>
              {" - "}
              Not logged in the timer
            </span>
          </div>

        </div>

        <h3 className="task-tracker-section-title">
          Task tracker
        </h3>

        <div className="task-tracker-table-wrapper">
          <table className="task-tracker-table">

            <thead>
              <tr>
                <th>Team name</th>
                <th>Employee name</th>
                <th>Client name</th>
                <th>Project name</th>
                <th>Task name</th>
                <th>Task tracker</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="task-tracker-empty"
                  >
                    No record found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.teamName}</td>
                    <td>{row.employeeName}</td>
                    <td>{row.clientName}</td>
                    <td>{row.projectName}</td>
                    <td>{row.taskName}</td>
                    <td>{row.trackerStatus}</td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

      </section>
    </DashboardLayout>
  );
}

export default AdminTaskTracker;