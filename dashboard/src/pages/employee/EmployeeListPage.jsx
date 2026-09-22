import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuth from "../../context/useAuth";
import {
  getEmployees,
  getMyTeam,
} from "../../api/employeeApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function EmployeeListPage() {
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const latestRequestRef = useRef(0);

  const loadEmployees = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isCurrent = () => latestRequestRef.current === requestId;

    setIsLoading(true);
    setError("");

    try {
      let data;

      if (user?.role === "admin") {
        data = await getEmployees({ page, limit });
      } else if (user?.role === "team_lead") {
        data = await getMyTeam({ page, limit });
      } else {
        if (!isCurrent()) return;
        setEmployees([]);
        setTotalPages(1);
        setTotalEmployees(0);
        return;
      }

      if (!isCurrent()) return;
      setEmployees(data.employees || []);
      setTotalPages(Math.max(data.totalPages || 1, 1));
      setTotalEmployees(data.totalEmployees ?? (data.employees || []).length);
    } catch (requestError) {
      if (!isCurrent()) return;
      setError(getApiErrorMessage(requestError));
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [user, page, limit]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    setPage(1);
  }, [user?.role]);

  const pageTitle =
    user?.role === "team_lead"
      ? "My Team"
      : "Employee Management";

  return (
    <DashboardLayout title={pageTitle}>
      <section className="card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">
              {user?.role === "team_lead"
                ? "Assigned employees"
                : "Company employees"}
            </p>

            <h2>
              {user?.role === "team_lead"
                ? "My Team"
                : "Employees"}
            </h2>
          </div>

          {user?.role === "admin" && (
            <Link
              to="/admin/employees"
              state={{ openAddEmployee: true }}
            >
              Add Employee
            </Link>
          )}
        </div>

        {isLoading && (
          <p role="status">
            Loading employees...
          </p>
        )}

        {!isLoading && error && (
          <p className="status-message error-message" role="alert">
            {error}
          </p>
        )}

        {!isLoading &&
          !error &&
          employees.length === 0 && (
            <p className="status-message info-message">
              {user?.role === "team_lead"
                ? "No employees are currently assigned to your team."
                : "No employees found."}
            </p>
          )}

        {!isLoading &&
          !error &&
          employees.length > 0 && (
            <div className="employee-table-wrapper">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee._id}>
                      <td>{employee.employeeId}</td>

                      <td>{employee.fullName}</td>

                      <td>{employee.email}</td>

                      <td>
                        {employee.role?.replace("_", " ")}
                      </td>

                      <td>
                        {employee.department || "—"}
                      </td>

                      <td>
                        {employee.isActive
                          ? "Active"
                          : "Inactive"}
                      </td>

                      <td>
                        <Link to={`/employees/${employee._id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {!isLoading && !error && employees.length > 0 && (
          <div className="employees-pagination" aria-label="Employee table pagination">
            <div className="employees-page-size">
              <span>{totalEmployees} employee{totalEmployees === 1 ? "" : "s"}</span>
              <label htmlFor="employee-list-page-size">Show</label>
              <select
                id="employee-list-page-size"
                value={limit}
                onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>per page</span>
            </div>

            <div className="employees-page-controls">
              <span>Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                <ChevronLeft size={15} aria-hidden="true" />
                Previous
              </button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
                Next
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default EmployeeListPage;
