import axiosInstance from "./axiosInstance";

export const getBillingEmployees = async () => {
  const response = await axiosInstance.get("/billing/employees");
  return response.data;
};

export const getBillingReport = async (params) => {
  const response = await axiosInstance.get("/billing/report", { params });
  return response.data;
};
