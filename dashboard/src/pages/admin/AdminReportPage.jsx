import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock3, FileDown, FileSearch, Search, Sheet } from "lucide-react";
import { useLocation } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { getAllEmployees } from "../../api/employeeApi";
import { getAllActiveProjects } from "../../api/projectApi";
import { getAllActiveTasksByProject } from "../../api/taskApi";
import {
  getAdminAttendance,
  getAdminTimeLogs,
  getMyAttendance,
  getMyTimeLogs,
} from "../../api/reportApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { exportReportExcel, exportReportPdf } from "../../utils/reportExport";
import useDataRefresh from "../../hooks/useDataRefresh";
import { buildTimeLogTimeline, sumTimelineSeconds } from "../../utils/timeLogTimeline";
import { getIdleSeconds, getWorkedSeconds, localDate } from "../../utils/timeLogReportHelpers";
import { readReportState, writeReportState } from "../../utils/reportPersistence";
import useAuth from "../../context/useAuth";

import "../../styles/adminReportPage.css";
import ReportSummary from "../../components/dashboard/ReportSummary";

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
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
  const { pathname } = useLocation();
  const { user } = useAuth();
  const reportStorageKey = `crm-report:${user?._id || user?.email || "user"}:${pathname}`;
  const [savedReportState] = useState(() => readReportState(reportStorageKey));
  const restoredReportRef = useRef(false);
  const latestReportRequestRef = useRef(0);
  const pendingReportRequestsRef = useRef(0);
  const [fromDate, setFromDate] = useState(() => savedReportState.fromDate || localDate());
  const [toDate, setToDate] = useState(() => savedReportState.toDate || localDate());
  const [employee, setEmployee] = useState(() => savedReportState.employee || "");
  const [project, setProject] = useState(() => savedReportState.project || "");
  const [task, setTask] = useState(() => savedReportState.task || "");
  // Snapshot of the filters that were active when "Generate" last succeeded.
  // The silent background poll must replay this snapshot, not whatever is
  // currently sitting in the (possibly half-edited) filter inputs.
  const appliedFiltersRef = useRef({
    fromDate: savedReportState.fromDate || localDate(),
    toDate: savedReportState.toDate || localDate(),
    employee: savedReportState.employee || "",
    project: savedReportState.project || "",
    task: savedReportState.task || "",
  });
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(() => Boolean(savedReportState.hasRun));
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (mode === "tracking") return;

    const loadOptions = async () => {
      try {
        const [employeeData, projectData] = await Promise.all([
          allowEmployeeFilter
            ? getAllEmployees()
            : Promise.resolve([]),
          mode === "time"
            ? getAllActiveProjects()
            : Promise.resolve([]),
        ]);
        setEmployees(employeeData);
        setProjects(projectData);
      } catch (requestError) {
        setError(
          getApiErrorMessage(requestError, "Unable to load report filters.")
        );
      }
    };

    void loadOptions();
  }, [allowEmployeeFilter, mode, scope]);

  useEffect(() => {
    let active = true;

    if (mode !== "time" || !project) {
      setTasks([]);
      setTasksLoading(false);
      return () => { active = false; };
    }

    const loadTasks = async () => {
      setTasksLoading(true);
      try {
        const nextTasks = await getAllActiveTasksByProject(project);
        if (!active) return;
        setTasks(nextTasks);
        setTask((currentTask) => currentTask && !nextTasks.some((item) => item._id === currentTask)
          ? ""
          : currentTask);
      } catch (requestError) {
        if (!active) return;
        setTasks([]);
        setTask("");
        setError(getApiErrorMessage(requestError, "Unable to load tasks for this project."));
      } finally {
        if (active) setTasksLoading(false);
      }
    };

    void loadTasks();
    return () => { active = false; };
  }, [mode, project]);

  const totalSeconds = useMemo(
    () => records.reduce((sum, record) => sum + getWorkedSeconds(record), 0),
    [records]
  );
  const totalIdleSeconds = useMemo(
    () => records.reduce((sum, record) => sum + getIdleSeconds(record), 0),
    [records]
  );
  const totalBreakSeconds = useMemo(
    () => sumTimelineSeconds(records, "break"),
    [records],
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

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (silent && pendingReportRequestsRef.current > 0) return;
    const requestId = ++latestReportRequestRef.current;
    const isCurrent = () => latestReportRequestRef.current === requestId;

    // Silent (background) refreshes must replay the filters captured the
    // last time "Generate" succeeded, never the live (possibly half-edited)
    // filter inputs, so in-progress edits never silently change the table.
    const activeFilters = silent
      ? appliedFiltersRef.current
      : { fromDate, toDate, employee, project, task };

    if (!silent) {
      setHasRun(true);
      setError("");
    }

    if (!activeFilters.fromDate || !activeFilters.toDate || activeFilters.toDate < activeFilters.fromDate) {
      if (!silent) {
        setRecords([]);
        setError("Select a valid From and To date.");
      }
      return;
    }

    if (mode === "tracking") {
      if (!silent) setRecords([]);
      return;
    }

    pendingReportRequestsRef.current += 1;
    try {
      if (!silent) setLoading(true);
      const params = {
        startDate: activeFilters.fromDate,
        endDate: activeFilters.toDate,
        employee: activeFilters.employee || undefined,
        project: activeFilters.project || undefined,
        task: activeFilters.task || undefined,
      };
      const data = mode === "attendance"
        ? scope === "personal"
          ? await getMyAttendance(params)
          : await getAdminAttendance(params)
        : scope === "personal"
          ? await getMyTimeLogs(params)
          : await getAdminTimeLogs(params);

      if (!isCurrent()) return;
      setRecords(
        mode === "attendance" ? data.attendance || [] : data.timeLogs || []
      );
      if (!silent) appliedFiltersRef.current = activeFilters;
    } catch (requestError) {
      if (!isCurrent()) return;
      if (!silent) {
        setRecords([]);
        setError(
          getApiErrorMessage(requestError, "Unable to generate this report.")
        );
      }
    } finally {
      pendingReportRequestsRef.current -= 1;
      if (isCurrent() && !silent) setLoading(false);
    }
  }, [employee, fromDate, mode, project, scope, task, toDate]);

  const runReport = () => loadReport();
  useEffect(() => {
    writeReportState(reportStorageKey, {
      fromDate,
      toDate,
      employee,
      project,
      task,
      hasRun,
    });
  }, [employee, fromDate, hasRun, project, reportStorageKey, task, toDate]);

  useEffect(() => {
    if (restoredReportRef.current) return;
    restoredReportRef.current = true;
    if (savedReportState.hasRun) void loadReport();
  }, [loadReport, savedReportState.hasRun]);

  useDataRefresh(() => {
    if (hasRun) return loadReport({ silent: true });
    return undefined;
  }, 5_000);

  const getExportData = () => {
    if (mode === "attendance") {
      const columns = [
        ...(scope === "company" ? ["Employee"] : []),
        "Date", "Check in", "Check out", "Total hours", "Status",
      ];
      const rows = records.map((record) => [
        ...(scope === "company" ? [record.employee?.fullName || "-"] : []),
        record.date || "-",
        record.checkIn ? new Date(record.checkIn).toLocaleString() : "-",
        record.checkOut ? new Date(record.checkOut).toLocaleString() : "-",
        Number(record.totalHours) || 0,
        record.status || "-",
      ]);
      return { columns, rows };
    }

    if (variant === "team") {
      return {
        columns: ["Employee", "Sessions", "Projects", "Tasks", "Worked", "Idle"],
        rows: teamRows.map((row) => [
          row.label, row.sessions, row.projects.size, row.tasks.size,
          formatDuration(row.workedSeconds), formatDuration(row.idleSeconds),
        ]),
      };
    }

    if (variant === "project") {
      return {
        columns: ["Project", "Sessions", "Employees", "Tasks", "Worked", "Idle"],
        rows: projectRows.map((row) => [
          row.label, row.sessions, row.employees.size, row.tasks.size,
          formatDuration(row.workedSeconds), formatDuration(row.idleSeconds),
        ]),
      };
    }

    return {
      columns: [
        ...(scope === "company" ? ["Employee"] : []),
        "Entry type", "Project", "Task", "Started", "Finished", "Duration", "Idle", "Status", "Note",
      ],
      rows: records.flatMap((record) => {
        const employeeCell = scope === "company" ? [record.employee?.fullName || "-"] : [];
        return buildTimeLogTimeline(record).map((entry) => [
          ...employeeCell,
          entry.type === "break" ? "Break" : entry.type === "idle" ? "Idle" : "Work",
          record.project?.projectName || "-",
          entry.type === "work" ? `${record.task?.taskName || "Task"} - Work ${entry.sequence}` : `${entry.type === "break" ? "Break" : "Idle"} ${entry.sequence}`,
          new Date(entry.start).toLocaleString(),
          entry.end ? new Date(entry.end).toLocaleString() : "In progress",
          formatDuration(entry.durationSeconds),
          entry.type === "idle" ? formatDuration(entry.durationSeconds) : "-",
          entry.isOpen ? (entry.type === "break" ? "On break" : entry.type === "idle" ? "Idle" : "Running") : "Completed",
          entry.type === "work" ? record.note || "-" : "-",
        ]);
      }),
    };
  };

  const exportCurrentReport = async (format) => {
    if (!hasRun || records.length === 0 || exporting) return;
    setExporting(format);
    setExportError("");
    try {
      const { columns, rows } = getExportData();
      const exportOptions = {
        title,
        fromDate,
        toDate,
        columns,
        rows,
        summary: [
          { label: "Records", value: records.length },
          ...(mode === "time" ? [
            { label: "Worked", value: formatDuration(totalSeconds) },
            { label: "Break", value: formatDuration(totalBreakSeconds) },
            { label: "Idle", value: formatDuration(totalIdleSeconds) },
          ] : []),
        ],
      };
      if (format === "excel") await exportReportExcel(exportOptions);
      else await exportReportPdf(exportOptions);
    } catch (exportRequestError) {
      console.error("Report export failed:", exportRequestError);
      setExportError(`Unable to export ${format === "excel" ? "Excel" : "PDF"}. Please try again.`);
    } finally {
      setExporting("");
    }
  };

  return (
    <DashboardLayout title={title}>
      <div className="admin-report-page">
        <ReportSummary items={mode === "time" ? [
          { label: "Records", value: hasRun ? records.length : "—" },
          { label: "Worked time", value: hasRun ? formatDuration(totalSeconds) : "—" },
          { label: "Break time", value: hasRun ? formatDuration(totalBreakSeconds) : "—", help: "Intentional timer breaks" },
          { label: "Idle time", value: hasRun ? formatDuration(totalIdleSeconds) : "—" },
        ] : [
          { label: "Records", value: hasRun ? records.length : "—" },
          { label: "Report scope", value: scope === "personal" ? "Personal" : "Company", help: "Access follows your role" },
        ]} />
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
                onChange={(event) => {
                  setProject(event.target.value);
                  setTask("");
                  setError("");
                }}
                aria-label="Project"
              >
                <option value="">All projects</option>
                {projects.map((item) => (
                  <option value={item._id} key={item._id}>{item.projectName}</option>
                ))}
              </select>
            )}
            {mode === "time" && (
              <select
                value={task}
                onChange={(event) => setTask(event.target.value)}
                aria-label="Task"
                disabled={!project || tasksLoading}
              >
                <option value="">
                  {!project ? "Select project first" : tasksLoading ? "Loading tasks..." : "All tasks"}
                </option>
                {tasks.map((item) => (
                  <option value={item._id} key={item._id}>{item.taskName}</option>
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
            <div className="admin-report-header-actions">
              {mode === "time" && (
                <div className="admin-report-totals">
                  <strong><Clock3 size={16} />Worked {formatDuration(totalSeconds)}</strong>
                  <strong className="admin-report-break-total"><Clock3 size={16} />Break {formatDuration(totalBreakSeconds)}</strong>
                  <strong><Activity size={16} />Idle {formatDuration(totalIdleSeconds)}</strong>
                </div>
              )}
              <div className="admin-report-export-actions" aria-label="Export report">
                <button
                  type="button"
                  className="report-export-button excel"
                  onClick={() => exportCurrentReport("excel")}
                  disabled={!hasRun || records.length === 0 || Boolean(exporting)}
                >
                  <Sheet size={16} />
                  {exporting === "excel" ? "Exporting..." : "Export Excel"}
                </button>
                <button
                  type="button"
                  className="report-export-button pdf"
                  onClick={() => exportCurrentReport("pdf")}
                  disabled={!hasRun || records.length === 0 || Boolean(exporting)}
                >
                  <FileDown size={16} />
                  {exporting === "pdf" ? "Exporting..." : "Export PDF"}
                </button>
              </div>
            </div>
          </header>

          {exportError && <p className="admin-report-message error-message" role="alert">{exportError}</p>}
          {error && (
            <p className="admin-report-message error-message" role="alert">{error}</p>
          )}
          {!error && !hasRun && mode !== "tracking" && <div className="admin-report-empty"><FileSearch size={26} /><strong>Your report starts here</strong><span>Choose your filters, then generate a report to see recorded activity.</span></div>}
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
                <thead><tr>{scope === "company" && <th>Employee</th>}<th>Project</th><th>Task / segment</th><th>Started</th><th>Finished</th><th>Duration</th><th>Idle</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>{records.map((record) => (
                  <Fragment key={record._id}>
                    {buildTimeLogTimeline(record).map((entry) => (
                      <tr className={`report-timeline-row report-${entry.type}-row`} key={`${record._id}-${entry.type}-${entry.sequence}`}>
                        {scope === "company" && <td>{record.employee?.fullName || "—"}</td>}
                        <td><div className="report-entry-project"><span className={`report-entry-badge ${entry.type}`}>{entry.type}</span>{entry.type === "work" && <span>{record.project?.projectName || "—"}</span>}</div></td>
                        <td>{entry.type === "work" ? `${record.task?.taskName || "Task"} · Work ${entry.sequence}` : `${entry.type === "break" ? "Break" : "Idle"} ${entry.sequence}`}</td>
                        <td><strong>{new Date(entry.start).toLocaleString()}</strong></td>
                        <td><strong>{entry.end ? new Date(entry.end).toLocaleString() : "In progress"}</strong></td>
                        <td>{formatDuration(entry.durationSeconds)}</td>
                        <td>{entry.type === "idle" ? formatDuration(entry.durationSeconds) : "—"}</td>
                        <td>{entry.isOpen ? (entry.type === "break" ? "On break" : entry.type === "idle" ? "Idle" : "Running") : "Completed"}</td>
                        <td className="report-entry-note">{entry.type === "work" ? record.note || "—" : "—"}</td>
                      </tr>
                    ))}
                  </Fragment>
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
