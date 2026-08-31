import axiosInstance from "./axiosInstance";

// Get all projects
export const getAllProjects = async () => {
  const response = await axiosInstance.get("/projects", {
    params: { limit: 100, status: "Active" },
  });

  return response.data;
};

// Get project by ID
export const getProjectById = async (projectId) => {
  const response = await axiosInstance.get(`/projects/${projectId}`);

  return response.data;
};
