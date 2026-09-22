import axiosInstance from "./axiosInstance";

export const getIdlePolicy = async () => {
  const response = await axiosInstance.get("/settings/idle-policy");
  return response.data;
};

export const updateIdlePolicy = async (idleThresholdMinutes, autoLogoutMinutes) => {
  const response = await axiosInstance.put("/settings/idle-policy", {
    idleThresholdMinutes,
    autoLogoutMinutes,
  });
  return response.data;
};

export const getEmployeeIdlePolicies = async () => {
  const response = await axiosInstance.get("/settings/employee-idle-policies");
  return response.data;
};

export const updateEmployeeIdlePolicy = async (employeeId, policy) => {
  const response = await axiosInstance.put(`/settings/employee-idle-policies/${employeeId}`, policy);
  return response.data;
};
