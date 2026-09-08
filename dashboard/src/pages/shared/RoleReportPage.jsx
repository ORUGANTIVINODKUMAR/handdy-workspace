import { useMemo, useState } from "react";
import { Clock3, FileSearch, Search } from "lucide-react";

import useAuth from "../../context/useAuth";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import {
  getMyAttendance,
  getMyTimeLogs,
  getTeamAttendance,
  getTeamTimeLogs,
} from "../../api/reportApi";
import TeamLeadSidebar from "../teamLead/TeamLeadSidebar";
import EmployeeSidebar from "../employee/EmployeeSidebar";
import HanddyDownloadCard from "../../components/dashboard/HanddyDownloadCard";
import ReportSummary from "../../components/dashboard/ReportSummary";
import PageHeader from "../../components/layout/PageHeader";

import "../../styles/adminReportPage.css";
import "../../styles/roleReportPage.css";

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const duration = (seconds = 0) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

const getIdleSeconds = (record) => {
  if (record.status === "stopped" && record.totalIdleSeconds !== undefined) {
    return record.totalIdleSeconds || 0;
  }

  const now = Date.now();
  return (record.pauses || []).reduce((total, pause) => {
    if (pause.reason !== "idle" || !pause.pausedAt) return total;
    const end = pause.resumedAt ? new Date(pause.resumedAt).getTime() : now;
    return total + Math.max(0, Math.floor((end - new Date(pause.pausedAt).getTime()) / 1000));
  }, 0);
};

function RoleReportPage({ title, description, mode = "time", scope = "team", showDesktopDownload = false }) {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState("");
  const isTeamLead = user?.role === "team_lead";
  const isTeamReport = isTeamLead && scope !== "personal";

  const totalSeconds = useMemo(() => records.reduce((sum, record) => sum + (record.totalWorkedSeconds || 0), 0), [records]);

  const runReport = async () => {
    try {
      setLoading(true);
      setHasRun(true);
      setError("");
      const params = { startDate: fromDate, endDate: toDate, limit: 100 };
      const data = mode === "attendance"
        ? isTeamReport ? await getTeamAttendance(params) : await getMyAttendance(params)
        : isTeamReport ? await getTeamTimeLogs(params) : await getMyTimeLogs(params);
      setRecords(mode === "attendance" ? data.attendance || [] : data.timeLogs || []);
    } catch (requestError) {
      setRecords([]);
      setError(getApiErrorMessage(requestError, "Unable to generate this report."));
    } finally {
      setLoading(false);
    }
  };

  const report = (
    <div className="admin-report-page role-report-page">
      <ReportSummary items={[
        { label: "Recorded time", value: hasRun ? duration(totalSeconds) : "—" },
        { label: "Timer records", value: hasRun ? records.length : "—" },
        { label: "Projects in report", value: hasRun ? new Set(records.map(record => record.project?._id).filter(Boolean)).size : "—" },
        { label: "Workspace", value: isTeamReport ? "Your team" : "Personal", help: user?.fullName || "Your employee account" },
      ]} />
      <section className="admin-report-filter card">
        <div><span className="admin-report-kicker">{isTeamReport ? "Team report" : "My report"}</span><h2>{title}</h2><p>{description}</p></div>
        <div className="admin-report-controls">
          <label>From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label>To<input type="date" min={fromDate} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <button type="button" onClick={runReport} disabled={loading}><Search size={16} />{loading ? "Loading…" : "Generate"}</button>
        </div>
      </section>
      <section className="admin-report-results card">
        <header><div><span className="admin-report-kicker">Results</span><h2>{records.length} records</h2></div>{mode === "time" && <strong><Clock3 size={16} />{duration(totalSeconds)}</strong>}</header>
        {error && <p className="admin-report-message error-message" role="alert">{error}</p>}
        {!error && !hasRun && <div className="admin-report-empty"><FileSearch size={26} /><strong>Your work, in one view</strong><span>Select a period and generate your timesheet to view recorded work.</span></div>}
        {!error && hasRun && records.length === 0 && <div className="admin-report-empty"><FileSearch size={26} /><strong>No records found</strong><span>No matching activity exists for the selected dates.</span></div>}
        {!error && mode === "time" && records.length > 0 && <div className="admin-report-table-wrap"><table><thead><tr>{isTeamReport && <th>Employee</th>}<th>Project</th><th>Task</th><th>Started</th><th>Worked</th><th>Idle</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}>{isTeamReport && <td>{record.employee?.fullName || "—"}</td>}<td>{record.project?.projectName || "—"}</td><td>{record.task?.taskName || "—"}</td><td>{new Date(record.startedAt).toLocaleString()}</td><td>{duration(record.totalWorkedSeconds)}</td><td>{duration(getIdleSeconds(record))}</td><td>{record.status}</td></tr>)}</tbody></table></div>}
        {!error && mode === "attendance" && records.length > 0 && <div className="admin-report-table-wrap"><table><thead><tr>{isTeamReport && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}>{isTeamReport && <td>{record.employee?.fullName || "—"}</td>}<td>{record.date}</td><td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "—"}</td><td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "—"}</td><td>{record.totalHours || 0}</td><td>{record.status}</td></tr>)}</tbody></table></div>}
      </section>
      {showDesktopDownload && user?.role === "employee" && <HanddyDownloadCard />}
    </div>
  );

  return isTeamLead
    ? <div className="tl-page"><TeamLeadSidebar /><div className="tl-main"><main className="tl-content"><PageHeader title={showDesktopDownload ? `Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}` : title} description={showDesktopDownload ? "Your work summary, timesheets and desktop workspace." : description} />{report}</main></div></div>
    : <div className="employee-page"><EmployeeSidebar /><div className="employee-main"><main className="employee-content"><PageHeader title={showDesktopDownload ? `Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}` : title} description={showDesktopDownload ? "Your work summary, timesheets and desktop workspace." : description} />{report}</main></div></div>;
}

export default RoleReportPage;
