import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Mail, UserRound } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuth from "../../context/useAuth";
import { getEmployeeById, getMyTeamMemberById } from "../../api/employeeApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

import "../../styles/employeeDetails.css";

function EmployeeDetailsPage() {
  const { employeeId } = useParams();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        setLoading(true);
        setError("");
        const data = user?.role === "team_lead"
          ? await getMyTeamMemberById(employeeId)
          : await getEmployeeById(employeeId);
        setEmployee(data.employee || null);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load this employee."));
      } finally {
        setLoading(false);
      }
    };

    void loadEmployee();
  }, [employeeId, user?.role]);

  return (
    <DashboardLayout title="Employee details">
      <div className="employee-details-page">
        <Link className="employee-details-back" to="/employees">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to employees
        </Link>

        {loading && <section className="card employee-details-state">Loading employee…</section>}
        {!loading && error && (
          <section className="card employee-details-state error-message" role="alert">{error}</section>
        )}

        {!loading && !error && employee && (
          <section className="card employee-details-card">
            <header className="employee-details-header">
              <div className="employee-details-avatar" aria-hidden="true">
                {(employee.fullName || "E").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="employee-details-kicker">{employee.employeeId}</span>
                <h2>{employee.fullName}</h2>
                <p>{employee.designation || "Employee"}</p>
              </div>
              <span className={`employee-details-status ${employee.isActive ? "active" : "inactive"}`}>
                {employee.isActive ? "Active" : "Inactive"}
              </span>
            </header>

            <div className="employee-details-grid">
              <div><Mail size={18} /><span>Email</span><strong>{employee.email}</strong></div>
              <div><UserRound size={18} /><span>Role</span><strong>{employee.role?.replace("_", " ")}</strong></div>
              <div><BriefcaseBusiness size={18} /><span>Department</span><strong>{employee.department || "Not assigned"}</strong></div>
              <div><BadgeCheck size={18} /><span>Designation</span><strong>{employee.designation || "Not assigned"}</strong></div>
            </div>

            <section className="employee-details-services">
              <h3>Service charge rates</h3>
              {employee.serviceRates?.length ? (
                <div>
                  {employee.serviceRates.map((assignment) => (
                    <article key={assignment.serviceType}>
                      <span>{assignment.serviceType}</span>
                      <strong>${Number(assignment.chargeRate).toFixed(2)} / hour</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <p>Charge rates are not configured for this employee.</p>
              )}
            </section>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

export default EmployeeDetailsPage;
