import { useCallback, useEffect, useState } from "react";
import { getAllActiveProjects } from "../../api/projectApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import useDataRefresh from "../../hooks/useDataRefresh";

function ProjectSelector({ selectedProject, onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      setError("");

      setProjects(await getAllActiveProjects());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load projects."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useDataRefresh(loadProjects);

  if (isLoading) {
    return <p className="status-message" role="status">Loading projects...</p>;
  }

  return (
    <div className="field-group">
      <label htmlFor="project">Project</label>

      <select
        id="project"
        value={selectedProject}
        onChange={(event) => onProjectChange(event.target.value)}
      >
        <option value="">Select a project</option>

        {projects.map((project) => (
          <option key={project._id} value={project._id}>
            {project.projectName}
          </option>
        ))}
      </select>

      {error && <p className="status-message error-message" role="alert">{error}</p>}

      {!error && projects.length === 0 && (
        <p className="status-message">No projects are available.</p>
      )}
    </div>
  );
}

export default ProjectSelector;
