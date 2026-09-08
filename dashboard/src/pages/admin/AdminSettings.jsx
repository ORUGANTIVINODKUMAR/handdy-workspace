import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getIdlePolicy, updateIdlePolicy } from "../../api/settingsApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import idleDefaults from "../../../../desktop-app/idle-policy-defaults.json";
import "../../styles/adminSettings.css";

function AdminSettings() {
  const [idleMinutes, setIdleMinutes] = useState(idleDefaults.idleThresholdMinutes);
  const [logoutMinutes, setLogoutMinutes] = useState(idleDefaults.autoLogoutMinutes);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
