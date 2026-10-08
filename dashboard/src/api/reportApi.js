import axiosInstance from "./axiosInstance";
import { createReportLoader } from "../utils/reportLoader";

const getAllReportPages = createReportLoader(async (path, params) =>
  (await axiosInstance.get(path, { params })).data, () => localStorage.getItem("token") || "");

export const getAdminTimeLogs = (params = {}, options) =>
  getAllReportPages("/time-logs/admin", "timeLogs", params, options);

export const getTeamTimeLogs = (params = {}, options) =>
  getAllReportPages("/time-logs/team", "timeLogs", params, options);

export const getMyTimeLogs = (params = {}, options) =>
  getAllReportPages("/time-logs/history", "timeLogs", params, options);

export const getAdminAttendance = (params = {}, options) =>
  getAllReportPages("/attendance/admin/history", "attendance", params, options);

export const getTeamAttendance = (params = {}, options) =>
  getAllReportPages("/attendance/team/history", "attendance", params, options);

export const getMyAttendance = (params = {}, options) =>
  getAllReportPages("/attendance/history", "attendance", params, options);
