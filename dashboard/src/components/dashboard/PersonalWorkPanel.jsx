import { useCallback, useState } from "react";
import AttendanceCard from "../attendance/AttendanceCard";
import ProjectSelector from "../projects/ProjectSelector";
import TaskSelector from "../tasks/TaskSelector";
import TaskTimer from "../timer/TaskTimer";
import AttendanceHistory from "../attendance/AttendanceHistory";
function PersonalWorkPanel() {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const handleTaskChange = useCallback((taskId) => setSelectedTask(taskId), []);
  const handleProjectChange = useCallback((projectId) => {
    setSelectedProject(projectId);
    setSelectedTask("");
  }, []);

  return (
    <div className="personal-work-panel">
      <AttendanceCard />
      <AttendanceHistory />
      <section className="card selector-card" aria-labelledby="work-selection-heading">
        <p className="eyebrow">Work selection</p>
        <h2 id="work-selection-heading">Choose Your Task</h2>
        <div className="selector-grid">
          <ProjectSelector
            selectedProject={selectedProject}
            onProjectChange={handleProjectChange}
          />
          <TaskSelector
            key={selectedProject || "no-project"}
            selectedProject={selectedProject}
            selectedTask={selectedTask}
            onTaskChange={handleTaskChange}
          />
        </div>
      </section>

      <TaskTimer selectedProject={selectedProject} selectedTask={selectedTask} />
    </div>
  );
}

export default PersonalWorkPanel;
