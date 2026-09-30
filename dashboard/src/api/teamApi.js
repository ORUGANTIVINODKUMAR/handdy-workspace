import axiosInstance from "./axiosInstance";

export const getAllTeams = async () => {
  const response = await axiosInstance.get("/teams");
  return response.data.teams || [];
};
