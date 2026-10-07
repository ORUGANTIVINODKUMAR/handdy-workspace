import fetchAllRecords from "./fetchAllRecords";

export const getAllShifts = (params = {}) => fetchAllRecords("/shifts", "shifts", params);
export const getAllSchedules = (params = {}) => fetchAllRecords("/schedules", "schedules", params);
