import { useId, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import "../../styles/adminSettings.css";

function AdminSettings() {
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("mm-dd-yyyy");

  const [reportOption, setReportOption] =
    useState("work-break");

  const [closedReports, setClosedReports] =
    useState(true);

  const [breakInactiveMinutes, setBreakInactiveMinutes] =
    useState(3);

  const [logoutInactiveMinutes, setLogoutInactiveMinutes] =
    useState(50);

  const [manualTime, setManualTime] =
    useState(false);

  const [startTimerPopup, setStartTimerPopup] =
    useState(false);

  const [allowNotes, setAllowNotes] =
    useState(true);

  const [allowCount, setAllowCount] =
    useState(true);

  const [trackApplications, setTrackApplications] =
    useState(true);

  const [trackWebsites, setTrackWebsites] =
    useState(true);

  const [trackKeyboardMouse, setTrackKeyboardMouse] =
    useState(true);

  const [screenshotMinutes, setScreenshotMinutes] =
    useState(20);

  const [blurScreenshots, setBlurScreenshots] =
    useState(true);

  const [ipRestriction, setIpRestriction] =
    useState(false);

  const [singleCompanySession, setSingleCompanySession] =
    useState(true);

  const [singleEmployeeSession, setSingleEmployeeSession] =
    useState(true);

  const [employees, setEmployees] =
    useState("");

  const handleSave = () => {
    const settings = {
      timezone,
      dateFormat,
      reportOption,
      closedReports,
      breakInactiveMinutes,
      logoutInactiveMinutes,
      manualTime,
      startTimerPopup,
      allowNotes,
      allowCount,
      trackApplications,
      trackWebsites,
      trackKeyboardMouse,
      screenshotMinutes,
      blurScreenshots,
      ipRestriction,
      singleCompanySession,
      singleEmployeeSession,
      employees,
    };

    localStorage.setItem("handdy-admin-settings", JSON.stringify(settings));
    alert("Settings saved successfully.");
  };

  return (
    <DashboardLayout title="Settings">
      <section className="settings-page">
        <div className="settings-card">

          {/* TOP SAVE */}
          <div className="settings-top-save">
            <button
              type="button"
              className="settings-save-button"
              onClick={handleSave}
            >
              Save settings
            </button>
          </div>

          {/* =====================================
              TIMEZONE
          ===================================== */}
          <div className="settings-section">
            <div className="settings-label-row">
              <h3>Select default timezone</h3>

              <span>
                (Used to determine when your day starts & ends)
              </span>
            </div>

            <select
              className="settings-select timezone-select"
              value={timezone}
              onChange={(event) =>
                setTimezone(event.target.value)
              }
            >
              <option value="Asia/Kolkata">
                (GMT +5:30) Bombay, Calcutta, Chennai, New Delhi
              </option>

              <option value="UTC">
                (GMT +0:00) UTC
              </option>

              <option value="America/New_York">
                (GMT -5:00) Eastern Time
              </option>

              <option value="America/Chicago">
                (GMT -6:00) Central Time
              </option>

              <option value="America/Denver">
                (GMT -7:00) Mountain Time
              </option>

              <option value="America/Los_Angeles">
                (GMT -8:00) Pacific Time
              </option>
            </select>
          </div>

          {/* =====================================
              DATE FORMAT
          ===================================== */}
          <div className="settings-section">
            <h3>Date Format</h3>

            <label className="settings-option">
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "mm-dd-yyyy"}
                onChange={() =>
                  setDateFormat("mm-dd-yyyy")
                }
              />

              <span>
                mm-dd-yyyy (eg: 12-12-2013)
              </span>
            </label>

            <label className="settings-option">
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "mmm-dd-yyyy"}
                onChange={() =>
                  setDateFormat("mmm-dd-yyyy")
                }
              />

              <span>
                mmm dd, yyyy (eg: Dec 12, 2013)
              </span>
            </label>

            <label className="settings-option">
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "dd-mm-yyyy"}
                onChange={() =>
                  setDateFormat("dd-mm-yyyy")
                }
              />

              <span>
                dd-mm-yyyy (eg: 01-07-2013)
              </span>
            </label>

            <label className="settings-option">
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "dd-mmm-yyyy"}
                onChange={() =>
                  setDateFormat("dd-mmm-yyyy")
                }
              />

              <span>
                dd mmm yyyy (eg: 01 Jun 2013)
              </span>
            </label>

            <label className="settings-option">
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "yyyy-mm-dd"}
                onChange={() =>
                  setDateFormat("yyyy-mm-dd")
                }
              />

              <span>
                yyyy-mm-dd (eg: 2013-07-01)
              </span>
            </label>
          </div>

          {/* =====================================
              REPORT
          ===================================== */}
          <div className="settings-section">
            <h3>Report</h3>

            <label className="settings-option">
              <input
                type="radio"
                name="report"
                checked={reportOption === "work"}
                onChange={() =>
                  setReportOption("work")
                }
              />

              <span>
                Show work time only in all reports
              </span>
            </label>

            <label className="settings-option">
              <input
                type="radio"
                name="report"
                checked={
                  reportOption === "work-break"
                }
                onChange={() =>
                  setReportOption("work-break")
                }
              />

              <span>
                Show work time and break time in all reports
              </span>
            </label>

            <label className="settings-option checkbox-option">
              <input
                type="checkbox"
                checked={closedReports}
                onChange={(event) =>
                  setClosedReports(
                    event.target.checked
                  )
                }
              />

              <span>
                Display closed team and employee reports
              </span>
            </label>
          </div>

          {/* =====================================
              IDLE / LOGOUT
          ===================================== */}
          <div className="settings-section">
            <h3>Idle and Logout</h3>

            <div className="settings-inline">
              <span>
                Show break message in desktop timer if inactive for
              </span>

              <input
                className="settings-small-input"
                type="number"
                min="1"
                value={breakInactiveMinutes}
                onChange={(event) =>
                  setBreakInactiveMinutes(
                    event.target.value
                  )
                }
              />

              <span>Minutes</span>
            </div>

            <div className="settings-inline">
              <span>
                Logout of desktop timer if inactive for
              </span>

              <input
                className="settings-small-input"
                type="number"
                min="1"
                value={logoutInactiveMinutes}
                onChange={(event) =>
                  setLogoutInactiveMinutes(
                    event.target.value
                  )
                }
              />

              <span>Minutes</span>
            </div>
          </div>

          {/* =====================================
              TIMER
          ===================================== */}
          <div className="settings-section">
            <h3>Timer</h3>

            <label className="settings-option checkbox-option">
              <input
                type="checkbox"
                checked={manualTime}
                onChange={(event) =>
                  setManualTime(event.target.checked)
                }
              />

              <span>Add time manually</span>

              <span className="settings-info">i</span>
            </label>

            <SettingYesNo
              label={'Do not show "Start your timer" pop up'}
              value={startTimerPopup}
              onChange={setStartTimerPopup}
            />

            <SettingYesNo
              label="Allow employees to add notes in the timer"
              value={allowNotes}
              onChange={setAllowNotes}
            />

            <SettingYesNo
              label="Allow employees to add count in the timer"
              value={allowCount}
              onChange={setAllowCount}
            />
          </div>

          {/* =====================================
              MONITORING
          ===================================== */}
          <div className="settings-section monitoring-section">
            <h3>Employee monitoring</h3>

            <SettingYesNo
              label="1) Track software applications"
              value={trackApplications}
              onChange={setTrackApplications}
            />

            <SettingYesNo
              label="2) Track website url's"
              value={trackWebsites}
              onChange={setTrackWebsites}
            />

            <SettingYesNo
              label={
                <>
                  3) Monitor keystroke count & Mouse click count
                  <small>
                    (Only in Windows and Ubuntu)
                  </small>
                </>
              }
              value={trackKeyboardMouse}
              onChange={setTrackKeyboardMouse}
            />

            <div className="settings-inline">
              <span>
                4) Capture screenshots every
              </span>

              <input
                className="settings-small-input"
                type="number"
                min="1"
                value={screenshotMinutes}
                onChange={(event) =>
                  setScreenshotMinutes(
                    event.target.value
                  )
                }
              />

              <span>minutes</span>
            </div>

            <SettingYesNo
              label="5) Blur screenshots"
              value={blurScreenshots}
              onChange={setBlurScreenshots}
            />

            <button
              type="button"
              className="settings-text-link"
            >
              Blur screenshots settings
            </button>
          </div>

          {/* =====================================
              IP RESTRICTIONS
          ===================================== */}
          <div className="settings-section">
            <h3>IP restrictions</h3>

            <p className="settings-description">
              Allow employees to access timer only from these IP
              addresses
              <span className="settings-info">i</span>
            </p>

            <div className="yes-no-group">
              <label>
                <input
                  type="radio"
                  name="ipRestriction"
                  checked={ipRestriction}
                  onChange={() =>
                    setIpRestriction(true)
                  }
                />
                Yes
              </label>

              <label>
                <input
                  type="radio"
                  name="ipRestriction"
                  checked={!ipRestriction}
                  onChange={() =>
                    setIpRestriction(false)
                  }
                />
                No
              </label>
            </div>
          </div>

          {/* =====================================
              SESSION SETTINGS
          ===================================== */}
          <div className="settings-section">
            <h3>
              Session settings for only web
              <span className="settings-info">i</span>
            </h3>

            <label className="settings-option checkbox-option">
              <input
                type="checkbox"
                checked={singleCompanySession}
                onChange={(event) =>
                  setSingleCompanySession(
                    event.target.checked
                  )
                }
              />

              <span>
                Enable single session for company (Registered Account)
              </span>
            </label>

            <label className="settings-option checkbox-option">
              <input
                type="checkbox"
                checked={singleEmployeeSession}
                onChange={(event) =>
                  setSingleEmployeeSession(
                    event.target.checked
                  )
                }
              />

              <span>
                Enable single session for employees
              </span>
            </label>

            <div className="settings-employee-select">
              <div className="settings-label-row">
                <h3>Select employee</h3>

                <span>
                  (To allow single session)
                </span>
              </div>

              <select
                className="settings-select"
                value={employees}
                onChange={(event) =>
                  setEmployees(event.target.value)
                }
              >
                <option value="">
                  Employee(s)
                </option>

                <option value="all">
                  All Employees
                </option>

                <option value="admin">
                  System Admin
                </option>
              </select>
            </div>
          </div>

          {/* BOTTOM SAVE */}
          <div className="settings-bottom-save">
            <button
              type="button"
              className="settings-save-button"
              onClick={handleSave}
            >
              Save settings
            </button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

function SettingYesNo({
  label,
  value,
  onChange,
}) {
  const generatedId = useId();
  const name =
    typeof label === "string"
      ? label.replace(/\s+/g, "-")
      : generatedId;

  return (
    <div className="settings-yes-no-row">
      <div className="settings-yes-no-label">
        {label}
      </div>

      <div className="yes-no-group">
        <label>
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
          />
          Yes
        </label>

        <label>
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
          />
          No
        </label>
      </div>
    </div>
  );
}

export default AdminSettings;
