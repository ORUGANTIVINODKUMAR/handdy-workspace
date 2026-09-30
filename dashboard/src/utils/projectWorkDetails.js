import { sumTimelineSeconds } from "./timeLogTimeline.js";
import { getIdleSeconds, getWorkedSeconds } from "./timeLogReportHelpers.js";

export const buildProjectWorkDetails = (records, gapRows = []) => {
  const employees = new Map();
  const getProject = (record) => {
    const employeeId = record.employee?._id || "unassigned-employee";
    if (!employees.has(employeeId)) {
      employees.set(employeeId, {
        key: employeeId,
        name: record.employee?.fullName || "Unassigned employee",
        projects: new Map(),
        workedSeconds: 0,
        breakSeconds: 0,
        idleSeconds: 0,
      });
    }
    const employee = employees.get(employeeId);
    const projectId = record.project?._id || "unassigned-project";
    if (!employee.projects.has(projectId)) {
      employee.projects.set(projectId, {
        key: projectId,
        name: record.project?.projectName || "Unassigned project",
        sessions: 0,
        workedSeconds: 0,
        breakSeconds: 0,
        idleSeconds: 0,
      });
    }
    return [employee, employee.projects.get(projectId)];
  };

  records.forEach((record) => {
    const [employee, project] = getProject(record);
    const worked = getWorkedSeconds(record);
    const breaks = sumTimelineSeconds([record], "break");
    const idle = getIdleSeconds(record);
    project.sessions += 1;
    project.workedSeconds += worked;
    project.breakSeconds += breaks;
    project.idleSeconds += idle;
    employee.workedSeconds += worked;
    employee.breakSeconds += breaks;
    employee.idleSeconds += idle;
  });

  gapRows.filter(({ entry }) => entry.source === "between_sessions").forEach(({ record, entry }) => {
    const [employee, project] = getProject(record);
    project.idleSeconds += entry.durationSeconds;
    employee.idleSeconds += entry.durationSeconds;
  });

  return [...employees.values()]
    .map((employee) => ({
      ...employee,
      projects: [...employee.projects.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
