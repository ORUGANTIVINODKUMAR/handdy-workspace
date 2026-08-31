import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, FileSearch, Search } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { getEmployees } from "../../api/employeeApi";
import { getAllProjects } from "../../api/projectApi";
import {
  getAdminAttendance,
  getAdminTimeLogs,
  getMyAttendance,
  getMyTimeLogs,
} from "../../api/reportApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

import "../../styles/adminReportPage.css";

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

const formatDuration = (seconds = 0) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

function AdminReportPage({
  title,
  description,
  mode = "time",
  scope = "company",
  trackingLabel = "tracking activity",
}) {
  const [fromDate, setFromDate] = useState(localDate);
  const [toDate, setToDate] = useState(localDate);
  const [employee, setEmployee] = useState("");
  const [project, setProject] = useState("");
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "tracking") return;

    const loadOptions = async () => {
      try {
        const [employeeData, projectData] = await Promise.all([
          scope === "company" ? getEmployees({ limit: 100 }) : Promise.resolve({ employees: [] }),
          mode === "time" ? getAllProjects({ limit: 100 }) : Promise.resolve({ projects: [] }),
        ]);
        setEmployees(employeeData.employees || []);
        setProjects(projectData.projects || []);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load report filters."));
      }
    };

    void loadOptions();
  }, [mode, scope]);

  const totalSeconds = useMemo(
    () => records.reduce((sum, record) => sum + (record.totalWorkedSeconds || 0), 0),
    [records],
  );

  const runReport = async () => {
    setHasRun(true);
    setError("");

    if (mode === "tracking") {
      setRecords([]);
      return;
    }

    try {
      setLoading(true);
      const params = {
        startDate: fromDate,
        endDate: toDate,
        employee: employee || undefined,
        project: project || undefined,
        limit: 100,
      };
      const data = mode === "attendance"
        ? scope === "personal"
          ? await getMyAttendance(params)
          : await getAdminAttendance(params)
        : scope === "personal"
          ? await getMyTimeLogs(params)
          : await getAdminTimeLogs(params);
      setRecords(mode === "attendance" ? data.attendance || [] : data.timeLogs || []);
    } catch (requestError) {
      setRecords([]);
      setError(getApiErrorMessage(requestError, "Unable to generate this report."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title={title}>
      <div className="admin-report-page">
        <section className="admin-report-filter card">
          <div>
            <span className="admin-report-kicker">Report filters</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <div className="admin-report-controls">
            {scope === "company" && mode !== "tracking" && (
              <select value={employee} onChange={(event) => setEmployee(event.target.value)} aria-label="Employee">
                <option value="">All employees</option>
                {employees.map((item) => <option value={item._id} key={item._id}>{item.fullName}</option>)}
              </select>
            )}
            {mode === "time" && (
              <select value={project} onChange={(event) => setProject(event.target.value)} aria-label="Project">
                <option value="">All projects</option>
                {projects.map((item) => <option value={item._id} key={item._id}>{item.projectName}</option>)}
              </select>
            )}
            <label>From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
            <label>To<input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} /></label>
            <button type="button" onClick={runReport} disabled={loading}>
              <Search size={16} />{loading ? "Loading…" : "Generate"}
            </button>
          </div>
        </section>

        <section className="admin-report-results card">
          <header>
            <div><span className="admin-report-kicker">Results</span><h2>{records.length} records</h2></div>
            {mode === "time" && <strong><Clock3 size={16} />{formatDuration(totalSeconds)}</strong>}
          </header>

          {error && <p className="admin-report-message error-message" role="alert">{error}</p>}
          {!error && mode === "tracking" && hasRun && (
            <div className="admin-report-empty"><Activity size={26} /><strong>No {trackingLabel} received</strong><span>The current desktop timer does not collect this data yet. This report will populate after the Electron tracking module is added.</span></div>
          )}
          {!error && mode === "tracking" && !hasRun && (
            <div className="admin-report-empty"><FileSearch size={26} /><strong>Generate a report</strong><span>Choose a date range to check for {trackingLabel}.</span></div>
          )}
          {!error && mode !== "tracking" && hasRun && records.length === 0 && (
            <div className="admin-report-empty"><FileSearch size={26} /><strong>No records found</strong><span>No matching data exists for the selected filters.</span></div>
          )}

          {!error && mode === "time" && records.length > 0 && (
            <div className="admin-report-table-wrap"><table><thead><tr><th>Employee</th><th>Project</th><th>Task</th><th>Started</th><th>Worked</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td>{record.employee?.fullName || "My activity"}</td><td>{record.project?.projectName || "—"}</td><td>{record.task?.taskName || "—"}</td><td>{new Date(record.startedAt).toLocaleString()}</td><td>{formatDuration(record.totalWorkedSeconds)}</td><td>{record.status}</td></tr>)}</tbody></table></div>
          )}

          {!error && mode === "attendance" && records.length > 0 && (
            <div className="admin-report-table-wrap"><table><thead><tr>{scope === "company" && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Total hours</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}>{scope === "company" && <td>{record.employee?.fullName || "-"}</td>}<td>{record.date}</td><td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-"}</td><td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-"}</td><td>{record.totalHours || 0}</td><td>{record.status}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminReportPage;
