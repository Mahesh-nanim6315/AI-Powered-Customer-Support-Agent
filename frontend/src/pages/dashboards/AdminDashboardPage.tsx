import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Card, Spinner, Alert } from "../../components";
import { useAdminAnalytics } from "../../hooks/useAnalytics";
import { useTickets } from "../../hooks/useTickets";
import { useAgents } from "../../hooks/useAgents";
import { useCustomers } from "../../hooks/useCustomers";
import { useRealtime } from "../../context/RealtimeContext";
import "../../dashboard.css";

interface MetricCard {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  detail: string;
  color: string;
}

export function AdminDashboardPage() {
  const analyticsQuery = useAdminAnalytics(true);
  const ticketsQuery = useTickets();
  const agentsQuery = useAgents(true);
  const customersQuery = useCustomers(true);
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  useEffect(() => {
    if (!realtime.ticketUpdated.id && !realtime.ticketCreated.id) {
      return;
    }

    const timer = setTimeout(() => {
      analyticsQuery.refetch();
      ticketsQuery.refetch();
      agentsQuery.refetch();
      customersQuery.refetch();
      setShowLiveNotification(true);
      setTimeout(() => setShowLiveNotification(false), 4000);
    }, 500);

    return () => clearTimeout(timer);
  }, [realtime.ticketUpdated, realtime.ticketCreated, analyticsQuery, ticketsQuery, agentsQuery, customersQuery]);

  if (analyticsQuery.isLoading || ticketsQuery.isLoading || agentsQuery.isLoading || customersQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const tickets = (ticketsQuery.data || []).slice().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const agents = agentsQuery.data || [];
  const customers = customersQuery.data || [];

  const metrics: MetricCard[] = [
    {
      icon: MessageSquare,
      label: "Total Tickets",
      value: analytics?.totalTickets ?? 0,
      detail: "All time",
      color: "blue",
    },
    {
      icon: Target,
      label: "Active Tickets",
      value: analytics?.activeTickets ?? 0,
      detail: "Currently open",
      color: "orange",
    },
    {
      icon: Zap,
      label: "AI Resolution Rate",
      value: `${Math.round((analytics?.aiResolutionRate ?? 0) * 100)}%`,
      detail: "AI-resolved tickets",
      color: "green",
    },
    {
      icon: Users,
      label: "Agent Resolution Rate",
      value: `${Math.round((analytics?.agentResolutionRate ?? 0) * 100)}%`,
      detail: "Agent-resolved tickets",
      color: "purple",
    },
    {
      icon: Clock,
      label: "Avg Response Time",
      value: `${Math.round(analytics?.avgResponseTime ?? 0)}m`,
      detail: "First response",
      color: "indigo",
    },
    {
      icon: TrendingUp,
      label: "CSAT Score",
      value: `${Math.round((analytics?.csat ?? 0) * 100)}%`,
      detail: "Customer satisfaction",
      color: "pink",
    },
    {
      icon: AlertTriangle,
      label: "Escalation Rate",
      value: `${Math.round((analytics?.escalationRate ?? 0) * 100)}%`,
      detail: "Tickets escalated",
      color: "red",
    },
    {
      icon: UserCheck,
      label: "Active Agents",
      value: analytics?.activeAgents ?? 0,
      detail: "Available now",
      color: "teal",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Admin overview of your AI-powered support operations</p>
        </div>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          Dashboard metrics updated from live events.
        </Alert>
      )}

      {analyticsQuery.isError && (
        <Alert type="warning" title="Unable to load analytics">
          Some admin metrics are unavailable right now.
        </Alert>
      )}

      <div className="metrics-grid metrics-grid--admin">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="metric-card">
              <div className="metric-header">
                <div className={`metric-icon metric-icon--${metric.color}`}>
                  <Icon size={24} />
                </div>
                <h3 className="metric-label">{metric.label}</h3>
              </div>
              <div className="metric-body">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-detail">{metric.detail}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-section">
          <h2 className="section-title">Recent Tickets</h2>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>No tickets yet</p>
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="ticket-item">
                  <div className="ticket-info">
                    <div className="ticket-subject">{ticket.subject}</div>
                    <div className="ticket-meta">
                      {ticket.customer?.name || ticket.customer?.email || "Unknown customer"} -{" "}
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`ticket-status status--${ticket.status.toLowerCase()}`}>{ticket.status}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="dashboard-section">
          <h2 className="section-title">Team Activity</h2>
          {agents.length === 0 ? (
            <div className="empty-state">
              <p>No agents assigned</p>
            </div>
          ) : (
            <div className="agent-list">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="agent-item">
                  <div className="agent-info">
                    <div className="agent-email">{agent.user?.email}</div>
                    <div className="agent-status">
                      {agent.activeTickets} active ticket{agent.activeTickets !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className={`agent-state ${agent.busyStatus ? "busy" : "available"}`}>
                    {agent.busyStatus ? "Busy" : "Available"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="dashboard-section">
        <h2 className="section-title">Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Customers</span>
            <span className="stat-value">{customers.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Agents</span>
            <span className="stat-value">{agents.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Satisfaction Score</span>
            <span className="stat-value">{Math.round((analytics?.csat ?? 0) * 100)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolved Tickets</span>
            <span className="stat-value">{tickets.filter((ticket) => ticket.status === "RESOLVED").length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
