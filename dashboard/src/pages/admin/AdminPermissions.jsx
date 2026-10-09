import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, RotateCcw, Save, ShieldCheck } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuth from "../../context/useAuth";
import { getPermissionConfig, saveRolePermissions } from "../../api/permissionApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

import "../../styles/adminPermissions.css";

const ENFORCEMENT_LABELS = {
  backend: "Enforced by server",
  frontend: "Screen only",
  none: "Not enforced yet",
};

const sameSet = (a, b) => a.length === b.length && a.every((key) => b.includes(key));

function AdminPermissions() {
  const { user } = useAuth();
  const canManage = ["admin", "alpha"].includes(user?.role);
  const [config, setConfig] = useState(null);
  const [activeRole, setActiveRole] = useState("");
  // Saved (server) grants per role, and the unsaved checkbox state per role.
  const [saved, setSaved] = useState({});
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(canManage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPermissionConfig();
      const grants = Object.fromEntries(data.roles.map((role) => [role.role, role.permissions]));
      setConfig(data);
      setSaved(grants);
      setDraft(grants);
      setActiveRole((current) => current || data.roles[0]?.role || "");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load permissions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  const sensitiveKeys = useMemo(() => new Set((config?.categories || [])
    .flatMap((category) => category.permissions.filter((permission) => permission.sensitive).map((permission) => permission.key))), [config]);
  const current = draft[activeRole] || [];
  const dirty = Boolean(activeRole) && !sameSet(current, saved[activeRole] || []);
  const isDirty = (role) => !sameSet(draft[role] || [], saved[role] || []);
  const activeLabel = config?.roles.find((role) => role.role === activeRole)?.label || "this role";

  const toggle = (key) => {
    setMessage("");
    setDraft((previous) => {
      const granted = previous[activeRole] || [];
      return { ...previous, [activeRole]: granted.includes(key) ? granted.filter((item) => item !== key) : [...granted, key] };
    });
  };

  const reset = () => {
    setDraft((previous) => ({ ...previous, [activeRole]: saved[activeRole] || [] }));
    setMessage("");
    setError("");
  };

  const save = async () => {
    const newlySensitive = current.filter((key) => sensitiveKeys.has(key) && !(saved[activeRole] || []).includes(key));
    if (newlySensitive.length && !window.confirm(
      `You are granting ${newlySensitive.length} sensitive permission(s) to every ${activeLabel} account. Continue?`,
    )) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await saveRolePermissions(activeRole, current);
      setSaved((previous) => ({ ...previous, [activeRole]: response.role.permissions }));
      setDraft((previous) => ({ ...previous, [activeRole]: response.role.permissions }));
      setMessage(`Permissions for ${activeLabel} saved.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save permissions."));
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <DashboardLayout title="Permissions">
        <section className="permissions-page"><p className="card" role="alert">Only an administrator can manage permissions.</p></section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Permissions">
      <section className="permissions-page">
        <header className="permissions-hero card">
          <div>
            <span className="permissions-kicker">Access control</span>
            <h2>Role permissions</h2>
            <p>Choose what each role can do. Changes apply to every account with that role. Administrators, managers and the alpha role always keep full access.</p>
          </div>
          <ShieldCheck size={34} aria-hidden="true" />
        </header>

        {loading && <p role="status">Loading permissions…</p>}
        {error && <p className="permissions-message is-error" role="alert">{error}</p>}

        {config && (
          <>
            <div className="permissions-roles card" role="tablist" aria-label="Role">
              {config.roles.map((role) => (
                <button
                  key={role.role}
                  type="button"
                  role="tab"
                  aria-selected={activeRole === role.role}
                  className={activeRole === role.role ? "is-active" : ""}
                  onClick={() => { setActiveRole(role.role); setMessage(""); }}
                >
                  {role.label}
                  {isDirty(role.role) && <span className="permissions-unsaved" title="Unsaved changes" />}
                </button>
              ))}
              <span className="permissions-fixed"><Lock size={14} /> Admin, Alpha and Manager: full access (not editable)</span>
            </div>

            {config.categories.map((category) => (
              <fieldset key={category.key} className="permissions-category card">
                <legend>{category.label}</legend>
                <div className="permissions-grid">
                  {category.permissions.map((permission) => (
                    <label key={permission.key} className="permissions-item">
                      <input type="checkbox" checked={current.includes(permission.key)} onChange={() => toggle(permission.key)} />
                      <span>
                        <strong>{permission.label}</strong>
                        <span className="permissions-tags">
                          <em className={`permissions-tag is-${permission.enforcement}`}>{ENFORCEMENT_LABELS[permission.enforcement]}</em>
                          {permission.sensitive && <em className="permissions-tag is-sensitive">Sensitive</em>}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="permissions-actions card">
              <span role="status">{message || (dirty ? "You have unsaved changes." : "No unsaved changes.")}</span>
              <div>
                <button type="button" className="permissions-reset" onClick={reset} disabled={!dirty || saving}><RotateCcw size={16} />Reset to previous settings</button>
                <button type="button" className="permissions-save" onClick={save} disabled={!dirty || saving}><Save size={16} />{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}

export default AdminPermissions;
