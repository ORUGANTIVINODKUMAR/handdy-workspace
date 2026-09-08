import { useEffect, useState } from "react";
import { Download, MonitorDown, RefreshCw, ShieldCheck } from "lucide-react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";
import "../../styles/employeeApps.css";

const DEFAULT_RELEASE = {
  latestVersion: "",
  platform: "Windows",
  fileName: "Handdy-Setup.exe",
  fileSize: "",
  downloadUrl: "",
  releaseDate: "",
  releaseNotes: [],
};

function EmployeeApps() {
  const [release, setRelease] = useState(DEFAULT_RELEASE);
  const [releaseError, setReleaseError] = useState("");
  const [loading, setLoading] = useState(true);
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeName = storedUser.fullName || storedUser.name || "Employee";

  useEffect(() => {
    const controller = new AbortController();

    fetch("/desktop-release.json", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Release details are unavailable");
        return response.json();
      })
      .then((details) => {
        if (!details || typeof details !== "object" || Array.isArray(details)) {
          throw new Error("Invalid release details");
        }
        setRelease({ ...DEFAULT_RELEASE, ...details });
        setReleaseError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setReleaseError("Release details could not be loaded. Please refresh the page to try again.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  let downloadUrl = "";
  try {
    const url = new URL(release.downloadUrl);
    if (url.protocol === "https:" && !url.username && !url.password &&
        !/^(localhost|127\.|\[::1\])|\.localhost$/i.test(url.hostname)) {
      downloadUrl = url.href;
    }
  } catch {
    // Missing or invalid public release URLs leave the download disabled.
  }
  const releaseDate = new Date(`${release.releaseDate}T00:00:00`);
  const formattedReleaseDate = Number.isNaN(releaseDate.getTime()) ? "" : new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(releaseDate);

  return (
    <div className="employee-page">
      <EmployeeSidebar />

      <div className="employee-main">
        <header className="employee-topbar">
          <div />
          <div className="employee-user">
            <span className="employee-user-icon" aria-hidden="true">&#128100;</span>
            <strong>{employeeName}</strong>
          </div>
        </header>

        <main className="employee-content">
          <div className="employee-apps-page">
            <h1>CRM Desktop App</h1>

            <section className="employee-apps-card">
              <div className="employee-apps-intro">
                <div>
                  <span className="employee-apps-eyebrow">DESKTOP TIME TRACKER</span>
                  <h2>Download the latest CRM desktop app</h2>
                  <p className="employee-apps-description">
                    Use the CRM desktop application to track attendance, tasks, timers and working time directly from your computer.
                  </p>
                </div>
                <MonitorDown className="employee-apps-hero-icon" size={72} aria-hidden="true" />
              </div>

              {releaseError && <p className="employee-apps-warning">{releaseError}</p>}

              <div className="employee-release-panel">
                <div className="employee-windows-logo" aria-label="Windows">
                  <span /><span /><span /><span />
                </div>

                <div className="employee-release-details">
                  <h3>CRM for {release.platform}</h3>
                  <div className="employee-release-meta">
                    {release.latestVersion && <span>Current Version: {release.latestVersion}</span>}
                    {formattedReleaseDate && <span>Released {formattedReleaseDate}</span>}
                    <span>Windows 10 and 11 (64-bit)</span>
                  </div>
                  <p>Windows installer{release.fileSize ? ` · ${release.fileSize}` : ""}</p>
                </div>

                {downloadUrl ? <a className="employee-windows-download" href={downloadUrl} download>
                  Download CRM for Windows
                  <Download size={18} aria-hidden="true" />
                </a> : <button type="button" className="employee-windows-download" disabled>
                  {loading ? "Loading release details..." : "Download CRM for Windows"}
                </button>}
              </div>
              {!loading && !downloadUrl && <p className="employee-apps-warning" role="status">Desktop app download is not configured yet.</p>}

              <div className="employee-apps-info-grid">
                <section>
                  <div className="employee-apps-info-heading"><h3>Installation instructions</h3></div>
                  <ol>
                    <li>Download CRM.</li>
                    <li>Open the installer.</li>
                    <li>Complete installation.</li>
                    <li>Open CRM.</li>
                    <li>Sign in using your existing employee email and password.</li>
                  </ol>
                  <p>Use your existing employee credentials to sign in to CRM. No additional account is required.</p>
                </section>
              </div>

              <div className="employee-apps-info-grid">
                <section>
                  <div className="employee-apps-info-heading">
                    <RefreshCw size={20} aria-hidden="true" />
                    <h3>How updates work</h3>
                  </div>
                  <ol>
                    <li>CRM checks for a new version when it starts and every six hours.</li>
                    <li>When an update is available, choose <strong>Open download page</strong>.</li>
                    <li>Download and run the installer. It upgrades the existing app, so you do not need to uninstall it first.</li>
                  </ol>
                </section>

                <section>
                  <div className="employee-apps-info-heading">
                    <ShieldCheck size={20} aria-hidden="true" />
                    <h3>What is included</h3>
                  </div>
                  {Array.isArray(release.releaseNotes) && release.releaseNotes.length > 0 ? (
                    <ul>
                      {release.releaseNotes.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  ) : (
                    <p>Latest CRM desktop timer and update notifications.</p>
                  )}
                </section>
              </div>

              <p className="employee-apps-note">
                Close CRM before running the downloaded installer. Company antivirus software may ask you to confirm the installation.
              </p>
            </section>
          </div>
        </main>

        <footer className="employee-footer">
          <span>Copyright 2026 </span><strong>CRM</strong><span>. All rights reserved</span>
        </footer>
      </div>
    </div>
  );
}

export default EmployeeApps;
