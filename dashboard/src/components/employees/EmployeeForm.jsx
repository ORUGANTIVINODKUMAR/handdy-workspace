import { EMPTY_PROJECT_RATE } from "../../utils/employeeFormValidation";

function EmployeeForm({
  mode,
  formData,
  teams,
  projects = [],
  saving,
  error,
  isAdmin = true,
  projectRatesRequired = true,
  onFieldChange,
  onSubmit,
  onCancel,
}) {
  const isCreate = mode === "create";
  const projectRates = formData.projectRates || [];
  const projectOptions = [...projects];
  for (const assignment of projectRates) {
    if (assignment.project && assignment.projectName && !projectOptions.some((project) => project._id === assignment.project)) {
      projectOptions.push({
        _id: assignment.project,
        projectName: assignment.projectName,
        status: assignment.projectStatus || "Completed",
      });
    }
  }

  const updateProjectRate = (index, field, value) => {
    const selectedProject = field === "project"
      ? projectOptions.find((project) => project._id === value)
      : null;
    const nextRates = projectRates.map((assignment, rowIndex) => (
      rowIndex === index
        ? {
            ...assignment,
            [field]: value,
            ...(selectedProject ? { projectName: selectedProject.projectName, projectStatus: selectedProject.status } : {}),
          }
        : assignment
    ));
    onFieldChange("projectRates", nextRates);
  };

  const addProjectRate = () => {
    onFieldChange("projectRates", [...projectRates, { ...EMPTY_PROJECT_RATE }]);
  };

  const removeProjectRate = (index) => {
    onFieldChange("projectRates", projectRates.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <form className={`employee-form employee-editor-form employee-editor-form--${mode}`} onSubmit={onSubmit}>
      <div className="employee-form-body">
        {error && <div className="admin-error-box" role="alert">{error}</div>}

        <section className="employee-form-section">
        <div className="employee-form-section-heading">
          <span>01</span>
          <div><h3>Employee details</h3><p>Basic account and access information.</p></div>
        </div>
        <div className="employee-form-grid">
          <label>
            Employee ID <em>*</em>
            <input value={formData.employeeId} onChange={(event) => onFieldChange("employeeId", event.target.value)} placeholder="EMP001" required />
          </label>
          <label>
            Full name <em>*</em>
            <input value={formData.fullName} onChange={(event) => onFieldChange("fullName", event.target.value)} placeholder="Employee name" required />
          </label>
          <label>
            Email address <em>*</em>
            <input type="email" value={formData.email} onChange={(event) => onFieldChange("email", event.target.value)} placeholder="name@company.com" autoComplete="email" disabled={!isCreate && !isAdmin} required />
          </label>
          {isCreate && (
            <label>
              Temporary password <em>*</em>
              <input type="password" value={formData.password} onChange={(event) => onFieldChange("password", event.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" required />
            </label>
          )}
          {isAdmin ? (
            <label>
              Role <em>*</em>
              <select value={formData.role} onChange={(event) => onFieldChange("role", event.target.value)}>
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
                <option value="hr">HR</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : isCreate && (
            <p className="employee-delegated-note">
              You can create employee accounts only — role, status, and access changes require an administrator.
            </p>
          )}
          {["employee", "team_lead"].includes(formData.role) && (
            <label>
              Team <em>*</em>
              <select value={formData.team} onChange={(event) => onFieldChange("team", event.target.value)} required>
                <option value="">Select team</option>
                {teams.map((team) => <option key={team._id} value={team._id}>{team.teamName}</option>)}
              </select>
            </label>
          )}
          {!isCreate && isAdmin && (
            <label>
              Status
              <select value={String(formData.isActive)} onChange={(event) => onFieldChange("isActive", event.target.value === "true")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          )}
        </div>
        </section>

        <section className="employee-form-section employee-services-section">
        <div className="employee-form-section-heading">
          <span>02</span>
          <div>
            <h3>Projects and charge rates{!projectRatesRequired && <em className="employee-optional-badge"> (Optional)</em>}</h3>
            <p>
              {projectRatesRequired
                ? "Assign each project once and enter the employee's hourly rate."
                : "Optional — add a project and hourly rate only if this person does billable client work."}
            </p>
          </div>
        </div>

        {projectRates.length === 0 && (
          <p className="employee-service-empty">
            {projectRatesRequired
              ? "No project assigned yet. Add at least one below."
              : 'No project assigned. Use "Add Another Project" below if this person also does billable work.'}
          </p>
        )}
        <div className="employee-service-labels" aria-hidden="true">
          <span>Project Name</span><span>Hourly charge rate</span><span>Action</span>
        </div>
        <div className="employee-service-rows">
          {projectRates.map((assignment, index) => (
            <div className="employee-service-row" key={`${index}-${assignment.project}`}>
              <label>
                <span className="employee-mobile-label">Project Name</span>
                <select value={assignment.project} onChange={(event) => updateProjectRate(index, "project", event.target.value)} required>
                  <option value="">Select project</option>
                  {projectOptions.map((project) => (
                    <option
                      key={project._id}
                      value={project._id}
                      disabled={
                        projectRates.some((item, rowIndex) => rowIndex !== index && item.project === project._id)
                        || (project.status !== "Active" && assignment.project !== project._id)
                      }
                    >
                      {project.projectName}{project.status !== "Active" ? " (Inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="employee-rate-field">
                <span className="employee-mobile-label">Hourly charge rate</span>
                <span className="employee-currency-prefix">$</span>
                <input
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  inputMode="decimal"
                  value={assignment.chargeRate}
                  onChange={(event) => updateProjectRate(index, "chargeRate", event.target.value)}
                  placeholder="0.00"
                  aria-label={`Charge rate for project row ${index + 1}`}
                  required
                />
                <span className="employee-rate-suffix">/ hour</span>
              </label>
              <button type="button" className="employee-remove-service" onClick={() => removeProjectRate(index)}>Remove</button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="employee-add-service"
          onClick={addProjectRate}
          disabled={projectRates.length >= projectOptions.length}
        >
          + Add Another Project
        </button>
        </section>
      </div>

      <div className="employee-form-actions">
        <button className="secondary-button" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : isCreate ? "Create Employee" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

export default EmployeeForm;
