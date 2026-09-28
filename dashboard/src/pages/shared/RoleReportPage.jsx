import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, FileSearch, Search } from "lucide-react";
import { useLocation } from "react-router-dom";

import useAuth from "../../context/useAuth";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import {
  getMyAttendance,
  getMyTimeLogs,
  getTeamAttendance,
  getTeamTimeLogs,
} from "../../api/reportApi";
import { getAllActiveProjects } from "../../api/projectApi";
import { getAllActiveTasksByProject } from "../../api/taskApi";
import TeamLeadSidebar from "../teamLead/TeamLeadSidebar";
import EmployeeSidebar from "../employee/EmployeeSidebar";
import ReportSummary from "../../components/dashboard/ReportSummary";
import PageHeader from "../../components/layout/PageHeader";
import useDataRefresh from "../../hooks/useDataRefresh";
import { buildTimeLogTimeline, sumTimelineSeconds } from "../../utils/timeLogTimeline";
import { getWorkedSeconds, localDate as today } from "../../utils/timeLogReportHelpers";
import { readReportState, writeReportState } from "../../utils/reportPersistence";

import "../../styles/adminReportPage.css";
import "../../styles/roleReportPage.css";

const duration = (seconds = 0) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

function RoleReportPage({ title, description, mode = "time", scope = "team", showDesktopDownload = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const reportStorageKey = `crm-report:${user?._id || user?.email || "user"}:${pathname}`;
  const [savedReportState] = useState(() => readReportState(reportStorageKey));
  const restoredReportRef = useRef(false);
  const latestReportRequestRef = useRef(0);
  const pendingReportRequestsRef = useRef(0);
  const [fromDate, setFromDate] = useState(() => savedReportState.fromDate || today());
  const [toDate, setToDate] = useState(() => savedReportState.toDate || today());
  const [project, setProject] = useState(() => savedReportState.project || "");
  const [task, setTask] = useState(() => savedReportState.task || "");
  // Snapshot of the filters that were active when "Generate" last succeeded.
  // The silent background poll must replay this snapshot, not whatever is
  // currently sitting in the (possibly half-edited) filter inputs.
  const appliedFiltersRef = useRef({
    fromDate: savedReportState.fromDate || today(),
    toDate: savedReportState.toDate || today(),
    project: savedReportState.project || "",
    task: savedReportState.task || "",
  });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(() => Boolean(savedReportState.hasRun));
  const [error, setError] = useState("");
  const isTeamLead = user?.role === "team_lead";
  const isTeamReport = isTeamLead && scope !== "personal";

  useEffect(() => {
    if (mode !== "time") return;
    const loadProjects = async () => {
      try {
        setProjects(await getAllActiveProjects());
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load report projects."));
      }
    };
    void loadProjects();
  }, [mode]);

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

  const totalSeconds = useMemo(() => records.reduce((sum, record) => sum + getWorkedSeconds(record), 0), [records]);
  const totalBreakSeconds = useMemo(
    () => sumTimelineSeconds(records, "break"),
    [records],
  );

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (silent && pendingReportRequestsRef.current > 0) return;
    const requestId = ++latestReportRequestRef.current;
    const isCurrent = () => latestReportRequestRef.current === requestId;

    // Silent (background) refreshes must replay the filters captured the
    // last time "Generate" succeeded, never the live (possibly half-edited)
    // filter inputs, so in-progress edits never silently change the table.
    const activeFilters = silent
      ? appliedFiltersRef.current
      : { fromDate, toDate, project, task };

    if (!silent) setHasRun(true);

    if (!activeFilters.fromDate || !activeFilters.toDate || activeFilters.toDate < activeFilters.fromDate) {
      if (!silent) {
        setRecords([]);
        setError("Select a valid From and To date.");
      }
      return;
    }

    pendingReportRequestsRef.current += 1;
    try {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      const params = {
        startDate: activeFilters.fromDate,
        endDate: activeFilters.toDate,
        project: activeFilters.project || undefined,
        task: activeFilters.task || undefined,
      };
      const data = mode === "attendance"
        ? isTeamReport ? await getTeamAttendance(params) : await getMyAttendance(params)
        : isTeamReport ? await getTeamTimeLogs(params) : await getMyTimeLogs(params);

      if (!isCurrent()) return;
      setRecords(mode === "attendance" ? data.attendance || [] : data.timeLogs || []);
      if (!silent) appliedFiltersRef.current = activeFilters;
    } catch (requestError) {
      if (!isCurrent()) return;
      if (!silent) {
        setRecords([]);
        setError(getApiErrorMessage(requestError, "Unable to generate this report."));
      }
    } finally {
      pendingReportRequestsRef.current -= 1;
      if (isCurrent() && !silent) setLoading(false);
    }
  }, [fromDate, isTeamReport, mode, project, task, toDate]);

  const runReport = () => loadReport();
  useEffect(() => {
    writeReportState(reportStorageKey, { fromDate, toDate, project, task, hasRun });
  }, [fromDate, hasRun, project, reportStorageKey, task, toDate]);

  useEffect(() => {
    if (restoredReportRef.current) return;
    restoredReportRef.current = true;
    if (savedReportState.hasRun) void loadReport();
  }, [loadReport, savedReportState.hasRun]);

  useDataRefresh(() => {
    if (hasRun) return loadReport({ silent: true });
    return undefined;
  }, 5_000);

  const report = (
    <div className="admin-report-page role-report-page">
      <ReportSummary items={[
        { label: "Recorded time", value: hasRun ? duration(totalSeconds) : "—" },
        { label: "Break time", value: hasRun ? duration(totalBreakSeconds) : "—", help: "Intentional timer breaks" },
        { label: "Timer records", value: hasRun ? records.length : "—" },
        { label: "Workspace", value: isTeamReport ? "Your team" : "Personal", help: user?.fullName || "Your employee account" },
      ]} />
      <section className="admin-report-filter card">
        <div><span className="admin-report-kicker">{isTeamReport ? "Team report" : "My report"}</span><h2>{title}</h2><p>{description}</p></div>
        <div className="admin-report-controls">
          {mode === "time" && <select value={project} onChange={(event) => { setProject(event.target.value); setTask(""); setError(""); }} aria-label="Project"><option value="">All projects</option>{projects.map((item) => <option value={item._id} key={item._id}>{item.projectName}</option>)}</select>}
          {mode === "time" && <select value={task} onChange={(event) => setTask(event.target.value)} aria-label="Task" disabled={!project || tasksLoading}><option value="">{!project ? "Select project first" : tasksLoading ? "Loading tasks..." : "All tasks"}</option>{tasks.map((item) => <option value={item._id} key={item._id}>{item.taskName}</option>)}</select>}
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
        {!error && mode === "time" && records.length > 0 && <div className="admin-report-table-wrap"><table><thead><tr>{isTeamReport && <th>Employee</th>}<th>Project</th><th>Task / segment</th><th>Started</th><th>Finished</th><th>Duration</th><th>Idle</th><th>Status</th><th>Note</th></tr></thead><tbody>{records.map((record) => <Fragment key={record._id}>{buildTimeLogTimeline(record).map((entry) => <tr className={`report-timeline-row report-${entry.type}-row`} key={`${record._id}-${entry.type}-${entry.sequence}`}>{isTeamReport && <td>{record.employee?.fullName || "—"}</td>}<td><div className="report-entry-project"><span className={`report-entry-badge ${entry.type}`}>{entry.type}</span>{entry.type === "work" && <span>{record.project?.projectName || "—"}</span>}</div></td><td>{entry.type === "work" ? `${record.task?.taskName || "Task"} · Work ${entry.sequence}` : `${entry.type === "break" ? "Break" : "Idle"} ${entry.sequence}`}</td><td><strong>{new Date(entry.start).toLocaleString()}</strong></td><td><strong>{entry.end ? new Date(entry.end).toLocaleString() : "In progress"}</strong></td><td>{duration(entry.durationSeconds)}</td><td>{entry.type === "idle" ? duration(entry.durationSeconds) : "—"}</td><td>{entry.isOpen ? (entry.type === "break" ? "On break" : entry.type === "idle" ? "Idle" : "Running") : "Completed"}</td><td className="report-entry-note">{entry.type === "work" ? record.note || "—" : "—"}</td></tr>)}</Fragment>)}</tbody></table></div>}
        {!error && mode === "attendance" && records.length > 0 && <div className="admin-report-table-wrap"><table><thead><tr>{isTeamReport && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}>{isTeamReport && <td>{record.employee?.fullName || "—"}</td>}<td>{record.date}</td><td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "—"}</td><td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "—"}</td><td>{record.totalHours || 0}</td><td>{record.status}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );

  return isTeamLead
    ? <div className="tl-page"><TeamLeadSidebar /><div className="tl-main"><main className="tl-content"><PageHeader title={showDesktopDownload ? `Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}` : title} description={showDesktopDownload ? "Your work summary, timesheets and desktop workspace." : description} />{report}</main></div></div>
    : <div className="employee-page"><EmployeeSidebar /><div className="employee-main"><main className="employee-content"><PageHeader title={showDesktopDownload ? `Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}` : title} description={showDesktopDownload ? "Your work summary, timesheets and desktop workspace." : description} />{report}</main></div></div>;
}

export default RoleReportPage;
