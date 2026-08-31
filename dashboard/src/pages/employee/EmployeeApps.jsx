import { Download, Info } from "lucide-react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";
import "../../styles/employeeApps.css";

function EmployeeApps() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sujith Madugula";

  const handleWindowsDownload = () => {
    const link = document.createElement("a");

    link.href = "/downloads/Handdy-Setup.exe";
    link.download = "Handdy-Setup.exe";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  const handleUbuntuInstructions = () => {
    window.alert("Ubuntu installer support will be added during the Electron packaging phase. Use the Windows installer for the current build.");
  };

  return (
    <div className="employee-page">

      <EmployeeSidebar />

      <div className="employee-main">

        {/* TOP BAR */}
        <header className="employee-topbar">

          <div />

          <div className="employee-user">

            <span className="employee-user-icon">
              ♙
            </span>

            <strong>
              {employeeName}
            </strong>

          </div>

        </header>

        {/* CONTENT */}
        <main className="employee-content">

          <div className="employee-apps-page">

            <h1>
              Apps
            </h1>

            <section className="employee-apps-card">

              <h2>
                You can track your time only using this desktop timer software application.
              </h2>

              <p className="employee-apps-description">
                Install this application on your PC. Login and start the timer.
                Data is synchronized with the website once every 10 minutes.
              </p>

              <div className="employee-apps-grid">

                {/* WINDOWS */}
                <div className="employee-app-item">

                  <div className="employee-windows-logo">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <h3>
                    Windows 7 (64-bit), 10 and 11
                  </h3>

                  <p>
                    Download the desktop timer
                  </p>

                  <button
                    type="button"
                    className="employee-windows-download"
                    onClick={handleWindowsDownload}
                  >
                    Download

                    <Download size={18} />
                  </button>

                </div>

                {/* MAC */}
                <div className="employee-app-item">

                  <div className="employee-apple-logo">
                    ●
                  </div>

                  <h3>
                    Mac OS X
                  </h3>

                  <p className="employee-app-info-line">
                    Desktop timer

                    <Info size={15} />
                  </p>

                  <small>
                    Compatible with macOS 11 (Big Sur) and macOS 12 (Monterey)
                  </small>

                </div>

                {/* UBUNTU */}
                <div className="employee-app-item">

                  <div className="employee-ubuntu-logo">
                    ◉
                  </div>

                  <h3>
                    Ubuntu
                  </h3>

                  <p className="employee-app-info-line">
                    Desktop timer

                    <Info size={15} />
                  </p>

                  <small>
                    Compatible with Ubuntu 20.04
                  </small>

                  <button
                    type="button"
                    className="employee-install-link"
                    onClick={handleUbuntuInstructions}
                  >
                    Download Installation instructions
                  </button>

                </div>

              </div>

            </section>

          </div>

        </main>

        {/* FOOTER */}
        <footer className="employee-footer">

          <span>
            Copyright 2026
          </span>

          <strong>
            Handdy.com
          </strong>

          <span>
            . All rights reserved
          </span>

        </footer>

      </div>

    </div>
  );
}

export default EmployeeApps;
