import axiosInstance from "./axiosInstance";

// Check In
export const checkIn = async () => {
  const response = await axiosInstance.post("/attendance/check-in");

  return response.data;
};

// Check Out
export const checkOut = async () => {
  const response = await axiosInstance.post("/attendance/check-out");

  return response.data;
};

// Today's Attendance
export const getTodayAttendance = async () => {
  const response = await axiosInstance.get("/attendance/today");

  return response.data;
};

// Attendance History
export const getAttendanceHistory = async () => {
  const response = await axiosInstance.get("/attendance/history");

  return response.data;
};