import axiosInstance from "./axiosInstance";

export const getAdminTimeLogs = async (params = {}) => {
  const response = await axiosInstance.get("/time-logs/admin", { params });
  return response.data;
};

export const getTeamTimeLogs = async (params = {}) => {
  const response = await axiosInstance.get("/time-logs/team", { params });
  return response.data;
};

export const getMyTimeLogs = async (params = {}) => {
  const response = await axiosInstance.get("/time-logs/history", { params });
  return response.data;
};

export const getAdminAttendance = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/admin/history", { params });
  return response.data;
};

export const getTeamAttendance = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/team/history", { params });
  return response.data;
};

export const getMyAttendance = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/history", { params });
  return response.data;
};
