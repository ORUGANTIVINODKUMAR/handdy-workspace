import { Link } from "react-router-dom";

import "../../styles/employeeDashboard.css";

export default function HanddyDownloadCard() {
  return (
    <section className="handdy-download-card">
      <div className="handdy-download-content">
        <div>
          <h2>CRM Desktop App</h2>
          <p>Download the CRM desktop application to track your attendance, tasks and working time.</p>
        </div>
        <div className="handdy-download-actions">
          <a href="/downloads/CRM-Setup.exe" className="handdy-download-btn" download>
            Download for Windows
          </a>
          <Link to="/employee/app" className="handdy-download-details">View app details and updates</Link>
        </div>
      </div>
    </section>
  );
}
