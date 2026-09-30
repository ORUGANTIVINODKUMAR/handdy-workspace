import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getEmployeeIdlePolicies,
  getIdlePolicy,
  updateEmployeeIdlePolicy,
  updateIdlePolicy,
} from "../../api/settingsApi";
import useAuth from "../../context/useAuth";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import "../../styles/adminSettings.css";

// Display defaults and validation bounds only, kept in sync with
// desktop-app/idle-policy-defaults.json (the canonical values the backend
// and desktop app share). Not importing that file directly avoids a
// cross-package build dependency; the backend independently re-validates
// and enforces the real limits regardless of what this form sends.
const idleDefaults = {
  idleThresholdMinutes: 5,
  autoLogoutMinutes: 30,
  minIdleMinutes: 1,
  maxIdleMinutes: 240,
  minLogoutMinutes: 2,
  maxLogoutMinutes: 480,
};

function AdminSettings() {
  const { user } = useAuth();
  const isAlpha = user?.role === "alpha";
  const [idleMinutes, setIdleMinutes] = useState(idleDefaults.idleThresholdMinutes);
  const [logoutMinutes, setLogoutMinutes] = useState(idleDefaults.autoLogoutMinutes);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeIdleMinutes, setEmployeeIdleMinutes] = useState(idleDefaults.idleThresholdMinutes);
  const [employeeLogoutMinutes, setEmployeeLogoutMinutes] = useState(idleDefaults.autoLogoutMinutes);
  const [useGlobalPolicy, setUseGlobalPolicy] = useState(true);
  const [employeePolicySaving, setEmployeePolicySaving] = useState(false);

  useEffect(() => {
    let active = true;
    getIdlePolicy()
      .then((response) => {
        if (!active || !response.idlePolicy) return;
        setIdleMinutes(response.idlePolicy.idleThresholdMinutes);
        setLogoutMinutes(response.idlePolicy.autoLogoutMinutes);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "Unable to load idle settings."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isAlpha) return;
    getEmployeeIdlePolicies()
      .then((response) => setEmployees(response.employees || []))
      .catch((requestError) => setError(getApiErrorMessage(requestError, "Unable to load employee policies.")));
  }, [isAlpha]);

  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    const selected = employees.find((employee) => employee._id === employeeId);
    const override = selected?.idlePolicyOverride;
    const hasOverride = Number.isInteger(override?.idleThresholdMinutes)
      && Number.isInteger(override?.autoLogoutMinutes);
    setUseGlobalPolicy(!hasOverride);
    setEmployeeIdleMinutes(hasOverride ? override.idleThresholdMinutes : idleMinutes);
    setEmployeeLogoutMinutes(hasOverride ? override.autoLogoutMinutes : logoutMinutes);
    setMessage("");
    setError("");
  };

  const handleEmployeePolicySave = async () => {
    if (!selectedEmployeeId) {
      setError("Select an employee.");
      return;
    }
    const policy = useGlobalPolicy
      ? { useGlobalPolicy: true }
      : {
          idleThresholdMinutes: Number(employeeIdleMinutes),
          autoLogoutMinutes: Number(employeeLogoutMinutes),
        };
    setEmployeePolicySaving(true);
    setMessage("");
    setError("");
    try {
      const response = await updateEmployeeIdlePolicy(selectedEmployeeId, policy);
      const refreshed = await getEmployeeIdlePolicies();
      setEmployees(refreshed.employees || []);
      setMessage(response.message || "Employee inactivity policy saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save employee policy."));
    } finally {
      setEmployeePolicySaving(false);
    }
  };

  const handleSave = async () => {
    const idleThresholdMinutes = Number(idleMinutes);
    const autoLogoutMinutes = Number(logoutMinutes);
    if (!Number.isInteger(idleThresholdMinutes) || idleThresholdMinutes < 1 || idleThresholdMinutes > 240) {
      setMessage("");
      setError("Idle threshold must be a whole number from 1 to 240 minutes.");
      return;
    }
    if (!Number.isInteger(autoLogoutMinutes) || autoLogoutMinutes < idleDefaults.minLogoutMinutes || autoLogoutMinutes > idleDefaults.maxLogoutMinutes || autoLogoutMinutes <= idleThresholdMinutes) {
      setMessage("");
      setError("Auto logout must be a whole number from 2 to 480 minutes and greater than the idle pause threshold.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await updateIdlePolicy(idleThresholdMinutes, autoLogoutMinutes);
      setIdleMinutes(response.idlePolicy?.idleThresholdMinutes ?? idleThresholdMinutes);
      setLogoutMinutes(response.idlePolicy?.autoLogoutMinutes ?? autoLogoutMinutes);
      setMessage("Idle and logout settings saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save idle settings."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title="Idle & logout settings">
      <section className="settings-page">
        <div className="settings-card">
          <div className="settings-section" id="settings-idle">
            <div className="settings-label-row">
              <div>
                <h3>Inactivity policy</h3>
                <p className="settings-description">These values are used by the web dashboard and desktop timer.</p>
              </div>
            </div>
            {isLoading ? <p role="status">Loading settings…</p> : (
              <>
                <label className="settings-field">
                  <span>Pause a running timer after</span>
                  <span className="settings-inline">
                    <input className="settings-small-input" type="number" min="1" max="240" step="1" value={idleMinutes} onChange={(event) => setIdleMinutes(event.target.value)} />
                    <span>minutes of inactivity</span>
                  </span>
                </label>
                <label className="settings-field">
                  <span>Sign the employee out after</span>
                  <span className="settings-inline">
                    <input className="settings-small-input" type="number" min={idleDefaults.minLogoutMinutes} max={idleDefaults.maxLogoutMinutes} step="1" value={logoutMinutes} onChange={(event) => setLogoutMinutes(event.target.value)} />
                    <span>minutes of inactivity</span>
                  </span>
                </label>
              </>
            )}
          </div>
          {isAlpha && (
            <div className="settings-section" id="settings-employee-idle">
              <div className="settings-label-row">
                <div>
                  <h3>Employee override</h3>
                  <p className="settings-description">Choose an employee and override the company inactivity policy for that account.</p>
                </div>
              </div>
              <label className="settings-field">
                <span>Employee</span>
                <select value={selectedEmployeeId} onChange={(event) => handleEmployeeSelection(event.target.value)}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.fullName} ({employee.employeeId})
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-field">
                <span><input type="checkbox" checked={useGlobalPolicy} onChange={(event) => setUseGlobalPolicy(event.target.checked)} /> Use company policy</span>
              </label>
              {!useGlobalPolicy && (
                <>
                  <label className="settings-field">
                    <span>Pause this employee's timer after</span>
                    <span className="settings-inline"><input className="settings-small-input" type="number" min="1" max="240" step="1" value={employeeIdleMinutes} onChange={(event) => setEmployeeIdleMinutes(event.target.value)} /><span>minutes</span></span>
                  </label>
                  <label className="settings-field">
                    <span>Sign this employee out after</span>
                    <span className="settings-inline"><input className="settings-small-input" type="number" min="2" max="480" step="1" value={employeeLogoutMinutes} onChange={(event) => setEmployeeLogoutMinutes(event.target.value)} /><span>minutes</span></span>
                  </label>
                </>
              )}
              <button type="button" className="settings-save-button" onClick={handleEmployeePolicySave} disabled={!selectedEmployeeId || employeePolicySaving}>
                {employeePolicySaving ? "Saving…" : "Save employee override"}
              </button>
            </div>
          )}
          {(message || error) && <p className={`settings-save-message${error ? " is-error" : ""}`} role="status">{error || message}</p>}
          <div className="settings-bottom-save">
            <button type="button" className="settings-save-button" onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminSettings;
