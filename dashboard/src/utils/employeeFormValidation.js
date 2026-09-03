export const EMPTY_PROJECT_RATE = { project: "", chargeRate: "" };

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
  if (!Array.isArray(formData.projectRates) || formData.projectRates.length === 0) {
    return "Add at least one project and charge rate.";
  }

  const selectedProjects = new Set();
  for (const assignment of formData.projectRates) {
    const projectId = String(assignment.project || "").trim();
    if (!projectId) {
      return "Select a project for every project row.";
    }
    if (selectedProjects.has(projectId)) {
      return "The same project cannot be assigned more than once.";
    }
    const chargeRate = Number(assignment.chargeRate);
    if (assignment.chargeRate === "" || !Number.isFinite(chargeRate) || chargeRate <= 0 || chargeRate > 1_000_000) {
      return "Enter a valid positive charge rate for every project.";
    }
    selectedProjects.add(projectId);
  }
  return "";
};
