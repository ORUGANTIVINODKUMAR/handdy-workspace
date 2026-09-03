import axiosInstance from "./axiosInstance";

// Get all projects
export const getAllProjects = async (params = {}) => {
  const response = await axiosInstance.get("/projects", {
    params: { limit: 100, status: "Active", ...params },
  });

  return response.data;
};

// Get project by ID
export const getProjectById = async (projectId) => {
  const response = await axiosInstance.get(`/projects/${projectId}`);

  return response.data;
};

// Employee rate assignment needs every active project, not only the first
// page of the Project Management table.
export const getAllActiveProjects = async () => {
  const projects = [];
  for (let page = 1; ; page += 1) {
    const data = await getAllProjects({ page, limit: 100, status: "Active" });
    projects.push(...(data.projects || []));
    if (page >= Math.max(Number(data.totalPages) || 1, 1)) break;
  }

  return projects;
};
