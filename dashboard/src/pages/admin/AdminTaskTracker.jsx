import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import useDataRefresh from "../../hooks/useDataRefresh";

const trackerStatus = (log) => log.status === "running" ? "Online" : "Away";

function AdminTaskTracker() {
  const [team, setTeam] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const loadRows = useCallback(async () => {
    try {
      setError("");
      const { data } = await axiosInstance.get("/time-logs/live");
      setRows(data.timeLogs || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load live timers."));
    }
  }, []);
  useEffect(() => { void loadRows(); }, [loadRows]);
  useDataRefresh(loadRows, 20_000);

  const teams = useMemo(() => [...new Set(rows.map((row) => row.employee?.team?.teamName).filter(Boolean))].sort(), [rows]);
  const visibleRows = team ? rows.filter((row) => row.employee?.team?.teamName === team) : rows;

  return <DashboardLayout title="Task Tracker">
    <section className="admin-card task-tracker-card">
      <h2 className="task-tracker-title">Live task tracker</h2>
      <div className="task-tracker-controls">
        <select value={team} onChange={(event) => setTeam(event.target.value)} aria-label="Filter live timers by team">
          <option value="">All teams</option>
          {teams.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button type="button" className="task-tracker-go-button" onClick={loadRows}>Refresh</button>
      </div>
      {error && <p className="admin-error-box" role="alert">{error}</p>}
      <div className="task-tracker-status-box">
        <div className="task-status-item"><span className="task-status-icon online">✓</span><span><strong>Online</strong> - work timer running</span></div>
        <div className="task-status-item"><span className="task-status-icon away">B</span><span><strong>Away</strong> - timer paused or on break</span></div>
      </div>
      <div className="task-tracker-table-wrapper">
        <table className="task-tracker-table"><thead><tr><th>Team name</th><th>Employee name</th><th>Client name</th><th>Project name</th><th>Task name</th><th>Status</th></tr></thead>
          <tbody>{visibleRows.length === 0 ? <tr><td colSpan="6" className="task-tracker-empty">No active timers</td></tr> : visibleRows.map((row) => <tr key={row._id}>
            <td>{row.employee?.team?.teamName || "-"}</td><td>{row.employee?.fullName || "-"}</td><td>{row.project?.clientName || "-"}</td><td>{row.project?.projectName || "-"}</td><td>{row.task?.taskName || "-"}</td><td>{trackerStatus(row)}</td>
          </tr>)}</tbody></table>
      </div>
    </section>
  </DashboardLayout>;
}

export default AdminTaskTracker;
