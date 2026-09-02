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
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const getPauseSeconds = (record, reason) => {
  const now = Date.now();

  return (record.pauses || []).reduce((total, pause) => {
    if (!pause.pausedAt || (reason && pause.reason !== reason)) return total;
    const end = pause.resumedAt ? new Date(pause.resumedAt).getTime() : now;
    const start = new Date(pause.pausedAt).getTime();
    return total + Math.max(0, Math.floor((end - start) / 1000));
  }, 0);
};

const getWorkedSeconds = (record) => {
  if (record.status === "stopped") {
    return Math.max(0, Number(record.totalWorkedSeconds) || 0);
  }

  if (!record.startedAt) return 0;
  const end = record.stoppedAt ? new Date(record.stoppedAt).getTime() : Date.now();
  const elapsed = Math.max(0, Math.floor((end - new Date(record.startedAt).getTime()) / 1000));
  return Math.max(0, elapsed - getPauseSeconds(record));
};

const getIdleSeconds = (record) => {
  if (record.status === "stopped" && record.totalIdleSeconds !== undefined) {
    return Math.max(0, Number(record.totalIdleSeconds) || 0);
  }

  return getPauseSeconds(record, "idle");
};

const buildGroupedRows = (records, groupBy) => {
  const groups = new Map();

  records.forEach((record) => {
    const entity = groupBy === "employee" ? record.employee : record.project;
    const key = entity?._id || `unassigned-${groupBy}`;
    const label = groupBy === "employee"
      ? entity?.fullName || "Unassigned employee"
      : entity?.projectName || "Unassigned project";

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        sessions: 0,
        employees: new Set(),
        projects: new Set(),
        tasks: new Set(),
        workedSeconds: 0,
        idleSeconds: 0,
      });
    }

    const group = groups.get(key);
    group.sessions += 1;
    group.employees.add(record.employee?._id || "unassigned");
    group.projects.add(record.project?._id || "unassigned");
    group.tasks.add(record.task?._id || "unassigned");
    group.workedSeconds += getWorkedSeconds(record);
    group.idleSeconds += getIdleSeconds(record);
  });

  return [...groups.values()].sort(
    (first, second) => second.workedSeconds - first.workedSeconds
  );
};

