import { useEffect, useState } from "react";
import { Download, MonitorDown, RefreshCw, ShieldCheck } from "lucide-react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";
import "../../styles/employeeApps.css";

const DEFAULT_RELEASE = {
  latestVersion: "1.2.0",
  platform: "Windows",
  fileName: "Handdy-Setup.exe",
  fileSize: "106 MB",
  downloadUrl: "https://github.com/ORUGANTIVINODKUMAR/handdy-workspace/releases/download/v1.2.0/Handdy-Setup.exe",
  releaseDate: "2026-09-03",
  releaseNotes: [],
};

function EmployeeApps() {
  const [release, setRelease] = useState(DEFAULT_RELEASE);
  const [releaseError, setReleaseError] = useState("");
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
        setRelease({ ...DEFAULT_RELEASE, ...details });
        setReleaseError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setReleaseError("The latest release details could not be refreshed. The installer is still available below.");
        }
      });

    return () => controller.abort();
  }, []);

  const formattedReleaseDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${release.releaseDate}T00:00:00`));

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
            <h1>Handdy App</h1>

            <section className="employee-apps-card">
              <div className="employee-apps-intro">
                <div>
                  <span className="employee-apps-eyebrow">DESKTOP TIME TRACKER</span>
                  <h2>Download the latest Handdy desktop app</h2>
                  <p className="employee-apps-description">
                    Use the desktop app to track project time, activity and idle time. Your records are securely synchronized with the Handdy dashboard.
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
                  <h3>Handdy for {release.platform}</h3>
                  <div className="employee-release-meta">
                    <span>Version {release.latestVersion}</span>
                    <span>Released {formattedReleaseDate}</span>
                    <span>Windows 10 and 11 (64-bit)</span>
                  </div>
                  <p>File: {release.fileName}{release.fileSize ? ` (${release.fileSize})` : ""}</p>
                </div>

                <a className="employee-windows-download" href={release.downloadUrl} download>
                  Download latest version
                  <Download size={18} aria-hidden="true" />
                </a>
              </div>

              <div className="employee-apps-info-grid">
                <section>
                  <div className="employee-apps-info-heading">
                    <RefreshCw size={20} aria-hidden="true" />
                    <h3>How updates work</h3>
                  </div>
                  <ol>
                    <li>Handdy checks for a new version when it starts and every six hours.</li>
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
                    <p>Latest Handdy desktop timer and update notifications.</p>
                  )}
                </section>
              </div>

              <p className="employee-apps-note">
                Close Handdy before running the downloaded installer. Company antivirus software may ask you to confirm the installation.
              </p>
            </section>
          </div>
        </main>

        <footer className="employee-footer">
          <span>Copyright 2026 </span><strong>Handdy.com</strong><span>. All rights reserved</span>
        </footer>
      </div>
    </div>
  );
}

export default EmployeeApps;
