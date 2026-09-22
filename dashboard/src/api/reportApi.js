import axiosInstance from "./axiosInstance";

const getAllReportPages = async (path, collectionKey, params = {}) => {
  const records = [];
  let firstPage = null;

  for (let page = 1; ; page += 1) {
    const response = await axiosInstance.get(path, {
      params: { ...params, page, limit: 100 },
    });
    const data = response.data;
    if (!firstPage) firstPage = data;
    records.push(...(data[collectionKey] || []));
    if (page >= Math.max(Number(data.totalPages) || 1, 1)) break;
  }

  return {
    ...(firstPage || {}),
    page: 1,
    count: records.length,
    [collectionKey]: records,
  };
};

export const getAdminTimeLogs = (params = {}) =>
  getAllReportPages("/time-logs/admin", "timeLogs", params);

export const getTeamTimeLogs = (params = {}) =>
  getAllReportPages("/time-logs/team", "timeLogs", params);

export const getMyTimeLogs = (params = {}) =>
  getAllReportPages("/time-logs/history", "timeLogs", params);

export const getAdminAttendance = (params = {}) =>
  getAllReportPages("/attendance/admin/history", "attendance", params);

export const getTeamAttendance = (params = {}) =>
  getAllReportPages("/attendance/team/history", "attendance", params);

export const getMyAttendance = (params = {}) =>
  getAllReportPages("/attendance/history", "attendance", params);
