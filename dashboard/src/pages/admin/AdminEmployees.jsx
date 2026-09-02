import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getEmployees, resetEmployeePassword } from "../../api/employeeApi";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function AdminEmployees() {
  const location = useLocation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  // ADD EMPLOYEE
  const [showAddEmployee, setShowAddEmployee] = useState(
    Boolean(location.state?.openAddEmployee),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    password: "",
    role: "employee",
    team: "",
  });

  // EDIT EMPLOYEE
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editFormData, setEditFormData] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    role: "employee",
    team: "",
    isActive: true,
  });

  // RESET PASSWORD
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState(null);
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState("");
  const [resetPasswordFormData, setResetPasswordFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // LOAD EMPLOYEES
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = { page, limit };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (teamFilter) {
        params.team = teamFilter;
      }

      const data = await getEmployees(params);

      setEmployees(data.employees || []);
      setTotalPages(Math.max(data.totalPages || 1, 1));
      setTotalEmployees(data.totalEmployees || 0);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load employees."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search, teamFilter, page, limit]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axiosInstance.get("/teams");
        setTeams((response.data.teams || []).filter((team) => team.isActive));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load teams."));
      }
    };
    void fetchTeams();
  }, []);

  useEffect(() => {
    if (location.state?.openAddEmployee) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  // SEARCH
  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
  };

  // DELETE
  const handleDelete = async (employeeId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this employee?"
    );

    if (!confirmed) return;

    try {
      await axiosInstance.delete(
        `/employees/${employeeId}`
      );

      await fetchEmployees();
    } catch (requestError) {
      window.alert(
        getApiErrorMessage(
          requestError,
          "Unable to delete employee."
        )
      );
    }
  };

  // ADD FORM CHANGE
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const updatedData = {
        ...previous,
        [name]: value,
      };

      if (name === "role" && value === "admin") updatedData.team = "";

      return updatedData;
    });
  };

  // RESET ADD FORM
  const resetForm = () => {
    setFormData({
      employeeId: "",
      fullName: "",
      email: "",
      password: "",
      role: "employee",
      team: "",
    });

    setFormError("");
  };

  // CLOSE ADD MODAL
  const closeAddEmployeeModal = () => {
    setShowAddEmployee(false);
    resetForm();
  };

  // ADD EMPLOYEE
  const handleAddEmployee = async (event) => {
    event.preventDefault();

    if (
      !formData.employeeId.trim() ||
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      (formData.role !== "admin" && !formData.team)
    ) {
      setFormError(
        "Employee ID, Full Name, Email, Password and Team are required."
      );

      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await axiosInstance.post("/auth/register", {
        employeeId: formData.employeeId.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        team: formData.role === "admin" ? null : formData.team,
      });

      closeAddEmployeeModal();

      await fetchEmployees();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(
          requestError,
          "Unable to add employee."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // OPEN EDIT
  const openEditEmployee = (employee) => {
    setEditingEmployeeId(employee._id);

    setEditFormData({
      employeeId: employee.employeeId || "",
      fullName: employee.fullName || "",
      email: employee.email || "",
      role: employee.role || "employee",
      team: employee.team?._id || employee.team || "",
      isActive: employee.isActive ?? true,
    });

    setEditError("");
    setShowEditEmployee(true);
  };

  // EDIT FORM CHANGE
  const handleEditFormChange = (event) => {
    const { name, value } = event.target;

    setEditFormData((previous) => {
      const updatedData = {
        ...previous,
        [name]:
          name === "isActive"
            ? value === "true"
            : value,
      };

      if (name === "role" && value === "admin") updatedData.team = "";

      return updatedData;
    });
  };

  // CLOSE EDIT MODAL
  const closeEditEmployeeModal = () => {
    setShowEditEmployee(false);
    setEditingEmployeeId(null);
    setEditError("");
  };

  // UPDATE EMPLOYEE
  const handleUpdateEmployee = async (event) => {
    event.preventDefault();

    if (
      !editFormData.employeeId.trim() ||
      !editFormData.fullName.trim() ||
      !editFormData.email.trim() ||
      (editFormData.role !== "admin" && !editFormData.team)
    ) {
      setEditError(
        "Employee ID, Full Name, Email and Team are required."
      );

      return;
    }

    try {
      setEditSaving(true);
      setEditError("");

      await axiosInstance.put(
        `/employees/${editingEmployeeId}`,
        {
          employeeId:
            editFormData.employeeId.trim(),

          fullName:
            editFormData.fullName.trim(),

          email:
            editFormData.email.trim(),

          role:
            editFormData.role,

          team: editFormData.role === "admin" ? null : editFormData.team,

          isActive:
            editFormData.isActive,
        }
      );

      closeEditEmployeeModal();

      await fetchEmployees();
    } catch (requestError) {
      setEditError(
        getApiErrorMessage(
          requestError,
          "Unable to update employee."
        )
      );
    } finally {
      setEditSaving(false);
    }
  };

  // OPEN RESET PASSWORD
  const openResetPassword = (employee) => {
    setResetPasswordEmployee(employee);
    setResetPasswordFormData({ password: "", confirmPassword: "" });
    setResetPasswordError("");
    setResetPasswordSuccess("");
    setShowResetPassword(true);
  };

  // CLOSE RESET PASSWORD MODAL
  const closeResetPasswordModal = () => {
    setShowResetPassword(false);
    setResetPasswordEmployee(null);
  };

  // RESET PASSWORD FORM CHANGE
  const handleResetPasswordFormChange = (event) => {
    const { name, value } = event.target;

    setResetPasswordFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // SUBMIT RESET PASSWORD
  const handleResetPassword = async (event) => {
    event.preventDefault();

    setResetPasswordError("");
    setResetPasswordSuccess("");

    if (resetPasswordFormData.password.length < 8) {
      setResetPasswordError("Password must contain at least 8 characters.");
      return;
    }

    if (resetPasswordFormData.password !== resetPasswordFormData.confirmPassword) {
      setResetPasswordError("Passwords do not match.");
      return;
    }

    try {
      setResetPasswordSaving(true);

      await resetEmployeePassword(
        resetPasswordEmployee._id,
        resetPasswordFormData.password
      );

      setResetPasswordSuccess("Password reset successfully.");
      setResetPasswordFormData({ password: "", confirmPassword: "" });
      setTimeout(closeResetPasswordModal, 1200);
    } catch (requestError) {
      setResetPasswordError(
        getApiErrorMessage(requestError, "Unable to reset password.")
      );
    } finally {
      setResetPasswordSaving(false);
    }
  };

  return (
    <DashboardLayout title="Employees">

      {/* EMPLOYEE LIST */}
      <section className="admin-card employees-card">
        <div className="employees-page-heading">
          <div>
            <p className="admin-eyebrow">
              EMPLOYEE MANAGEMENT
            </p>

            <h2>Company Employees</h2>
          </div>

          <button
            className="add-employee-button"
            type="button"
            onClick={() =>
              setShowAddEmployee(true)
            }
          >
            + Add Employee
          </button>
        </div>

        {/* SEARCH AND FILTER */}
        <div className="employees-toolbar">
          <form
            className="employees-search"
            onSubmit={handleSearch}
          >
            <input
              type="search"
              placeholder="Search employee..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />

            <button type="submit">
              Search
            </button>
          </form>

          <select
            className="employees-team-filter"
            value={teamFilter}
            onChange={(event) => { setTeamFilter(event.target.value); setPage(1); }}
            aria-label="Filter employees by team"
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>

        {/* ERROR */}
        {error && (
          <p
            className="admin-error-box"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* EMPLOYEE TABLE */}
        <div className="employees-table-wrapper">
          <table className="employees-table">

            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee._id}>

                    <td>
                      {employee.employeeId || "-"}
                    </td>

                    <td>
                      {employee.fullName || "-"}
                    </td>

                    <td>
                      {employee.email || "-"}
                    </td>

                    <td>
                      {employee.role
                        ?.replace("_", " ") || "-"}
                    </td>

                    <td>{employee.team?.teamName || "-"}</td>

                    <td>
                      <span
                        className={
                          employee.isActive
                            ? "employee-status active"
                            : "employee-status inactive"
                        }
                      >
                        {employee.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="employee-actions">

                        <button
                          className="edit-action-button"
                          type="button"
                          onClick={() =>
                            openEditEmployee(employee)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="edit-action-button"
                          type="button"
                          onClick={() =>
                            openResetPassword(employee)
                          }
                        >
                          Reset Password
                        </button>

                        <button
                          className="delete-action-button"
                          type="button"
                          onClick={() =>
                            handleDelete(employee._id)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="employees-pagination" aria-label="Employee table pagination">
          <div className="employees-page-size">
            <span>{totalEmployees} employee{totalEmployees === 1 ? "" : "s"}</span>
            <label htmlFor="employee-page-size">Show</label>
            <select
              id="employee-page-size"
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
              Previous
            </button>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </div>
      </section>


      {/* =========================
          ADD EMPLOYEE MODAL
      ========================== */}

      {showAddEmployee && (
        <div className="employee-modal-overlay">

          <div className="employee-modal">

            <div className="employee-modal-header">

              <div>
                <p className="admin-eyebrow">
                  EMPLOYEE MANAGEMENT
                </p>

                <h2>Add Employee</h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeAddEmployeeModal}
              >
                ×
              </button>

            </div>

            {formError && (
              <div
                className="admin-error-box"
                role="alert"
              >
                {formError}
              </div>
            )}

            <form
              className="employee-form"
              onSubmit={handleAddEmployee}
            >

              <div>
                <label htmlFor="addEmployeeId">
                  Employee ID
                </label>

                <input
                  id="addEmployeeId"
                  name="employeeId"
                  type="text"
                  placeholder="EMP001"
                  value={formData.employeeId}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label htmlFor="addFullName">
                  Full Name
                </label>

                <input
                  id="addFullName"
                  name="fullName"
                  type="text"
                  placeholder="Employee name"
                  value={formData.fullName}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label htmlFor="addEmail">
                  Email
                </label>

                <input
                  id="addEmail"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleFormChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="addPassword">
                  Password
                </label>

                <input
                  id="addPassword"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label htmlFor="addRole">
                  Role
                </label>

                <select
                  id="addRole"
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                >
                  <option value="employee">
                    Employee
                  </option>

                  <option value="team_lead">
                    Team Lead
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>
              </div>

              {formData.role !== "admin" && (
                <div>
                  <label htmlFor="addTeam">Team</label>
                  <select id="addTeam" name="team" value={formData.team} onChange={handleFormChange} required>
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>{team.teamName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="employee-form-actions">

                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeAddEmployeeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Employee"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}


      {/* =========================
          EDIT EMPLOYEE MODAL
      ========================== */}

      {showEditEmployee && (
        <div className="employee-modal-overlay">

          <div className="employee-modal">

            <div className="employee-modal-header">

              <div>
                <p className="admin-eyebrow">
                  EMPLOYEE MANAGEMENT
                </p>

                <h2>Edit Employee</h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeEditEmployeeModal}
              >
                ×
              </button>

            </div>

            {editError && (
              <div
                className="admin-error-box"
                role="alert"
              >
                {editError}
              </div>
            )}

            <form
              className="employee-form"
              onSubmit={handleUpdateEmployee}
            >

              <div>
                <label htmlFor="editEmployeeId">
                  Employee ID
                </label>

                <input
                  id="editEmployeeId"
                  name="employeeId"
                  type="text"
                  value={editFormData.employeeId}
                  onChange={handleEditFormChange}
                />
              </div>

              <div>
                <label htmlFor="editFullName">
                  Full Name
                </label>

                <input
                  id="editFullName"
                  name="fullName"
                  type="text"
                  value={editFormData.fullName}
                  onChange={handleEditFormChange}
                />
              </div>

              <div>
                <label htmlFor="editEmail">
                  Email
                </label>

                <input
                  id="editEmail"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="editRole">
                  Role
                </label>

                <select
                  id="editRole"
                  name="role"
                  value={editFormData.role}
                  onChange={handleEditFormChange}
                >
                  <option value="employee">
                    Employee
                  </option>

                  <option value="team_lead">
                    Team Lead
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>
              </div>

              {editFormData.role !== "admin" && (
                <div>
                  <label htmlFor="editTeam">Team</label>
                  <select id="editTeam" name="team" value={editFormData.team} onChange={handleEditFormChange} required>
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>{team.teamName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="editStatus">
                  Status
                </label>

                <select
                  id="editStatus"
                  name="isActive"
                  value={String(editFormData.isActive)}
                  onChange={handleEditFormChange}
                >
                  <option value="true">
                    Active
                  </option>

                  <option value="false">
                    Inactive
                  </option>
                </select>
              </div>

              <div className="employee-form-actions">

                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeEditEmployeeModal}
                  disabled={editSaving}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={editSaving}
                >
                  {editSaving
                    ? "Updating..."
                    : "Update Employee"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}


      {/* =========================
          RESET PASSWORD MODAL
      ========================== */}

      {showResetPassword && (
        <div className="employee-modal-overlay">

          <div className="employee-modal">

            <div className="employee-modal-header">

              <div>
                <p className="admin-eyebrow">
                  EMPLOYEE MANAGEMENT
                </p>

                <h2>
                  Reset Password
                  {resetPasswordEmployee?.fullName
                    ? ` — ${resetPasswordEmployee.fullName}`
                    : ""}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeResetPasswordModal}
              >
                ×
              </button>

            </div>

            {resetPasswordError && (
              <div
                className="admin-error-box"
                role="alert"
              >
                {resetPasswordError}
              </div>
            )}

            {resetPasswordSuccess && (
              <div className="profile-success-box">
                {resetPasswordSuccess}
              </div>
            )}

            <form
              className="employee-form"
              onSubmit={handleResetPassword}
            >

              <div>
                <label htmlFor="resetPassword">
                  New Password
                </label>

                <input
                  id="resetPassword"
                  name="password"
                  type="password"
                  placeholder="Enter new password"
                  value={resetPasswordFormData.password}
                  onChange={handleResetPasswordFormChange}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="resetConfirmPassword">
                  Confirm New Password
                </label>

                <input
                  id="resetConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={resetPasswordFormData.confirmPassword}
                  onChange={handleResetPasswordFormChange}
                  autoComplete="new-password"
                />
              </div>

              <div className="employee-form-actions">

                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeResetPasswordModal}
                  disabled={resetPasswordSaving}
                >
                  Close
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={resetPasswordSaving}
                >
                  {resetPasswordSaving
                    ? "Saving..."
                    : "Reset Password"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default AdminEmployees;
