import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import useDataRefresh from "../../hooks/useDataRefresh";
import "../../styles/teamLeadTaskTracker.css";

function TeamLeadTaskTracker() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const loadRows = useCallback(async () => {
    try {
      setError("");
      const { data } = await axiosInstance.get("/time-logs/live");
      setRows(data.timeLogs || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load your team's live timers."));
    }
  }, []);
  useEffect(() => { void loadRows(); }, [loadRows]);
  useDataRefresh(loadRows, 30_000);

  return <DashboardLayout title="Task Tracker"><section className="tl-task-tracker-card">
    <div className="tl-task-tracker-controls"><h2>Live team timers</h2><button type="button" className="tl-task-tracker-go" onClick={loadRows}>Refresh</button></div>
    {error && <p className="status-message error-message" role="alert">{error}</p>}
    <div className="tl-task-table-wrapper"><table className="tl-task-table"><thead><tr><th>Team name</th><th>Employee name</th><th>Client name</th><th>Project name</th><th>Task name</th><th>Status</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan="6" className="tl-task-empty">No active timers</td></tr> : rows.map((row) => <tr key={row._id}>
        <td>{row.employee?.team?.teamName || "-"}</td><td>{row.employee?.fullName || "-"}</td><td>{row.project?.clientName || "-"}</td><td>{row.project?.projectName || "-"}</td><td>{row.task?.taskName || "-"}</td><td>{row.status === "running" ? "Online" : "Away"}</td>
      </tr>)}</tbody></table></div>
  </section></DashboardLayout>;
}

export default TeamLeadTaskTracker;
