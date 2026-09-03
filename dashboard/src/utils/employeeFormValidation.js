import { SERVICE_TYPES } from "../constants/serviceTypes.js";

export const EMPTY_SERVICE_RATE = { serviceType: "", chargeRate: "" };

export const validateEmployeeForm = (formData, { passwordRequired = false } = {}) => {
  if (!formData.employeeId.trim() || !formData.fullName.trim() || !formData.email.trim()) {
    return "Employee ID, Full Name and Email are required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    return "Enter a valid email address.";
  }
  if (passwordRequired && !formData.password) return "Password is required.";
  if (passwordRequired && formData.password.length < 8) {
    return "Password must contain at least 8 characters.";
  }
  if (["employee", "team_lead"].includes(formData.role) && !formData.team) {
    return "Team is required for employees and Team Leads.";
  }
  if (!Array.isArray(formData.serviceRates) || formData.serviceRates.length === 0) {
    return "Add at least one service type and charge rate.";
  }

  const selectedServices = new Set();
  for (const assignment of formData.serviceRates) {
    if (!SERVICE_TYPES.includes(assignment.serviceType)) {
      return "Select a service type for every service row.";
    }
    if (selectedServices.has(assignment.serviceType)) {
      return `${assignment.serviceType} cannot be assigned more than once.`;
    }
    const chargeRate = Number(assignment.chargeRate);
    if (assignment.chargeRate === "" || !Number.isFinite(chargeRate) || chargeRate <= 0 || chargeRate > 1_000_000) {
      return `Enter a valid positive charge rate for ${assignment.serviceType}.`;
    }
    selectedServices.add(assignment.serviceType);
  }
  return "";
};
