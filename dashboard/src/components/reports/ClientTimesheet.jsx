import { formatReportDuration } from "../../utils/reportFormatting.js";
import "../../styles/clientTimesheet.css";

function TimeTotals({ node }) {
  return <span className="client-timesheet-totals">
    <strong>Worked {formatReportDuration(node.workedSeconds)}</strong>
    <span>Idle {formatReportDuration(node.idleSeconds)}</span>
  </span>;
}

export default function ClientTimesheet({ employees }) {
  return <div className="client-timesheet" aria-label="Timesheet by employee, client, project and task">
    <p className="client-timesheet-help">Expand a row to see clients, projects and tasks. Worked time excludes breaks and idle.</p>
    {employees.map((employee) => <details className="client-timesheet-employee" key={employee.key}>
      <summary><span><small>Employee</small>{employee.name}</span><TimeTotals node={employee} /></summary>
      <div className="client-timesheet-children">
        {employee.clients.map((client) => <details className="client-timesheet-client" key={client.key}>
          <summary><span><small>Client</small>{client.name}</span><TimeTotals node={client} /></summary>
          <div className="client-timesheet-children">
            {client.projects.map((project) => <details className="client-timesheet-project" key={project.key}>
              <summary><span><small>Project</small>{project.name}</span><TimeTotals node={project} /></summary>
              <div className="admin-report-table-wrap"><table>
                <thead><tr><th>Task</th><th>Sessions</th><th>Worked</th><th>Idle</th></tr></thead>
                <tbody>{project.tasks.map((task) => <tr key={task.key}>
                  <td>{task.name}</td><td>{task.sessions}</td><td>{formatReportDuration(task.workedSeconds)}</td>
                  <td>{formatReportDuration(task.idleSeconds)}</td>
                </tr>)}</tbody>
              </table></div>
            </details>)}
          </div>
        </details>)}
      </div>
    </details>)}
  </div>;
}
