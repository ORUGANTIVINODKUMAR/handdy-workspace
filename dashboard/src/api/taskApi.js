import axiosInstance from "./axiosInstance";

export const getTasks = async () => {
  const response = await axiosInstance.get("/tasks");
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await axiosInstance.delete(`/tasks/${taskId}`);
  return response.data;
};

export const getTasksByProject = async (projectId) => {
  const response = await axiosInstance.get("/tasks", {
    params: {
      project: projectId,
      limit: 100,
      active: true,
    },
  });

  return response.data;
};

export const resolveProjectForTeams = async (teamIds) => {
  if (!teamIds || teamIds.length === 0) return null;
  const response = await axiosInstance.get("/tasks/resolve-project", {
    params: { teams: teamIds.join(",") },
  });

  return response.data;
};
