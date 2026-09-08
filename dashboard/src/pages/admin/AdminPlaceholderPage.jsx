import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, ExternalLink, Plus, Trash2 } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import AdminHelp from "./AdminHelp";
import AdminReportPage from "./AdminReportPage";

import "../../styles/adminWorkspace.css";

const reportTitles = new Set([
  "Productivity report",
  "Productive hours",
  "Projects worked on",
  "Productive employees",
]);

const trackingReports = {
  "Categories worked": "classified activity",
  "Productive websites": "productive website activity",
  "Productive applications": "productive application activity",
};

const classificationTitles = new Set(["Websites", "Applications", "Category"]);

const workspaceContent = {
  Permissions: {
    text: "Role permissions are enforced by the backend for Admin, Team Lead, and Employee accounts.",
    actions: [["Manage employees", "/admin/employees"], ["Manage teams", "/admin/team"]],
  },
  Subscription: {
    text: "This installation is running as a local company deployment. No external billing provider is connected.",
    actions: [["Review settings", "/admin/settings"]],
  },
  Integrations: {
    text: "The dashboard, backend API, MongoDB data, and desktop timer are the active integrations in this installation.",
    actions: [["Desktop applications", "/admin/apps"], ["System settings", "/admin/settings"]],
  },
  Apps: {
    text: "The CRM desktop timer is included in this project and connects to the same employee account and API.",
    actions: [["Setup instructions", "/admin/getting-started"]],
  },
  "Getting started": {
    text: "Complete the company setup in order, then employees can use the desktop timer.",
    actions: [["1. Add employees", "/admin/employees"], ["2. Create projects", "/admin/projects"], ["3. Create tasks", "/admin/tasks"], ["4. Configure schedules", "/admin/scheduler/schedule"], ["5. Review apps", "/admin/apps"]],
  },
};

function ClassificationWorkspace({ title }) {
  const storageKey = `handdy-classification-${title.toLowerCase()}`;
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [value, setValue] = useState("");

  const save = (nextItems) => {
    setItems(nextItems);
    localStorage.setItem(storageKey, JSON.stringify(nextItems));
  };

  const addItem = (event) => {
    event.preventDefault();
    const cleanValue = value.trim();
    if (!cleanValue || items.some((item) => item.toLowerCase() === cleanValue.toLowerCase())) return;
    save([...items, cleanValue]);
    setValue("");
  };

  return (
    <DashboardLayout title={`${title} classification`}>
      <div className="admin-workspace-page">
        <section className="card admin-workspace-card">
          <span className="admin-workspace-kicker">Classification</span>
          <h2>Manage {title.toLowerCase()}</h2>
          <p>Items are saved on this device and will be available when configuring Electron activity classification.</p>
          <form className="admin-workspace-add" onSubmit={addItem}>
            <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${title.toLowerCase()} item`} aria-label={`Add ${title.toLowerCase()} item`} />
            <button type="submit"><Plus size={16} />Add</button>
          </form>
          <div className="admin-workspace-list">
            {items.length === 0 && <p>No classification items added yet.</p>}
            {items.map((item) => <div key={item}><span>{item}</span><button type="button" aria-label={`Remove ${item}`} onClick={() => save(items.filter((entry) => entry !== item))}><Trash2 size={15} /></button></div>)}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function AdminPlaceholderPage({ title, description }) {
  const content = useMemo(() => workspaceContent[title] || { text: description, actions: [] }, [description, title]);

  if (title === "Help") return <AdminHelp />;
  if (title === "My Attendance") return <AdminReportPage title="My attendance" description="Your check-in and check-out history." mode="attendance" scope="personal" />;
  if (title === "Website usage details") return <AdminReportPage title={title} description="Website activity received from the desktop application." mode="tracking" trackingLabel="website activity" />;
  if (trackingReports[title]) return <AdminReportPage title={title} description="Productivity activity received from the desktop application." mode="tracking" trackingLabel={trackingReports[title]} />;
  if (reportTitles.has(title)) return <AdminReportPage title={title} description="Productivity calculated from recorded project and task timer activity." mode="time" />;
  if (classificationTitles.has(title)) return <ClassificationWorkspace title={title} />;

  return (
    <DashboardLayout title={title}>
      <div className="admin-workspace-page">
        <section className="card admin-workspace-card">
          <span className="admin-workspace-kicker">Admin workspace</span>
          <h2>{title}</h2>
          <p>{content.text}</p>

          {title === "Apps" && (
            <div className="admin-workspace-notice"><Download size={20} /><div><strong>CRM desktop timer</strong><span>Source is available in the desktop-app folder. The installer will be prepared after the dashboard completion pass.</span></div></div>
          )}

          <div className="admin-workspace-actions">
            {content.actions.map(([label, path]) => <Link key={path} to={path}><ExternalLink size={15} />{label}</Link>)}
          </div>

          <div className="admin-workspace-ready"><CheckCircle2 size={17} /><span>This tab is connected and ready for the current local deployment.</span></div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminPlaceholderPage;
