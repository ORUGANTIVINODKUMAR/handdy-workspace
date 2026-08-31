import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminScreenshots() {
  return (
    <DashboardLayout title="My Screenshots">
      <section className="admin-card">
        <p className="admin-eyebrow">
          SCREENSHOTS
        </p>

        <h2>My Screenshots</h2>

        <p>
          No screenshots found.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default AdminScreenshots;