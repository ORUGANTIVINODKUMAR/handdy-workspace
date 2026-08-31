import axiosInstance from "./axiosInstance";

// Admin - list employees with filters and pagination
export const getEmployees = async (params = {}) => {
  const response = await axiosInstance.get("/employees", { params });
  return response.data;
};

// Admin - get one employee
export const getEmployeeById = async (employeeId) => {
  const response = await axiosInstance.get(`/employees/${employeeId}`);
  return response.data;
};

// Team Lead - get assigned team
export const getMyTeam = async () => {
  const response = await axiosInstance.get("/employees/my-team");
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

// Admin - assign/remove Team Lead
export const assignTeamLead = async (employeeId, teamLeadId) => {
  const response = await axiosInstance.put(
    `/employees/${employeeId}/team-lead`,
    { teamLeadId }
  );

  return response.data;
};