import axiosInstance from "./axiosInstance";

// Admin - list employees with filters and pagination
export const getEmployees = async (params = {}) => {
  const response = await axiosInstance.get("/employees", { params });
  return response.data;
};

export const getAllEmployees = async (params = {}) => {
  const employees = [];
  for (let page = 1; ; page += 1) {
    const data = await getEmployees({ ...params, page, limit: 100 });
    employees.push(...(data.employees || []));
    if (page >= Math.max(Number(data.totalPages) || 1, 1)) break;
  }
  return employees;
};

// Admin - get one employee
export const getEmployeeById = async (employeeId) => {
  const response = await axiosInstance.get(`/employees/${employeeId}`);
  return response.data;
};

// Team Lead - get assigned team
// Note: the backend endpoint does not currently paginate this list (it
// always returns every active team member), so `params` is forwarded for
// forward-compatibility but callers should not assume it is honored yet.
export const getMyTeam = async (params = {}) => {
  const response = await axiosInstance.get("/employees/my-team", { params });
  return response.data;
};

// Team Lead - get one assigned team member
export const getMyTeamMemberById = async (employeeId) => {
  const response = await axiosInstance.get(
    `/employees/my-team/${employeeId}`
  );
  return response.data;
};

// Admin - update employee
export const updateEmployee = async (employeeId, employeeData) => {
  const response = await axiosInstance.put(
    `/employees/${employeeId}`,
    employeeData
  );

  return response.data;
};

// Admin - reset an employee's password
export const resetEmployeePassword = async (employeeId, password) => {
  const response = await axiosInstance.put(
    `/employees/${employeeId}/reset-password`,
    { password }
  );

  return response.data;
};

// Admin - assign/remove Team Lead
export const assignTeamLead = async (employeeId, teamLeadId) => {
  const response = await axiosInstance.put(
    `/employees/${employeeId}/team-lead`,
    { teamLeadId }
  );

  return response.data;
};
