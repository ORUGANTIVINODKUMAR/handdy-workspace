import ModalFrame from "../../components/layout/ModalFrame";
import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function AdminClients() {
  const [showAddClient, setShowAddClient] = useState(false);

  const [clients, setClients] = useState([]);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadClients = async () => {
    try {
      setError("");
      const { data } = await axiosInstance.get("/clients");
      setClients(data.clients || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load clients."));
    }
  };

  useEffect(() => { void loadClients(); }, []);

  const [formData, setFormData] = useState({
    clientName: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddClient = () => {
    setFormData({
      clientName: "",
    });

    setShowAddClient(true);
  };

  const closeAddClient = () => {
    setShowAddClient(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.clientName.trim()) {
      window.alert("Client name is required.");
      return;
    }

    try {
      await axiosInstance.post("/clients", { clientName: formData.clientName.trim() });
      setFormData({ clientName: "" });
      setShowAddClient(false);
      await loadClients();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to add client."));
    }
  };

  const handleDelete = async (clientId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this client?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axiosInstance.delete(`/clients/${clientId}`);
      await loadClients();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to deactivate client."));
    }
  };

  const handleEdit = async (client) => {
    const clientName = window.prompt("Client name", client.clientName)?.trim();
    if (!clientName || clientName === client.clientName) return;
    try {
      await axiosInstance.put(`/clients/${client._id}`, { clientName });
      await loadClients();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update client."));
    }
  };

  const filteredClients = clients.filter((client) => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return true;
    }

    return client.clientName?.toLowerCase().includes(searchValue);
  });

  return (
    <DashboardLayout title="Clients">
      <section className="admin-card">
        {error && <p className="admin-error-box" role="alert">{error}</p>}

        <div className="employees-page-heading">
          <div>
            <p className="admin-eyebrow">
              CLIENT MANAGEMENT
            </p>

            <h2>Clients</h2>
          </div>

          <button
            type="button"
            className="add-employee-button"
            onClick={openAddClient}
          >
            + Add Client
          </button>
        </div>

        {/* SEARCH */}
        <div className="clients-toolbar">
          <div className="clients-search">
            <label htmlFor="client-search">
              Search:
            </label>

            <input
              id="client-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search client..."
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="employees-table-wrapper">
          <table className="employees-table">

            <thead>
              <tr>
                <th>Client Name</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="2">
                    {search
                      ? "No matching clients found."
                      : "No clients found."}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client._id}>

                    <td>
                      {client.clientName || "-"}
                    </td>

                    <td>
                      <div className="employee-actions">

                        <button
                          type="button"
                          className="edit-action-button"
                          onClick={() => handleEdit(client)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-action-button"
                          onClick={() =>
                              handleDelete(client._id)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </section>

      {/* ADD CLIENT MODAL */}
      {showAddClient && (
        <ModalFrame onClose={closeAddClient} label="Clients details">

          <div className="employee-modal client-editor-modal">

            <div className="employee-modal-header">

              <div>
                <p className="admin-eyebrow">
                  CLIENT MANAGEMENT
                </p>

                <h2>Add Client</h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeAddClient}
              >
                ×
              </button>

            </div>

            <form
              className="employee-form"
              onSubmit={handleSubmit}
            >

              <div>
                <label htmlFor="add-client-name">Client Name</label>

                <input
                  type="text"
                  id="add-client-name"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="employee-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeAddClient}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Add Client
                </button>

              </div>

            </form>

          </div>
        </ModalFrame>
      )}
    </DashboardLayout>
  );
}

export default AdminClients;
