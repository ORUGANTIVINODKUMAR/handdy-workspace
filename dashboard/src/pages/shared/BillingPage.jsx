import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Clock3, Download, FileSearch, FolderKanban, ReceiptText, UsersRound } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { getBillingEmployees, getBillingReport } from "../../api/billingApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

import "../../styles/billingPage.css";

const toDateKey = (date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getPeriodDates = (period) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "yesterday") {
    const date = addDays(today, -1);
    return [toDateKey(date), toDateKey(date)];
  }
  if (period === "this-week" || period === "last-week") {
    const mondayOffset = (today.getDay() + 6) % 7;
    const thisMonday = addDays(today, -mondayOffset);
    const start = period === "last-week" ? addDays(thisMonday, -7) : thisMonday;
    const end = period === "last-week" ? addDays(thisMonday, -1) : today;
    return [toDateKey(start), toDateKey(end)];
  }
  if (period === "this-month" || period === "last-month") {
    const start = period === "last-month"
      ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = period === "last-month"
      ? new Date(today.getFullYear(), today.getMonth(), 0)
      : today;
    return [toDateKey(start), toDateKey(end)];
  }
  return [toDateKey(today), toDateKey(today)];
};

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const formatClockDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safeSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, "0")}`;
};

const formatDate = (dateKey) => new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "short", day: "numeric",
}).format(new Date(`${dateKey}T00:00:00`));

const recordId = (value) => String(value?._id || value?.id || value || "");

function BillingContent() {
  const initialDates = getPeriodDates("today");
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState("today");
  const [fromDate, setFromDate] = useState(initialDates[0]);
  const [toDate, setToDate] = useState(initialDates[1]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadEmployees = async () => {
      try {
        const data = await getBillingEmployees();
        if (!active) return;
        const nextEmployees = data.employees || [];
        const nextTeams = data.teams || [];
        setEmployees(nextEmployees);
        setTeams(nextTeams);
        const firstTeam = nextTeams[0];
        const firstLeadId = recordId(firstTeam?.teamLead);
        const firstEmployee = firstTeam
          ? nextEmployees.find((employee) => recordId(employee.teamLead) === firstLeadId)
          : nextEmployees[0];
        setTeamId(firstTeam ? recordId(firstTeam) : "all");
        setEmployeeId(recordId(firstEmployee));
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "Unable to load employees for Billing."));
      }
    };
    void loadEmployees();
    return () => { active = false; };
  }, []);

  const filteredEmployees = useMemo(() => {
    if (teamId === "all") return employees;
    if (teamId === "unassigned") return employees.filter((employee) => !recordId(employee.teamLead));
    const selectedTeam = teams.find((team) => recordId(team) === teamId);
    const leadId = recordId(selectedTeam?.teamLead);
    return employees.filter((employee) => recordId(employee.teamLead) === leadId);
  }, [employees, teamId, teams]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => recordId(employee) === employeeId),
    [employeeId, employees],
  );

  const changeTeam = (value) => {
    setTeamId(value);
    setReport(null);
    let nextEmployees = employees;
    if (value === "unassigned") nextEmployees = employees.filter((employee) => !recordId(employee.teamLead));
    else if (value !== "all") {
      const selectedTeam = teams.find((team) => recordId(team) === value);
      const leadId = recordId(selectedTeam?.teamLead);
      nextEmployees = employees.filter((employee) => recordId(employee.teamLead) === leadId);
    }
    setEmployeeId(recordId(nextEmployees[0]));
  };

  const changePeriod = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      const [start, end] = getPeriodDates(value);
      setFromDate(start);
      setToDate(end);
    }
  };

  const generateReport = async () => {
    if (!employeeId) {
      setError("Select an employee before generating the report.");
      return;
    }
    if (!fromDate || !toDate || toDate < fromDate) {
      setError("Select a valid From and To date.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await getBillingReport({ employee: employeeId, startDate: fromDate, endDate: toDate });
      setReport(data.report);
    } catch (requestError) {
      setReport(null);
      setError(getApiErrorMessage(requestError, "Unable to generate the billing report."));
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (!report) return;
    const XLSX = await import("xlsx");
    const titleRows = [
      ["Billing Report"],
      ["Employee", report.employee.fullName],
      ["Employee ID", report.employee.employeeId],
      ["Period", `${formatDate(report.period.startDate)} - ${formatDate(report.period.endDate)}`],
      [],
      ["Task Summary"],
      ["Project", "Client", "Task", "Description", "Total Hours"],
      ...report.taskSummary.map((task) => [task.projectName, task.clientName, task.taskName, task.taskDescription, formatClockDuration(task.totalSeconds)]),
      [],
      ["Time Summary"],
      ["Task Hours", formatClockDuration(report.summary.taskSeconds)],
      ["Break Hours", formatClockDuration(report.summary.breakSeconds)],
      ["Total Recorded Hours", formatClockDuration(report.summary.totalSeconds)],
    ];
    const dailyRows = [
      ["Date", "Type", "Project", "Client", "Task", "Description", "Start", "End", "Duration"],
      ...report.dailyDetails.flatMap((day) => day.entries.map((entry) => [
        day.date,
        entry.type === "break" ? "Break" : "Task",
        entry.projectName,
        entry.clientName,
        entry.taskName,
        entry.taskDescription,
        new Date(entry.startedAt).toLocaleString(undefined, { timeZone: report.period.timezone }),
        new Date(entry.stoppedAt).toLocaleString(undefined, { timeZone: report.period.timezone }),
        formatClockDuration(entry.durationSeconds),
      ])),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(titleRows), "Billing Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dailyRows), "Daily Details");
    const safeName = report.employee.fullName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    XLSX.writeFile(workbook, `Billing-${safeName}-${report.period.startDate}-${report.period.endDate}.xlsx`);
  };

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div><span>Company billing</span><h2>Billing report</h2><p>Aggregate completed task and break time from the existing employee timer.</p></div>
        {report && <button type="button" className="billing-export" onClick={exportReport}><Download size={17} />Export Excel</button>}
      </section>

      <section className="billing-filters card" aria-label="Billing report filters">
        <label><span>Team</span><select value={teamId} onChange={(event) => changeTeam(event.target.value)}><option value="all">All teams</option>{teams.map((team) => <option key={recordId(team)} value={recordId(team)}>{team.teamName}</option>)}<option value="unassigned">Unassigned employees</option></select></label>
        <label><span>Employee</span><select value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); setReport(null); }} disabled={filteredEmployees.length === 0}>{filteredEmployees.length === 0 && <option value="">No employees in this team</option>}{filteredEmployees.map((employee) => <option key={recordId(employee)} value={recordId(employee)}>{employee.fullName} ({employee.employeeId})</option>)}</select></label>
        <label><span>Date period</span><select value={period} onChange={(event) => changePeriod(event.target.value)}><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="this-week">This week</option><option value="last-week">Last week</option><option value="this-month">This month</option><option value="last-month">Last month</option><option value="custom">Custom date range</option></select></label>
        <label><span>From date</span><input type="date" value={fromDate} onChange={(event) => { setPeriod("custom"); setFromDate(event.target.value); }} /></label>
        <label><span>To date</span><input type="date" min={fromDate} value={toDate} onChange={(event) => { setPeriod("custom"); setToDate(event.target.value); }} /></label>
        <button type="button" className="billing-generate" onClick={generateReport} disabled={loading || !employeeId}><ReceiptText size={17} />{loading ? "Generating..." : "Generate report"}</button>
      </section>

      {error && <p className="billing-error" role="alert">{error}</p>}
      {!report && !error && <section className="billing-empty card"><FileSearch size={30} /><h3>Choose an employee and period</h3><p>Generate a report to see task totals, break time, project groups, and daily details.</p></section>}

      {report && (
        <>
          <section className="billing-summary-grid">
            <article className="card"><UsersRound size={20} /><span>Employee</span><strong>{report.employee.fullName}</strong><small>{report.employee.employeeId}</small></article>
            <article className="card"><CalendarRange size={20} /><span>Selected period</span><strong>{formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}</strong><small>{report.summary.workingDays} working days</small></article>
            <article className="card"><Clock3 size={20} /><span>Task hours</span><strong>{formatDuration(report.summary.taskSeconds)}</strong><small>{report.summary.taskCount} tasks</small></article>
            <article className="card break-card"><Clock3 size={20} /><span>Break hours</span><strong>{formatDuration(report.summary.breakSeconds)}</strong><small>Recorded break tasks</small></article>
            <article className="card total-card"><ReceiptText size={20} /><span>Total recorded</span><strong>{formatDuration(report.summary.totalSeconds)}</strong><small>{report.summary.projectCount} projects</small></article>
          </section>

          <section className="billing-report card">
            <header><div><span>Primary report</span><h3>Project-wise task summary</h3></div><strong>{formatDuration(report.summary.taskSeconds)}</strong></header>
            {report.projects.length === 0 ? <div className="billing-no-data">No completed task time was recorded in this period.</div> : report.projects.map((project) => (
              <article className="billing-project" key={project.projectId}>
                <div className="billing-project-heading"><div><FolderKanban size={18} /><div><h4>{project.projectName}</h4><p>{project.clientName || project.projectCode || "No client assigned"}</p></div></div><strong>{formatDuration(project.totalSeconds)}</strong></div>
                <div className="billing-table-wrap"><table><thead><tr><th>Task</th><th>Description</th><th>Total time</th></tr></thead><tbody>{project.tasks.map((task) => <tr key={task.taskId}><td><strong>{task.taskName}</strong>{task.taskCode && <small>{task.taskCode}</small>}</td><td>{task.taskDescription || "-"}</td><td>{formatClockDuration(task.totalSeconds)}</td></tr>)}</tbody></table></div>
              </article>
            ))}
          </section>

          <section className="billing-daily card">
            <header><div><span>Audit detail</span><h3>Daily details</h3></div><p>Expand a date to review individual timer sessions.</p></header>
            {report.dailyDetails.length === 0 ? <div className="billing-no-data">No completed timer records were found.</div> : report.dailyDetails.map((day) => (
              <details key={day.date}>
                <summary><span>{formatDate(day.date)}</span><span>Tasks {formatDuration(day.taskSeconds)}</span><span>Breaks {formatDuration(day.breakSeconds)}</span><strong>{formatDuration(day.totalSeconds)}</strong></summary>
                <div className="billing-table-wrap"><table><thead><tr><th>Type</th><th>Project</th><th>Task</th><th>Start</th><th>End</th><th>Time</th></tr></thead><tbody>{day.entries.map((entry, index) => <tr key={`${entry.logId}-${index}`}><td><span className={`billing-type ${entry.type}`}>{entry.type === "break" ? "Break" : "Task"}</span></td><td>{entry.projectName}</td><td>{entry.taskName}</td><td>{new Date(entry.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: report.period.timezone })}</td><td>{new Date(entry.stoppedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: report.period.timezone })}</td><td>{formatDuration(entry.durationSeconds)}</td></tr>)}</tbody></table></div>
              </details>
            ))}
          </section>
        </>
      )}
      {selectedEmployee?.isActive === false && <p className="billing-history-note">This employee is inactive; historical completed records remain available.</p>}
    </div>
  );
}

function BillingPage() {
  return <DashboardLayout title="Billing"><BillingContent /></DashboardLayout>;
}

export default BillingPage;
