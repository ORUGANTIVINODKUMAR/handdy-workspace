import axiosInstance from "./axiosInstance";

export const startTimer = async (projectId, taskId) => {
  const response = await axiosInstance.post("/time-logs/start", {
    project: projectId,
    task: taskId,
  });

  return response.data;
};

export const pauseTimer = async (reason = "manual") => {
  const response = await axiosInstance.post("/time-logs/pause", { reason });

  return response.data;
};

export const resumeTimer = async (reason = "manual") => {
  const response = await axiosInstance.post("/time-logs/resume", { reason });

  return response.data;
};

export const stopTimer = async () => {
  const response = await axiosInstance.post("/time-logs/stop");

  return response.data;
};


export const getActiveTimer = async () => {
  const response = await axiosInstance.get("/time-logs/active");

  return response.data;
};
