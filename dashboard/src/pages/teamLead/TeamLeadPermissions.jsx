import { useEffect, useMemo, useState } from "react";
import { getMyTeam } from "../../api/employeeApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadPermissions.css";

function TeamLeadPermissions() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sai Teja Kanjarla";

  const [team, setTeam] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState([
    // Example structure for later backend data:
    // {
    //   id: 1,
    //   name: "Sai Teja Kanjarla",
    //   viewOnly: true,
    //   viewDelete: false,
    // },
  ]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((employee) =>
      employee.name
        .toLowerCase()
        .includes(query)
    );
  }, [employees, search]);

  const handleGo = async () => {
    try {
      setError("");
      const data = await getMyTeam();
      setEmployees((data.employees || []).map((employee) => ({
        id: employee._id,
        name: employee.fullName,
        viewOnly: true,
        viewDelete: false,
      })));
    } catch (requestError) {
      setEmployees([]);
      setError(getApiErrorMessage(requestError, "Unable to load your team."));
    }
  };

  useEffect(() => { void handleGo(); }, []);

  const handlePermissionChange = (
    employeeId,
    field
  ) => {
    setEmployees((previousEmployees) =>
      previousEmployees.map((employee) => {
        if (employee.id !== employeeId) {
          return employee;
        }

        return {
          ...employee,
          [field]: !employee[field],
        };
      })
    );
  };

  return (
    <div className="tl-page">

      <TeamLeadSidebar />

      <div className="tl-main">

        {/* TOP BAR */}
        <header className="tl-topbar">

          <div />

          <div className="tl-user">

            <span className="tl-user-icon">
              ♙
            </span>

            <strong>
              {employeeName}
            </strong>

          </div>

        </header>

        {/* CONTENT */}
        <main className="tl-content">

          <div className="tl-permissions-page">

            <h1>
              Setup permissions for employees
            </h1>

            <section className="tl-permissions-card">

              {/* TEAM FILTER */}
              <div className="tl-permissions-team-row">

                <select
                  value={team}
                  onChange={(event) =>
                    setTeam(event.target.value)
                  }
                >
                  <option value="">
                    Select team
                  </option>

                  <option value="WCPA">
                    WCPA
                  </option>

                  <option value="Tax">
                    Tax
                  </option>
                </select>

                <button
                  type="button"
                  className="tl-permissions-go"
                  onClick={handleGo}
                >
                  Go
                </button>

              </div>

              {/* SEARCH */}
              <div className="tl-permissions-search-row">

                <label htmlFor="permission-search">
                  Search:
                </label>

                <input
                  id="permission-search"
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

              </div>

              {/* TABLE */}
              <div className="tl-permissions-table-wrapper">

                {error && <p className="error-message" role="alert">{error}</p>}

                <table className="tl-permissions-table">

                  <thead>

                    <tr>
                      <th
                        rowSpan="2"
                        className="tl-permissions-employee-heading"
                      >
                        Employee name
                      </th>

                      <th
                        colSpan="2"
                        className="tl-permissions-screenshot-heading"
                      >
                        Screenshots
                      </th>
                    </tr>

                    <tr>

                      <th className="tl-permissions-subheading">
                        <div className="tl-permission-option">

                          <span>
                            View only
                          </span>

                          <input
                            type="checkbox"
                            disabled
                            aria-label="View only header"
                          />

                        </div>
                      </th>

                      <th className="tl-permissions-subheading">
                        <div className="tl-permission-option">

                          <span>
                            View and Delete
                          </span>

                          <input
                            type="checkbox"
                            disabled
                            aria-label="View and Delete header"
                          />

                        </div>
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan="3"
                          className="tl-permissions-empty"
                        >
                          No record found
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map(
                        (employee) => (
                          <tr key={employee.id}>

                            <td>
                              {employee.name}
                            </td>

                            <td className="tl-permissions-checkbox-cell">
                              <input
                                type="checkbox"
                                checked={
                                  employee.viewOnly
                                }
                                onChange={() =>
                                  handlePermissionChange(
                                    employee.id,
                                    "viewOnly"
                                  )
                                }
                              />
                            </td>

                            <td className="tl-permissions-checkbox-cell">
                              <input
                                type="checkbox"
                                checked={
                                  employee.viewDelete
                                }
                                onChange={() =>
                                  handlePermissionChange(
                                    employee.id,
                                    "viewDelete"
                                  )
                                }
                              />
                            </td>

                          </tr>
                        )
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </div>

        </main>

        {/* FOOTER */}
        <footer className="tl-footer">

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

export default TeamLeadPermissions;
