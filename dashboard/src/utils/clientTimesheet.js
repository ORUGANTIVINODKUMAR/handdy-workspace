import { getWorkedSeconds, getIdleSeconds } from "./timeLogReportHelpers.js";
import { sumTimelineSeconds } from "./timeLogTimeline.js";

const id = (value) => String(value?._id || (typeof value === "string" ? value : ""));
const totals = () => ({ workedSeconds: 0, breakSeconds: 0, idleSeconds: 0, sessions: 0 });
const addTotals = (target, values) => {
  for (const key of Object.keys(totals())) target[key] += values[key] || 0;
};

export const getTimesheetClient = (record) => {
  if (id(record.client)) return { key: id(record.client), name: record.client.clientName || "Unknown client" };
  const project = record.project || {};
  const candidates = [...(project.clients || []), project.client].filter((client) => id(client));
  const unique = new Map(candidates.map((client) => [id(client), client]));
  if (unique.size === 1) {
    const [key, client] = [...unique.entries()][0];
    return { key, name: client.clientName || project.clientName || "Unknown client" };
  }
  // Shared projects without a client recorded on the log cannot be safely
  // attributed. Never copy the same log into every client of that project.
  if (unique.size === 0 && project.clientName?.trim()) {
    const name = project.clientName.trim();
    return { key: `legacy:${name.toLocaleLowerCase()}`, name };
  }
  return { key: "unassigned-client", name: "Unassigned client" };
};

export function buildClientTimesheet(records, gapRows = [], now = Date.now()) {
  const employees = new Map();
  const seenLogs = new Set();
  const acceptedLogs = new Set();
  const getNodes = (record) => {
    const employeeKey = id(record.employee) || "unassigned-employee";
    if (!employees.has(employeeKey)) employees.set(employeeKey, {
      key: employeeKey, name: record.employee?.fullName || "Unassigned employee", ...totals(), clients: new Map(),
    });
    const employee = employees.get(employeeKey);
    const identity = getTimesheetClient(record);
    if (!employee.clients.has(identity.key)) employee.clients.set(identity.key, {
      ...identity, ...totals(), projects: new Map(),
    });
    const client = employee.clients.get(identity.key);
    const projectKey = id(record.project) || "unassigned-project";
    if (!client.projects.has(projectKey)) client.projects.set(projectKey, {
      key: projectKey, name: record.project?.projectName || "Unknown project", ...totals(), tasks: new Map(),
    });
    const project = client.projects.get(projectKey);
    const taskKey = id(record.task) || "unassigned-task";
    if (!project.tasks.has(taskKey)) project.tasks.set(taskKey, {
      key: taskKey, name: record.task?.taskName || "Unknown task", ...totals(),
    });
    return [employee, client, project, project.tasks.get(taskKey)];
  };
  for (const record of records) {
    const logId = id(record);
    if (logId && seenLogs.has(logId)) continue;
    if (logId) seenLogs.add(logId);
    acceptedLogs.add(record);
    const values = { workedSeconds: getWorkedSeconds(record),
      breakSeconds: sumTimelineSeconds([record], "break", now), idleSeconds: getIdleSeconds(record), sessions: 1 };
    getNodes(record).forEach((node) => addTotals(node, values));
  }
  const seenGaps = new Set();
  for (const { record, entry } of gapRows) {
    if (entry.source !== "between_sessions" || (!acceptedLogs.has(record) && !seenLogs.has(id(record)))) continue;
    const key = `${id(record.employee)}:${entry.start}:${entry.end}`;
    if (seenGaps.has(key)) continue;
    seenGaps.add(key);
    getNodes(record).forEach((node) => addTotals(node, { idleSeconds: entry.durationSeconds }));
  }
  const sort = (nodes) => [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
  return sort(employees).map((employee) => ({ ...employee,
    clients: sort(employee.clients).map((client) => ({ ...client,
      projects: sort(client.projects).map((project) => ({ ...project, tasks: sort(project.tasks) })),
    })),
  }));
}

// One exported row per grouped task; parent totals are shown in the hierarchy
// rather than emitted as extra billable/time rows that could be summed twice.
export const flattenClientTimesheet = (employees) => employees.flatMap((employee) =>
  employee.clients.flatMap((client) => client.projects.flatMap((project) =>
    project.tasks.map((task) => ({ employee: employee.name, client: client.name,
      project: project.name, task: task.name, ...totals(), ...task })))));
