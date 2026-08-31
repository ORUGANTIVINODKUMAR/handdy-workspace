import { useEffect, useState } from "react";
import { getTasksByProject } from "../../api/taskApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function TaskSelector({ selectedProject, selectedTask, onTaskChange }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(selectedProject));
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    if (!selectedProject) {
      return () => {
        isCurrent = false;
      };
    }

    const loadTasks = async () => {
      try {
        const data = await getTasksByProject(selectedProject);

        if (isCurrent) {
          setTasks(data.tasks || []);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(getApiErrorMessage(requestError, "Unable to load tasks."));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isCurrent = false;
    };
  }, [selectedProject]);

  return (
    <div className="field-group">
      <label htmlFor="task">Task</label>
      <select
        id="task"
        value={selectedTask}
        onChange={(event) => onTaskChange(event.target.value)}
        disabled={!selectedProject || isLoading}
      >
        <option value="">
          {!selectedProject
            ? "Select a project first"
            : isLoading
              ? "Loading tasks..."
              : "Select a task"}
        </option>

        {tasks.map((task) => (
          <option key={task._id} value={task._id}>
            {task.taskName}
          </option>
        ))}
      </select>

      {isLoading && <p className="status-message" role="status">Loading tasks...</p>}
      {error && <p className="status-message error-message" role="alert">{error}</p>}
      {selectedProject && !isLoading && !error && tasks.length === 0 && (
        <p className="status-message">No tasks are available for this project.</p>
      )}
    </div>
  );
}

export default TaskSelector;