function AdminReportPage({
  title,
  description,
  mode = "time",
  scope = "company",
  variant = "detailed",
  trackingLabel = "tracking activity",
  allowEmployeeFilter = scope === "company",
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
          allowEmployeeFilter
            ? getEmployees({ limit: 100 })
            : Promise.resolve({ employees: [] }),
          mode === "time"
            ? getAllProjects({ limit: 100 })
            : Promise.resolve({ projects: [] }),
        ]);
        setEmployees(employeeData.employees || []);
        setProjects(projectData.projects || []);
      } catch (requestError) {
        setError(
          getApiErrorMessage(requestError, "Unable to load report filters.")
        );
      }
    };

    void loadOptions();
  }, [allowEmployeeFilter, mode, scope]);

  const totalSeconds = useMemo(
    () => records.reduce((sum, record) => sum + getWorkedSeconds(record), 0),
    [records]
  );
  const totalIdleSeconds = useMemo(
    () => records.reduce((sum, record) => sum + getIdleSeconds(record), 0),
    [records]
  );
  const teamRows = useMemo(
    () => buildGroupedRows(records, "employee"),
    [records]
  );
  const projectRows = useMemo(
    () => buildGroupedRows(records, "project"),
    [records]
  );

  const resultCount = variant === "team"
    ? teamRows.length
    : variant === "project"
      ? projectRows.length
      : records.length;
  const resultLabel = variant === "team"
    ? "employees"
    : variant === "project"
      ? "projects"
      : "records";

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
      setRecords(
        mode === "attendance" ? data.attendance || [] : data.timeLogs || []
      );
    } catch (requestError) {
      setRecords([]);
      setError(
        getApiErrorMessage(requestError, "Unable to generate this report.")
      );
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
            {allowEmployeeFilter && mode !== "tracking" && (
              <select
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
                aria-label="Employee"
              >
                <option value="">All employees</option>
                {employees.map((item) => (
                  <option value={item._id} key={item._id}>{item.fullName}</option>
                ))}
              </select>
            )}
            {mode === "time" && (
              <select
                value={project}
                onChange={(event) => setProject(event.target.value)}
                aria-label="Project"
              >
                <option value="">All projects</option>
                {projects.map((item) => (
                  <option value={item._id} key={item._id}>{item.projectName}</option>
                ))}
              </select>
            )}
            <label>
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>
            <button type="button" onClick={runReport} disabled={loading}>
              <Search size={16} />{loading ? "Loading…" : "Generate"}
            </button>
          </div>
        </section>

        <section className="admin-report-results card">
          <header>
            <div>
              <span className="admin-report-kicker">Results</span>
              <h2>{resultCount} {resultLabel}</h2>
            </div>
            {mode === "time" && (
              <div className="admin-report-totals">
                <strong><Clock3 size={16} />Worked {formatDuration(totalSeconds)}</strong>
                <strong><Activity size={16} />Idle {formatDuration(totalIdleSeconds)}</strong>
              </div>
            )}
          </header>

          {error && (
            <p className="admin-report-message error-message" role="alert">{error}</p>
          )}
          {!error && mode === "tracking" && hasRun && (
            <div className="admin-report-empty">
              <Activity size={26} />
              <strong>No {trackingLabel} received</strong>
              <span>The current desktop timer does not collect this data yet.</span>
            </div>
          )}
          {!error && mode === "tracking" && !hasRun && (
            <div className="admin-report-empty">
              <FileSearch size={26} />
              <strong>Generate a report</strong>
              <span>Choose a date range to check for {trackingLabel}.</span>
            </div>
          )}
          {!error && mode !== "tracking" && hasRun && records.length === 0 && (
            <div className="admin-report-empty">
              <FileSearch size={26} />
              <strong>No records found</strong>
              <span>No matching data exists for the selected filters.</span>
            </div>
          )}

          {!error && mode === "time" && records.length > 0 && variant === "team" && (
            <div className="admin-report-table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Sessions</th><th>Projects</th><th>Tasks</th><th>Worked</th><th>Idle</th></tr></thead>
                <tbody>{teamRows.map((row) => (
                  <tr key={row.key}><td>{row.label}</td><td>{row.sessions}</td><td>{row.projects.size}</td><td>{row.tasks.size}</td><td>{formatDuration(row.workedSeconds)}</td><td>{formatDuration(row.idleSeconds)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {!error && mode === "time" && records.length > 0 && variant === "project" && (
            <div className="admin-report-table-wrap">
              <table>
                <thead><tr><th>Project</th><th>Sessions</th><th>Employees</th><th>Tasks</th><th>Worked</th><th>Idle</th></tr></thead>
                <tbody>{projectRows.map((row) => (
                  <tr key={row.key}><td>{row.label}</td><td>{row.sessions}</td><td>{row.employees.size}</td><td>{row.tasks.size}</td><td>{formatDuration(row.workedSeconds)}</td><td>{formatDuration(row.idleSeconds)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {!error && mode === "time" && records.length > 0 && variant === "detailed" && (
            <div className="admin-report-table-wrap">
              <table>
                <thead><tr>{scope === "company" && <th>Employee</th>}<th>Project</th><th>Task</th><th>Started</th><th>Finished</th><th>Worked</th><th>Idle</th><th>Status</th></tr></thead>
                <tbody>{records.map((record) => (
                  <tr key={record._id}>{scope === "company" && <td>{record.employee?.fullName || "—"}</td>}<td>{record.project?.projectName || "—"}</td><td>{record.task?.taskName || "—"}</td><td>{new Date(record.startedAt).toLocaleString()}</td><td>{record.stoppedAt ? new Date(record.stoppedAt).toLocaleString() : "Active"}</td><td>{formatDuration(getWorkedSeconds(record))}</td><td>{formatDuration(getIdleSeconds(record))}</td><td>{record.status}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {!error && mode === "attendance" && records.length > 0 && (
            <div className="admin-report-table-wrap">
              <table>
                <thead><tr>{scope === "company" && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Total hours</th><th>Status</th></tr></thead>
                <tbody>{records.map((record) => (
                  <tr key={record._id}>{scope === "company" && <td>{record.employee?.fullName || "—"}</td>}<td>{record.date}</td><td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "—"}</td><td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "—"}</td><td>{record.totalHours || 0}</td><td>{record.status}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminReportPage;
