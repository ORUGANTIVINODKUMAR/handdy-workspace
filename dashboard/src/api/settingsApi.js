import axiosInstance from "./axiosInstance";

export const getIdlePolicy = async () => {
  const response = await axiosInstance.get("/settings/idle-policy");
  return response.data;
};

export const updateIdlePolicy = async (idleThresholdMinutes) => {
  const response = await axiosInstance.put("/settings/idle-policy", {
    idleThresholdMinutes,
  });
  return response.data;
};

