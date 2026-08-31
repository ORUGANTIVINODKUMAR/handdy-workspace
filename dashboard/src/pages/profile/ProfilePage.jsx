import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function ProfilePage() {
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phoneNumber: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get("/auth/me");

        const user = response.data.user || response.data;

        const nameParts = (user.fullName || "").trim().split(" ");

        setFormData({
          companyName: user.companyName || "",
          firstName: user.firstName || nameParts[0] || "",
          lastName:
            user.lastName ||
            nameParts.slice(1).join(" ") ||
            "",
          email: user.email || "",
          address1: user.address1 || "",
          address2: user.address2 || "",
          city: user.city || "",
          state: user.state || "",
          postalCode: user.postalCode || "",
          country: user.country || "",
          phoneNumber: user.phoneNumber || "",
        });
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load profile."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      await axiosInstance.put("/auth/profile", {
        fullName,
        email: formData.email.trim(),
        companyName: formData.companyName.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        address1: formData.address1.trim(),
        address2: formData.address2.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim(),
        phoneNumber: formData.phoneNumber.trim(),
      });

      setSuccess("Profile updated successfully.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to update profile."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <section className="admin-card profile-settings-card">
        {loading ? (
          <p>Loading profile...</p>
        ) : (
          <form
            className="profile-settings-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="admin-error-box">
                {error}
              </div>
            )}

            {success && (
              <div className="profile-success-box">
                {success}
              </div>
            )}

            <div className="profile-form-row">
              <label>
                <span className="required">*</span>
                Company name
              </label>

              <input
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
              />
            </div>

            <div className="profile-form-row">
              <label>
                <span className="required">*</span>
                First name
              </label>

              <input
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="profile-form-row">
              <label>Last name</label>

              <input
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <div className="profile-form-row">
              <label>
                <span className="required">*</span>
                Email
              </label>

              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="profile-form-row">
              <label>Address1</label>

              <input
                name="address1"
                type="text"
                value={formData.address1}
                onChange={handleChange}
              />
            </div>

            <div className="profile-form-row">
              <label>Address2</label>

              <input
                name="address2"
                type="text"
                value={formData.address2}
                onChange={handleChange}
              />
            </div>

            <div className="profile-form-row">
              <label>City</label>

              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
              />
            </div>

            <div className="profile-form-row">
              <label>State / Province</label>

              <input
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter state / province"
              />
            </div>

            <div className="profile-form-row">
              <label>Zip / Postal code</label>

              <input
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Enter zip / postal code"
              />
            </div>

            <div className="profile-form-row">
              <label>
                <span className="required">*</span>
                Country
              </label>

              <input
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                required
              />
            </div>

            <div className="profile-form-row">
              <label>
                <span className="required">*</span>
                Phone number
              </label>

              <input
                name="phoneNumber"
                type="text"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="profile-save-actions">
              <button
                type="submit"
                className="profile-save-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </section>
    </DashboardLayout>
  );
}

export default ProfilePage;