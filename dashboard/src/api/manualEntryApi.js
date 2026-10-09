import axiosInstance from "./axiosInstance";

// One request returns everything the Client -> Project -> Task pickers need
// for this employee, so changing a selection never triggers another call.
export const getManualEntryOptions = async (employeeId) =>
  (await axiosInstance.get("/time-logs/manual/options", { params: { employee: employeeId } })).data;

export const createManualEntry = async (payload) =>
  (await axiosInstance.post("/time-logs/manual", payload)).data;

export const deleteManualEntry = async (id) =>
  (await axiosInstance.delete(`/time-logs/manual/${encodeURIComponent(id)}`)).data;
