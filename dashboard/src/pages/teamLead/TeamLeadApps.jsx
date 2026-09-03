import {
  Download,
  Info,
} from "lucide-react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadApps.css";

function TeamLeadApps() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sai Teja Kanjarla";

  // ==========================================
  // WINDOWS APP DOWNLOAD
  // ==========================================
  const handleWindowsDownload = () => {
    const link = document.createElement("a");

    link.href = "https://github.com/ORUGANTIVINODKUMAR/handdy-workspace/releases/download/v1.2.0/Handdy-Setup.exe";
    link.download = "Handdy-Setup.exe";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <div className="tl-apps-layout">

      <TeamLeadSidebar />

      <main className="tl-apps-main">

        {/* TOP BAR */}
        <header className="tl-apps-topbar">

          <div />

          <div className="tl-apps-user">

            <span className="tl-apps-user-icon">
              ♙
            </span>

            <strong>
              {employeeName}
            </strong>

          </div>

        </header>

        {/* PAGE CONTENT */}
        <div className="tl-apps-content">

          <h1>
            Apps
          </h1>

          <section className="tl-apps-card">

            <h2>
              You can track your time only using this desktop
              timer software application.
            </h2>

            <div className="tl-apps-grid">

              {/* ==============================
                  WINDOWS
              ============================== */}

              <div className="tl-app-item">

                <div className="tl-windows-logo">
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
                  className="tl-windows-download"
                  onClick={handleWindowsDownload}
                >
                  Download

                  <Download size={18} />
                </button>

              </div>

              {/* ==============================
                  MAC
              ============================== */}

              <div className="tl-app-item">

                <div className="tl-apple-logo">
                  ●
                </div>

                <h3>
                  Mac OS X
                </h3>

                <p className="tl-app-info-line">

                  Desktop timer

                  <Info size={15} />

                </p>

                <small>
                  Compatible with macOS 11
                  (Big Sur) and macOS 12
                  (Monterey)
                </small>

              </div>

              {/* ==============================
                  UBUNTU
              ============================== */}

              <div className="tl-app-item">

                <div className="tl-ubuntu-logo">
                  ◉
                </div>

                <h3>
                  Ubuntu
                </h3>

                <p className="tl-app-info-line">

                  Desktop timer

                  <Info size={15} />

                </p>

                <small>
                  Compatible with Ubuntu 20.04
                </small>

                <button
                  type="button"
                  className="tl-install-link"
                  onClick={() => window.alert("Ubuntu installer support will be added during the Electron packaging phase. Use the Windows installer for the current build.")}
                >
                  Download Installation instructions
                </button>

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

export default TeamLeadApps;
