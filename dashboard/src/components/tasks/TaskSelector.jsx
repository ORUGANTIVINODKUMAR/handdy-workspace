import { useCallback, useEffect, useState } from "react";
import { getAllActiveTasksByProject } from "../../api/taskApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import useDataRefresh from "../../hooks/useDataRefresh";

function TaskSelector({ selectedProject, selectedTask, onTaskChange }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(selectedProject));
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    if (!selectedProject) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    try {
      setError("");
      setTasks(await getAllActiveTasksByProject(selectedProject));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load tasks."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    setIsLoading(Boolean(selectedProject));
    void loadTasks();
  }, [loadTasks, selectedProject]);
  useDataRefresh(loadTasks);

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
