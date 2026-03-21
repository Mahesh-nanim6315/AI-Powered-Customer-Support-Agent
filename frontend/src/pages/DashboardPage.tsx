import type { AuthUser } from "../types";
import { AdminDashboardPage } from "./dashboards/AdminDashboardPage";
import { AgentDashboardPage } from "./dashboards/AgentDashboardPage";
import { CustomerDashboardPage } from "./dashboards/CustomerDashboardPage";

interface DashboardPageProps {
  user?: AuthUser | null;
}

export function DashboardPage({ user }: DashboardPageProps) {
  if (user?.role === "ADMIN") {
    return <AdminDashboardPage />;
  }

  if (user?.role === "AGENT") {
    return <AgentDashboardPage user={user} />;
  }

  return <CustomerDashboardPage />;
}
