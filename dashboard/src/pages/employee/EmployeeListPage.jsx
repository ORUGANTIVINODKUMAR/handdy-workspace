import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      setError("");

      try {
        let data;

        if (user?.role === "admin") {
          data = await getEmployees();
        } else if (user?.role === "team_lead") {
          data = await getMyTeam();
        } else {
          setEmployees([]);
          return;
        }

        setEmployees(data.employees || []);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
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
      </section>
    </DashboardLayout>
  );
}

export default EmployeeListPage;
