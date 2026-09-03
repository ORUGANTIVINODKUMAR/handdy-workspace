import { SERVICE_TYPES } from "../../constants/serviceTypes";
import { EMPTY_SERVICE_RATE } from "../../utils/employeeFormValidation";

function EmployeeForm({
  mode,
  formData,
  teams,
  saving,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
}) {
  const isCreate = mode === "create";
  const serviceRates = formData.serviceRates || [];

  const updateServiceRate = (index, field, value) => {
    const nextRates = serviceRates.map((assignment, rowIndex) => (
      rowIndex === index ? { ...assignment, [field]: value } : assignment
    ));
    onFieldChange("serviceRates", nextRates);
  };

  const addServiceRate = () => {
    onFieldChange("serviceRates", [...serviceRates, { ...EMPTY_SERVICE_RATE }]);
  };

  const removeServiceRate = (index) => {
    onFieldChange("serviceRates", serviceRates.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <form className="employee-form employee-editor-form" onSubmit={onSubmit}>
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
            <input type="email" value={formData.email} onChange={(event) => onFieldChange("email", event.target.value)} placeholder="name@company.com" autoComplete="email" required />
          </label>
          {isCreate && (
            <label>
              Temporary password <em>*</em>
              <input type="password" value={formData.password} onChange={(event) => onFieldChange("password", event.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" required />
            </label>
          )}
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
          {["employee", "team_lead"].includes(formData.role) && (
            <label>
              Team <em>*</em>
              <select value={formData.team} onChange={(event) => onFieldChange("team", event.target.value)} required>
                <option value="">Select team</option>
                {teams.map((team) => <option key={team._id} value={team._id}>{team.teamName}</option>)}
              </select>
            </label>
          )}
          {!isCreate && (
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
          <div><h3>Services and charge rates</h3><p>Assign each service once and enter its hourly employee rate.</p></div>
        </div>

        <div className="employee-service-labels" aria-hidden="true">
          <span>Service type</span><span>Hourly charge rate</span><span>Action</span>
        </div>
        <div className="employee-service-rows">
          {serviceRates.map((assignment, index) => (
            <div className="employee-service-row" key={`${index}-${assignment.serviceType}`}>
              <label>
                <span className="employee-mobile-label">Service type</span>
                <select value={assignment.serviceType} onChange={(event) => updateServiceRate(index, "serviceType", event.target.value)} required>
                  <option value="">Select service</option>
                  {SERVICE_TYPES.map((serviceType) => (
                    <option
                      key={serviceType}
                      value={serviceType}
                      disabled={serviceRates.some((item, rowIndex) => rowIndex !== index && item.serviceType === serviceType)}
                    >
                      {serviceType}
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
                  onChange={(event) => updateServiceRate(index, "chargeRate", event.target.value)}
                  placeholder="0.00"
                  aria-label={`Charge rate for service row ${index + 1}`}
                  required
                />
                <span className="employee-rate-suffix">/ hour</span>
              </label>
              <button type="button" className="employee-remove-service" onClick={() => removeServiceRate(index)}>Remove</button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="employee-add-service"
          onClick={addServiceRate}
          disabled={serviceRates.length >= SERVICE_TYPES.length}
        >
          + Add Another Service
        </button>
      </section>

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
