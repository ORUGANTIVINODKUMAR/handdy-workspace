import { useEffect, useState } from "react";
import { getAllProjects } from "../../api/projectApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function ProjectSelector({ selectedProject, onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setError("");

        const data = await getAllProjects();

        setProjects(data.projects || []);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load projects."));
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

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
