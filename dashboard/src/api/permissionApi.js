import axiosInstance from "./axiosInstance";

export const getPermissionConfig = async () => (await axiosInstance.get("/permissions")).data;

export const saveRolePermissions = async (role, permissions) =>
  (await axiosInstance.put(`/permissions/roles/${role}`, { permissions })).data;

// Effective permission keys for the signed-in user. Used only to show or hide
// controls; the API enforces every action regardless.
export const getMyPermissions = async () => (await axiosInstance.get("/permissions/me")).data.permissions || [];
