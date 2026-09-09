import axiosInstance from "./axiosInstance";

export const loginUser = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};

export const quickLoginUser = async (rememberedSessionToken) => {
  const response = await axiosInstance.post("/auth/quick-login", { rememberedSessionToken });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await axiosInstance.get("/auth/me");
  return response.data;
};

export const logoutUser = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await axiosInstance.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await axiosInstance.post("/auth/reset-password", { token, password });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await axiosInstance.put("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};
