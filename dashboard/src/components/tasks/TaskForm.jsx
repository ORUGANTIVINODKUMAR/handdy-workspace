import { useEffect, useMemo, useState } from "react";

import axiosInstance from "../../api/axiosInstance";
import { getMyTeam } from "../../api/employeeApi";
import { resolveProjectForTeams } from "../../api/taskApi";
import useAuth from "../../context/useAuth";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { SERVICE_TYPES } from "../../constants/serviceTypes";

import "../../styles/adminAddTask.css";

const toId = (value) => (typeof value === "string" ? value : value?._id) || "";

// Shared Task Creation/Edit form used by Admin (full page + list-page edit
// modal) and Team Lead (full page). Project is never shown in this form: it
// is silently inferred from the selected team(s)' existing task history. A
// brand-new team's first task (or a task spanning teams with conflicting
// project history) simply saves without a project — it gets attached the
// next time any task for that team specifies one.
function TaskForm({
  mode = "create",
  scope = "admin",
  initialTask = null,
  formClassName = "admin-add-task-card",
  header = null,
  saveLabel,
  onCancel,
  onSaved,
}) {
  const { user } = useAuth();

  const [taskName, setTaskName] = useState(initialTask?.taskName || "");
  const [taskType, setTaskType] = useState(initialTask?.taskType || "work");
  const [serviceType, setServiceType] = useState(initialTask?.serviceType || "");
  const [idleLogout, setIdleLogout] = useState(initialTask?.idleLogout === true);
  const [isActive, setIsActive] = useState(initialTask ? initialTask.isActive !== false : true);

  const [teams, setTeams] = useState(() => {
    if (scope === "teamLead") return user?.team ? [String(user.team)] : [];
    if (initialTask) {
      const raw = initialTask.teams?.length
        ? initialTask.teams
        : initialTask.team
        ? [initialTask.team]
        : [];
      return raw.map(toId).filter(Boolean);
    }
    return [];
  });

  const [assignType, setAssignType] = useState(
    initialTask?.assignToAllEmployees ? "team" : "employee"
  );
  const [assignedTo, setAssignedTo] = useState(() =>
    (initialTask?.assignedTo || []).map(toId).filter(Boolean)
  );

  const [teamsOptions, setTeamsOptions] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Resolved silently in the background; never surfaced as a field to fill in.
  const [resolvedProjectId, setResolvedProjectId] = useState(toId(initialTask?.project));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (scope !== "admin") return;
    axiosInstance
      .get("/teams")
      .then(({ data }) => setTeamsOptions((data.teams || []).filter((team) => team.isActive)))
      .catch(() => {});
  }, [scope]);

  useEffect(() => {
    if (scope === "admin") {
      axiosInstance
        .get("/employees", { params: { limit: 100, isActive: true } })
        .then(({ data }) => setAllEmployees(data.employees || []))
        .catch(() => {});
    } else {
      getMyTeam()
        .then((data) => setTeamMembers(data.employees || []))
        .catch(() => {});
    }
  }, [scope]);

  const teamsKey = teams.join(",");

  useEffect(() => {
    let active = true;

    if (teams.length === 0) {
      setResolvedProjectId(null);
      return undefined;
    }

    const run = async () => {
      try {
        const data = await resolveProjectForTeams(teams);
        if (!active || !data) return;
        setResolvedProjectId(data.status === "resolved" ? data.projectId : null);
      } catch {
        // Project is optional — a failed lookup just leaves it unset.
        if (active) setResolvedProjectId(null);
      }
    };

    void run();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsKey]);

  const availableEmployees = useMemo(() => {
    const pool =
      scope === "admin"
        ? allEmployees.filter(
            (employee) => employee.role === "employee" && teams.includes(toId(employee.team))
          )
        : teamMembers;
    const text = employeeSearch.trim().toLowerCase();
    return text ? pool.filter((employee) => employee.fullName?.toLowerCase().includes(text)) : pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, allEmployees, teamMembers, teamsKey, employeeSearch]);

  const myTeamName = teamMembers[0]?.team?.teamName || "Your team";

  const toggleTeam = (teamId) => {
    setTeams((previous) =>
      previous.includes(teamId) ? previous.filter((id) => id !== teamId) : [...previous, teamId]
    );
    setAssignedTo([]);
  };

  const toggleEmployee = (employeeId) => {
    setAssignedTo((previous) =>
      previous.includes(employeeId) ? previous.filter((id) => id !== employeeId) : [...previous, employeeId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!taskName.trim()) {
      setError("Task name is required.");
      return;
    }
    if (taskType === "work" && !SERVICE_TYPES.includes(serviceType)) {
      setError("Select a service type for this work task.");
      return;
    }
    if (scope === "admin" && teams.length === 0) {
      setError("Select at least one team.");
      return;
    }
    if (assignType === "employee" && assignedTo.length === 0) {
      setError("Select at least one employee, or choose to assign the entire team.");
      return;
    }

    const payload = {
      taskName: taskName.trim(),
      taskType,
      serviceType: taskType === "work" ? serviceType : null,
      teams,
      project: resolvedProjectId || null,
      assignToAllEmployees: assignType === "team",
      assignedTo: assignType === "team" ? [] : assignedTo,
      idleLogout,
      ...(mode === "edit" ? { isActive } : {}),
    };

    try {
      setSaving(true);
      const response =
        mode === "edit"
          ? await axiosInstance.put(`/tasks/${initialTask._id}`, payload)
          : await axiosInstance.post("/tasks", payload);
      onSaved(response.data.task);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save task."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={formClassName} onSubmit={handleSubmit}>
      {header}
      {error && <p className="admin-error-box" role="alert">{error}</p>}

      <div className="admin-task-basics" style={{ gridTemplateColumns: "1fr" }}>
        <label>
          Task name
          <input
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="Enter task name"
            required
          />
        </label>

        {mode === "edit" && (
          <label>
            Status
            <select value={isActive ? "true" : "false"} onChange={(event) => setIsActive(event.target.value === "true")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        )}
      </div>

      <div className="admin-task-options">
        <div>
          <strong>Task type</strong>
          <label>
            <input type="radio" checked={taskType === "work"} onChange={() => setTaskType("work")} />
            Work time
          </label>
          <label>
            <input type="radio" checked={taskType === "break"} onChange={() => setTaskType("break")} />
            Break time
          </label>
        </div>
        <label className="admin-task-idle">
          <input type="checkbox" checked={idleLogout} onChange={(event) => setIdleLogout(event.target.checked)} />
          Enable idle logout for this task
        </label>
      </div>

      {taskType === "work" && (
        <div className="admin-task-basics" style={{ gridTemplateColumns: "1fr" }}>
          <label>
            Service type
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} required>
              <option value="">Select the billing service</option>
              {SERVICE_TYPES.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
            <small>This service selects the employee-specific hourly rate used in Billing.</small>
          </label>
        </div>
      )}

      {scope === "admin" ? (
        <div className="admin-task-access">
          <div className="admin-task-section-heading">
            <div>
              <p>ASSIGN ACCESS</p>
              <h3>Select teams</h3>
              <span className="admin-task-selection-copy">Choose one or more teams for this task.</span>
            </div>
            <span className="admin-task-selection-count">{teams.length} selected</span>
          </div>
          <div className="admin-task-team-grid">
            {teamsOptions.map((team) => {
              const selected = teams.includes(team._id);
              return (
                <button
                  type="button"
                  key={team._id}
                  className={`admin-task-team-option ${selected ? "selected" : ""}`}
                  onClick={() => toggleTeam(team._id)}
                  aria-pressed={selected}
                >
                  <i aria-hidden="true">{selected ? "✓" : ""}</i>
                  <span>{team.teamName}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="admin-task-access">
          <div className="admin-task-section-heading">
            <div>
              <p>ASSIGN ACCESS</p>
              <h3>Team</h3>
              <span className="admin-task-selection-copy">This task is created for your team.</span>
            </div>
            <span className="admin-task-selection-count">{myTeamName}</span>
          </div>
        </div>
      )}

      <div className="admin-task-assignees">
        <div className="admin-task-section-heading">
          <div>
            <p>ASSIGNMENT</p>
            <h3>Who can use this task?</h3>
          </div>
        </div>
        <div className="admin-task-assignment-toggle">
          <button
            type="button"
            className={`admin-task-assignment-option ${assignType === "team" ? "selected" : ""}`}
            onClick={() => { setAssignType("team"); setAssignedTo([]); }}
          >
            Entire selected team
          </button>
          <button
            type="button"
            className={`admin-task-assignment-option ${assignType === "employee" ? "selected" : ""}`}
            onClick={() => setAssignType("employee")}
          >
            Specific employees
          </button>
        </div>

        {assignType === "employee" && (
          <div className="admin-task-employee-panel">
            <div>
              <label>
                Search employees
                <input
                  value={employeeSearch}
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder="Search by name"
                />
              </label>
              <span>{assignedTo.length} selected</span>
            </div>
            <div className="admin-task-employee-list">
              {availableEmployees.map((employee) => {
                const selected = assignedTo.includes(employee._id);
                return (
                  <button
                    type="button"
                    key={employee._id}
                    className={`admin-task-employee-option ${selected ? "selected" : ""}`}
                    onClick={() => toggleEmployee(employee._id)}
                  >
                    <i aria-hidden="true">{selected ? "✓" : ""}</i>
                    <strong>{employee.fullName}</strong>
                    <small>{employee.team?.teamName || "Team member"}</small>
                  </button>
                );
              })}
              {scope === "admin" && teams.length > 0 && availableEmployees.length === 0 && (
                <p>No employees found in the selected teams.</p>
              )}
              {scope === "teamLead" && availableEmployees.length === 0 && (
                <p>No employees found on your team.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <footer>
        <button type="button" className="admin-add-task-cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="admin-add-task-save" disabled={saving}>
          {saving ? "Saving..." : saveLabel || "Save task"}
        </button>
      </footer>
    </form>
  );
}

export default TaskForm;
