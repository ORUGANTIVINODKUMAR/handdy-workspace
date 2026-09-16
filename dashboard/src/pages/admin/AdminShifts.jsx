import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import "../../styles/adminShifts.css";

function AdminShifts() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    axiosInstance
      .get("/shifts", { params: { limit: 100 } })
      .then(({ data }) => {
        if (active) setShifts(data.shifts || []);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "Unable to load shifts."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (shiftId) => {
    const confirmed = window.confirm("Are you sure you want to delete this shift?");
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/shifts/${shiftId}`);
      setShifts((previous) => previous.filter((shift) => shift._id !== shiftId));
    } catch (requestError) {
      window.alert(getApiErrorMessage(requestError, "Unable to delete shift."));
    }
  };

  const filteredShifts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return shifts.filter((shift) => {
      const matchesSearch =
        !searchValue ||
        shift.title?.toLowerCase().includes(searchValue) ||
        shift.shiftType?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        shift.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [shifts, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredShifts.length / pageSize)
  );

  const safePage = Math.min(page, totalPages);

  const startIndex = (safePage - 1) * pageSize;

  const visibleShifts = filteredShifts.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <DashboardLayout title="Shift">
      <section className="shift-list-card">
        <div className="shift-toolbar">
          <div className="shift-search">
            <label htmlFor="shift-search">
              Search:
            </label>

            <input
              id="shift-search"
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="shift-add-btn"
            onClick={() =>
              navigate("/admin/scheduler/shifts/add")
            }
          >
            Add New Shift
          </button>
        </div>

        <div className="shift-table-wrapper">
          <table className="shift-table">
            <thead>
              <tr>
                <th>
                  <span className="shift-heading-sort">
                    Title
                    <span>⇅</span>
                  </span>
                </th>

                <th>
                  <span className="shift-heading-sort">
                    Shift type
                    <span>⇅</span>
                  </span>
                </th>

                <th>
                  <span className="shift-heading-sort">
                    Time
                    <span>⇅</span>
                  </span>
                </th>

                <th>
                  Action
                </th>

                <th className="shift-status-header">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="All">
                      All
                    </option>

                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="shift-empty">
                    Loading shifts...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="shift-empty">
                    {error}
                  </td>
                </tr>
              ) : visibleShifts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="shift-empty"
                  >
                    No record found
                  </td>
                </tr>
              ) : (
                visibleShifts.map((shift) => (
                  <tr key={shift._id}>
                    <td>
                      {shift.title}
                    </td>

                    <td>
                      {shift.shiftType}
                    </td>

                    <td>
                      {shift.startTime} - {shift.endTime}
                    </td>

                    <td>
                      <div className="shift-actions">
                        <button
                          type="button"
                          aria-label="Delete shift"
                          onClick={() => handleDelete(shift._id)}
                        >
                          ⊠
                        </button>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          shift.status === "Active"
                            ? "shift-status active"
                            : "shift-status inactive"
                        }
                      >
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="shift-footer">
          <div className="shift-page-size">
            <label htmlFor="shift-page-size">
              Records per page
            </label>

            <select
              id="shift-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(
                  Number(event.target.value)
                );

                setPage(1);
              }}
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

          <div className="shift-pagination">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage(1)}
            >
              «
            </button>

            <button
              type="button"
              disabled={safePage === 1}
              onClick={() =>
                setPage((previous) =>
                  Math.max(
                    1,
                    previous - 1
                  )
                )
              }
            >
              ‹
            </button>

            <button
              type="button"
              className="active"
            >
              {safePage}
            </button>

            <button
              type="button"
              disabled={
                safePage === totalPages
              }
              onClick={() =>
                setPage((previous) =>
                  Math.min(
                    totalPages,
                    previous + 1
                  )
                )
              }
            >
              ›
            </button>

            <button
              type="button"
              disabled={
                safePage === totalPages
              }
              onClick={() =>
                setPage(totalPages)
              }
            >
              »
            </button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminShifts;