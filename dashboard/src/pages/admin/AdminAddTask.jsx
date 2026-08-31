import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import TaskForm from "../../components/tasks/TaskForm";
import "../../styles/adminAddTask.css";

function AdminAddTask() {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Add New Task">
      <main className="admin-add-task-page">
        <button type="button" className="admin-add-task-back" onClick={() => navigate("/admin/tasks")}>
          ← Back to tasks
        </button>
        <TaskForm
          mode="create"
          scope="admin"
          formClassName="admin-add-task-card"
          saveLabel="Save task"
          header={
            <header>
              <p>TASK MANAGEMENT</p>
              <h2>Add New Task</h2>
              <span>Create a task and decide exactly who can work on it.</span>
            </header>
          }
          onCancel={() => navigate("/admin/tasks")}
          onSaved={() => navigate("/admin/tasks")}
        />
      </main>
    </DashboardLayout>
  );
}

export default AdminAddTask;
