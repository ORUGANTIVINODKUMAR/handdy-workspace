import { useEffect, useMemo, useState } from "react";

import axiosInstance from "../../api/axiosInstance";
import { getMyTeam } from "../../api/employeeApi";
import useAuth from "../../context/useAuth";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

import "../../styles/adminAddTask.css";

const toId = (value) => (typeof value === "string" ? value : value?._id) || "";

// Shared Task Creation/Edit form used by Admin (full page + list-page edit
// modal) and Team Lead (full page). The project dropdown is limited to
// active projects assigned to every currently selected team.
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
  const [additionalTaskNames, setAdditionalTaskNames] = useState([]);
  const [taskType, setTaskType] = useState(initialTask?.taskType || "work");
  const [idleLogout, setIdleLogout] = useState(initialTask?.idleLogout === true);
  const [isActive, setIsActive] = useState(initialTask ? initialTask.isActive !== false : true);

  const [teams, setTeams] = useState(() => {
    if (scope === "teamLead") return user?.team ? [toId(user.team)] : [];
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
    mode === "create" || initialTask?.assignToAllEmployees ? "team" : "employee"
  );
  const [assignedTo, setAssignedTo] = useState(() =>
    (initialTask?.assignedTo || []).map(toId).filter(Boolean)
  );

  const [teamsOptions, setTeamsOptions] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [projectIds, setProjectIds] = useState(() => {
    const initialProjectId = toId(initialTask?.project);
    return initialProjectId ? [initialProjectId] : [];
  });

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

  useEffect(() => {
    axiosInstance
      .get("/projects", { params: { limit: 100, status: "Active" } })
      .then(({ data }) => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  const teamsKey = teams.join(",");

  const availableProjects = useMemo(() => projects.filter((project) => {
    if (teams.length === 0) return false;
    const projectTeams = (project.teams || []).map(toId).filter(Boolean);
    return projectTeams.length === 0 || teams.every((teamId) => projectTeams.includes(teamId));
  }), [projects, teamsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const availableProjectIds = new Set(availableProjects.map((project) => project._id));
    setProjectIds((current) => current.filter((projectId) => availableProjectIds.has(projectId)));
  }, [availableProjects]);

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
    setProjectIds([]);
  };

  const toggleProject = (projectId) => {
    setProjectIds((current) => {
      if (mode === "edit") return [projectId];
      return current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId];
    });
  };

  const toggleEmployee = (employeeId) => {
    setAssignedTo((previous) =>
      previous.includes(employeeId) ? previous.filter((id) => id !== employeeId) : [...previous, employeeId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const taskNames = [taskName, ...additionalTaskNames].map((name) => name.trim());
    if (taskNames.some((name) => !name)) {
      setError("Enter every task name, or remove unused task-name rows.");
      return;
    }
    if (new Set(taskNames.map((name) => name.toLowerCase())).size !== taskNames.length) {
      setError("Each task name in this batch must be unique.");
      return;
    }
    if (scope === "admin" && teams.length === 0) {
      setError("Select at least one team.");
      return;
    }
    if (mode === "edit" && taskType === "work" && projectIds.length === 0) {
      setError("Select at least one project for this work task.");
      return;
    }
    if (assignType === "employee" && assignedTo.length === 0) {
      setError("Select at least one employee, or choose to assign the entire team.");
      return;
    }

    const payload = {
      taskName: taskName.trim(),
      taskType,
      teams,
      project: mode === "edit" ? projectIds[0] || null : null,
      assignToAllEmployees: mode === "create" || assignType === "team",
      assignedTo: mode === "create" || assignType === "team" ? [] : assignedTo,
      idleLogout,
      ...(mode === "edit" ? { isActive } : {}),
    };

    try {
      setSaving(true);
      const response =
        mode === "edit"
          ? await axiosInstance.put(`/tasks/${initialTask._id}`, payload)
          : await axiosInstance.post("/tasks/bulk", { ...payload, taskNames, autoProjects: true });
      onSaved(response.data.tasks || response.data.task);
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

      <div className="admin-task-basics admin-task-name-list" style={{ gridTemplateColumns: "1fr" }}>
        <label>
          Task name
          <input
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="Enter task name"
            required
          />
        </label>

        {mode === "create" && additionalTaskNames.map((name, index) => (
          <div className="admin-task-name-row" key={index}>
            <label>
              Task name {index + 2}
              <input
                value={name}
                onChange={(event) => setAdditionalTaskNames((current) =>
                  current.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
                )}
                placeholder="Enter another task name"
                required
              />
            </label>
            <button
              type="button"
              className="admin-task-name-remove"
              onClick={() => setAdditionalTaskNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              aria-label={`Remove task name ${index + 2}`}
            >
              Remove
            </button>
          </div>
        ))}

        {mode === "create" && (
          <button
            type="button"
            className="admin-task-name-add"
            onClick={() => setAdditionalTaskNames((current) => [...current, ""])}
          >
            + Add another task name
          </button>
        )}

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

      {mode === "create" ? (
        <p className="admin-task-project-empty">
          Work tasks will be added to every active project assigned to the selected teams.
          Break tasks will be available across those projects.
        </p>
      ) : <div className="admin-task-project">
        <div className="admin-task-section-heading">
          <div>
            <p>PROJECTS</p>
            <h3>{mode === "create" ? "Select projects" : "Select project"}</h3>
            <span className="admin-task-selection-copy">
              {mode === "create"
                ? "Choose one or more projects. A task entry will be created for each selected project."
                : "Projects are limited to the selected team assignments."}
            </span>
          </div>
          <span className="admin-task-selection-count">{projectIds.length} selected</span>
        </div>
        {teams.length === 0 ? (
          <p className="admin-task-project-empty">Select a team first.</p>
        ) : (
          <div className="admin-task-project-grid">
            {availableProjects.map((project) => {
              const selected = projectIds.includes(project._id);
              return (
                <button
                  type="button"
                  key={project._id}
                  className={`admin-task-project-option ${selected ? "selected" : ""}`}
                  onClick={() => toggleProject(project._id)}
                  aria-pressed={selected}
                >
                  <i aria-hidden="true">{selected ? "✓" : ""}</i>
                  <span>
                    <strong>{project.projectName}</strong>
                    {project.projectCode && <small>{project.projectCode}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {teams.length > 0 && availableProjects.length === 0 && <p className="admin-task-project-empty">No active project is assigned to every selected team.</p>}
      </div>}

      {mode === "edit" && <div className="admin-task-assignees">
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
      </div>}

      <footer>
        <button type="button" className="admin-add-task-cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="admin-add-task-save" disabled={saving}>
          {saving
            ? "Saving..."
            : mode === "create" && additionalTaskNames.length > 0
              ? `Save ${additionalTaskNames.length + 1} task names`
              : saveLabel || "Save task"}
        </button>
      </footer>
    </form>
  );
}

export default TaskForm;
