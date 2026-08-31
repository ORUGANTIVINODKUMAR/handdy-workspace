import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import TaskForm from "../../components/tasks/TaskForm";
import "../../styles/adminTasks.css";
import { API_BASE_URL } from "../../api/axiosInstance";

const API_URL = `${API_BASE_URL}/tasks`;

const getToken = () => localStorage.getItem("token");

const getTaskName = (task) =>
  task.taskName || task.name || task.taskCode || "-";

const getAssignedName = (task) => {
  if (task.assignToAllEmployees) {
    return `Entire ${task.team?.teamName || "selected"} team`;
  }

  if (Array.isArray(task.assignedTo)) {
    const names = task.assignedTo
      .map((employee) => {
        if (typeof employee === "string") {
          return employee;
        }

        return (
          employee?.fullName ||
          employee?.employeeId ||
          ""
        );
      })
      .filter(Boolean);

    return names.length > 0
      ? names.join(", ")
      : "-";
  }

  return "-";
};

function AdminTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("active");

  const [recordsPerPage, setRecordsPerPage] =
    useState(10);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [sortField, setSortField] =
    useState("taskName");

  const [sortDirection, setSortDirection] =
    useState("asc");

  const [showModal, setShowModal] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  // ==============================
  // LOAD TASKS
  // ==============================

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const response = await fetch(API_URL, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load tasks."
        );
      }

      setTasks(data.tasks || []);
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Unable to load tasks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  // ==============================
  // FILTER + SORT
  // ==============================

  const filteredTasks = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    let result = [...tasks];

    if (statusFilter === "active") {
      result = result.filter(
        (task) => task.isActive !== false
      );
    }

    if (statusFilter === "inactive") {
      result = result.filter(
        (task) => task.isActive === false
      );
    }

    if (searchValue) {
      result = result.filter((task) => {
        const name =
          getTaskName(task).toLowerCase();

        const code = (
          task.taskCode || ""
        ).toLowerCase();

        const type = (
          task.taskType || ""
        ).toLowerCase();

        const assigned =
          getAssignedName(task).toLowerCase();

        return (
          name.includes(searchValue) ||
          code.includes(searchValue) ||
          type.includes(searchValue) ||
          assigned.includes(searchValue)
        );
      });
    }

    result.sort((a, b) => {
      let valueA = "";
      let valueB = "";

      if (sortField === "taskName") {
        valueA = getTaskName(a);
        valueB = getTaskName(b);
      }

      if (sortField === "taskType") {
        valueA = a.taskType || "";
        valueB = b.taskType || "";
      }

      if (sortField === "assignedTo") {
        valueA = getAssignedName(a);
        valueB = getAssignedName(b);
      }

      valueA = valueA
        .toString()
        .toLowerCase();

      valueB = valueB
        .toString()
        .toLowerCase();

      if (valueA < valueB) {
        return sortDirection === "asc"
          ? -1
          : 1;
      }

      if (valueA > valueB) {
        return sortDirection === "asc"
          ? 1
          : -1;
      }

      return 0;
    });

    return result;
  }, [
    tasks,
    search,
    statusFilter,
    sortField,
    sortDirection,
  ]);

  // ==============================
  // PAGINATION
  // ==============================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTasks.length / recordsPerPage
    )
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    recordsPerPage,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex =
    (currentPage - 1) * recordsPerPage;

  const visibleTasks =
    filteredTasks.slice(
      startIndex,
      startIndex + recordsPerPage
    );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((previous) =>
        previous === "asc"
          ? "desc"
          : "asc"
      );

      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  // ==============================
  // EDIT
  // ==============================

  const openEditModal = (task) => {
    setEditingTask(task);
    setError("");
    setMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  // ==============================
  // DELETE
  // ==============================

  const handleDelete = async (task) => {
    const taskId =
      task._id || task.id;

    if (!taskId) return;

    const confirmed =
      window.confirm(
        `Delete "${getTaskName(task)}"?`
      );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/${taskId}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to delete task."
        );
      }

      setMessage(
        "Task deleted successfully."
      );

      await loadTasks();
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete task."
      );
    }
  };

  // ==============================
  // PAGE NUMBERS
  // ==============================

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );
    }

    if (currentPage <= 4) {
      return [
        1,
        2,
        3,
        4,
        5,
        "...",
        totalPages,
      ];
    }

    if (
      currentPage >=
      totalPages - 3
    ) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  return (
    <DashboardLayout title="Tasks">
      <div className="tasks-page">
        <h1 className="tasks-page-title">
          Tasks
        </h1>

        <section className="tasks-card">

          {/* SEARCH + ADD */}

          <div className="tasks-toolbar">
            <div className="tasks-search-box">
              <label htmlFor="task-search">
                Search:
              </label>

              <input
                id="task-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <button
              type="button"
              className="tasks-add-button"
              onClick={() => navigate("/admin/tasks/new")}
            >
              Add New Task
            </button>
          </div>

          {message && (
            <div className="tasks-message success">
              {message}
            </div>
          )}

          {error && (
            <div className="tasks-message error">
              {error}
            </div>
          )}

          {/* TABLE */}

          <div className="tasks-table-wrapper">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>
                    Team
                  </th>

                  <th>
                    Project
                  </th>

                  <th>
                    <button
                      type="button"
                      className="task-sort-button"
                      onClick={() =>
                        handleSort(
                          "taskName"
                        )
                      }
                    >
                      <span>
                        Task name
                      </span>

                      <span>↕</span>
                    </button>
                  </th>

                  <th>
                    <button
                      type="button"
                      className="task-sort-button"
                      onClick={() =>
                        handleSort(
                          "taskType"
                        )
                      }
                    >
                      <span>
                        Task type
                      </span>

                      <span>↕</span>
                    </button>
                  </th>

                  <th>
                    <button
                      type="button"
                      className="task-sort-button"
                      onClick={() =>
                        handleSort(
                          "assignedTo"
                        )
                      }
                    >
                      <span>
                        Assigned to
                      </span>

                      <span>↕</span>
                    </button>
                  </th>

                  <th>
                    Action
                  </th>

                  <th className="tasks-status-heading">
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value
                        )
                      }
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="all">
                        All
                      </option>
                    </select>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="tasks-empty"
                    >
                      Loading tasks...
                    </td>
                  </tr>
                ) : visibleTasks.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="tasks-empty"
                    >
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  visibleTasks.map(
                    (task) => {
                      const taskId =
                        task._id ||
                        task.id;

                      return (
                        <tr key={taskId}>
                          <td>
                            {(task.teams?.length ? task.teams : [task.team]).filter(Boolean).map((team) => team?.teamName || team).join(", ") || "-"}
                          </td>

                          <td>
                            {task.project?.projectName || "-"}
                          </td>

                          <td>
                            {getTaskName(task)}
                          </td>

                          <td>
                            {task.taskType === "break" ? "Break time" : "Work time"}
                          </td>

                          <td>
                            {getAssignedName(
                              task
                            )}
                          </td>

                          <td>
                            <div className="task-actions">
                              <button
                                type="button"
                                className="task-icon-button"
                                title="Edit"
                                onClick={() =>
                                  openEditModal(
                                    task
                                  )
                                }
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                className="task-icon-button"
                                title="Delete"
                                onClick={() =>
                                  handleDelete(
                                    task
                                  )
                                }
                              >
                                ⊠
                              </button>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                task.isActive !==
                                false
                                  ? "task-status active"
                                  : "task-status inactive"
                              }
                            >
                              {task.isActive !==
                              false
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="tasks-table-footer">
            <div className="tasks-page-size">
              <label>
                Records per page
              </label>

              <select
                value={recordsPerPage}
                onChange={(event) =>
                  setRecordsPerPage(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                <option value={10}>
                  10
                </option>

                <option value={25}>
                  25
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>
            </div>

            <div className="tasks-pagination">
              <button
                type="button"
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setCurrentPage(1)
                }
              >
                «
              </button>

              <button
                type="button"
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setCurrentPage(
                    Math.max(
                      1,
                      currentPage - 1
                    )
                  )
                }
              >
                ‹
              </button>

              {getPageNumbers().map(
                (page, index) =>
                  page === "..." ? (
                    <span
                      key={`dots-${index}`}
                      className="tasks-pagination-dots"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={page}
                      className={
                        currentPage === page
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
                    >
                      {page}
                    </button>
                  )
              )}

              <button
                type="button"
                disabled={
                  currentPage ===
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    Math.min(
                      totalPages,
                      currentPage + 1
                    )
                  )
                }
              >
                ›
              </button>

              <button
                type="button"
                disabled={
                  currentPage ===
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    totalPages
                  )
                }
              >
                »
              </button>
            </div>
          </div>
        </section>

        {/* MODAL */}

        {showModal && (
          <div className="task-modal-overlay">
            <div className="task-modal">

              <div className="task-modal-header">
                <div>
                  <p>
                    TASK MANAGEMENT
                  </p>

                  <h2>
                    {editingTask
                      ? "Edit Task"
                      : "Add New Task"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="task-modal-close"
                  onClick={closeModal}
                >
                  ×
                </button>
              </div>

              <TaskForm
                mode="edit"
                scope="admin"
                initialTask={editingTask}
                formClassName="admin-add-task-card embedded"
                saveLabel="Update Task"
                onCancel={closeModal}
                onSaved={() => {
                  setMessage("Task updated successfully.");
                  setShowModal(false);
                  setEditingTask(null);
                  void loadTasks();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminTasks;
