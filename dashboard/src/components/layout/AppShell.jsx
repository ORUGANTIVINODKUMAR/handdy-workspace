import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, CalendarDays, ChevronLeft, ClipboardList, Clock3, LayoutDashboard, LogOut, Menu, Search, Settings2, Users, WalletCards, X } from "lucide-react";
import useAuth from "../../context/useAuth";
import { workspaceNavigation } from "./workspaceNavigation";

const icons = { Workspace: LayoutDashboard, "Time & attendance": Clock3, Finance: WalletCards, System: Settings2 };

export default function AppShell({ children }) {
  const { user, isAuthenticated, isAuthLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => { setMobileOpen(false); setSearch(""); }, [location.pathname]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);
  if (!isAuthenticated || isAuthLoading || /login|password/.test(location.pathname)) return children;

  // HR and Manager both get the full business/operational navigation, same
  // mechanism as admin/team_lead/employee (driven by workspaceNavigation.js).
  const hasDelegatedEmployeeAccess = ["create_employees", "edit_employees"].some(
    (key) => (user?.permissions || []).includes(key),
  );
  const navigation = [
    ...workspaceNavigation.filter((item) => item.role === user?.role),
    ...(user?.role === "team_lead" ? [{ path: "/employees", title: "Team members", group: "Workspace" }] : []),
    // Admin already has this from workspaceNavigation; anyone else only gets
    // it when specifically granted the delegated permission.
    ...(hasDelegatedEmployeeAccess && user?.role !== "admin"
      ? [{ path: "/admin/employees", title: "Employees", group: "Workspace" }]
      : []),
  ];
  const current = navigation.find((item) => item.path === location.pathname);
  const name = user?.fullName || user?.name || "Your account";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const groups = ["Workspace", "Time & attendance", "Finance", "System"].filter((group) => navigation.some((item) => item.group === group));
  const results = search.trim() ? navigation.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())) : [];
  const closeNavigation = () => { setMobileOpen(false); setSearch(""); };
  const signOut = async () => {
    setSigningOut(true);
    setSignOutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setSignOutError("Unable to close the active timer. Check your connection and try again.");
    } finally { setSigningOut(false); }
  };

  return (
    <div className={`crm-workspace${collapsed ? " is-compact" : ""}`}>
      <a className="crm-skip-link" href="#workspace-content">Skip to content</a>
      {mobileOpen && <button className="crm-nav-scrim" aria-label="Close navigation" onClick={closeNavigation} />}
      <aside className={`crm-nav${mobileOpen ? " is-open" : ""}`} aria-label="Workspace navigation">
        <Link className="crm-brand" to={navigation[0]?.path || "/attendance"} onClick={closeNavigation}><span className="crm-brand-mark"><Building2 size={20} /></span><strong>CRM<span>Employee workspace</span></strong></Link>
        <button className="crm-nav-close" onClick={closeNavigation} aria-label="Close navigation"><X size={18} /></button>
        <div className="crm-workspace-label"><span className="crm-workspace-initial">{initials}</span><span>{user?.companyName || "Your workspace"}<small>{user?.role?.replaceAll("_", " ")}</small></span></div>
        <nav>
          {groups.map((group) => {
            const Icon = icons[group] || ClipboardList;
            return <details key={group} open={group === "Workspace" || group === "Time & attendance" || current?.group === group}>
              <summary title={group}><Icon size={15} /><span>{group}</span></summary>
              {navigation.filter((item) => item.group === group).map((item) => <NavLink key={item.path} to={item.path} end title={item.title} onClick={closeNavigation}><span className="crm-nav-dash" /><span>{item.title}</span></NavLink>)}
            </details>;
          })}
        </nav>
        <div className="crm-nav-bottom">
          <NavLink to="/profile" onClick={closeNavigation}><Users size={17} /><span>My profile</span></NavLink>
          <button onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft size={17} /><span>Collapse navigation</span></button>
        </div>
      </aside>
      <div className="crm-stage">
        <header className="crm-topbar">
          <button className="crm-mobile-toggle" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="crm-breadcrumb"><span>Workspace</span><span>/</span><strong>{current?.title || "Details"}</strong></div>
          <div className="crm-route-search"><Search size={16} /><input aria-label="Find a page" placeholder="Find a page…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearch(""); }} />{search && <div className="crm-search-results">{results.length ? results.map((item) => <Link key={item.path} to={item.path} onClick={closeNavigation}>{item.title}<span>Open</span></Link>) : <p>No matching pages</p>}</div>}</div>
          <div className="crm-account"><span className="crm-avatar">{initials}</span><span><strong>{name}</strong><small>{user?.role?.replaceAll("_", " ")}</small></span></div>
          {signOutError && <span className="crm-signout-error" role="alert">{signOutError}</span>}
          <button className="crm-signout" aria-label="Log out" title="Log out" disabled={signingOut} onClick={signOut}><LogOut size={17} /></button>
        </header>
        <main id="workspace-content" className="crm-content" key={location.pathname}>
          <div className="crm-context-line"><span><CalendarDays size={14} />{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span><span>CRM / Workspace</span></div>
          {children}
        </main>
        <footer className="crm-footer"><span>CRM · Employee workspace</span><span>Time. People. Progress.</span></footer>
      </div>
    </div>
  );
}
