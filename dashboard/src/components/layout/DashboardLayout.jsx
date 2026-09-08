import PageHeader from "./PageHeader";
import { useLocation } from "react-router-dom";
import useAuth from "../../context/useAuth";

export default function DashboardLayout({ title, children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const overview = pathname.endsWith("/dashboard");
  return <div className="crm-page"><PageHeader title={overview ? `Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}` : title} description={overview ? "A clear view of your organization’s recorded work." : undefined} />{children}</div>;
}
