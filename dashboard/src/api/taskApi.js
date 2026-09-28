import axiosInstance from "./axiosInstance";

export const getTasks = async () => {
  const response = await axiosInstance.get("/tasks");
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await axiosInstance.delete(`/tasks/${taskId}`);
  return response.data;
};

export const getTasksByProject = async (projectId, params = {}) => {
  const response = await axiosInstance.get("/tasks", {
    params: {
      project: projectId,
      limit: 100,
      active: true,
      ...params,
    },
  });

  return response.data;
};

export const getAllActiveTasksByProject = async (projectId) => {
  if (!projectId) return [];

  const tasks = [];
  for (let page = 1; ; page += 1) {
    const data = await getTasksByProject(projectId, { page, limit: 100, active: true });
    tasks.push(...(data.tasks || []));
    if (page >= Math.max(Number(data.totalPages) || 1, 1)) break;
  }

  return tasks;
};

export const resolveProjectForTeams = async (teamIds) => {
  if (!teamIds || teamIds.length === 0) return null;
  const response = await axiosInstance.get("/tasks/resolve-project", {
    params: { teams: teamIds.join(",") },
  });

  return response.data;
};
