import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { CheckCircle2, Clock3, MessageSquare, Sparkles } from "lucide-react";
import { Card, Spinner, Alert } from "../../components";
import { useTickets } from "../../hooks/useTickets";
import { useRealtime } from "../../context/RealtimeContext";
import "../../dashboard.css";

interface MetricCard {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  detail: string;
  color: string;
}

export function CustomerDashboardPage() {
  const ticketsQuery = useTickets();
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  useEffect(() => {
    if (!realtime.ticketUpdated.id && !realtime.ticketCreated.id) {
      return;
    }

    const timer = setTimeout(() => {
      ticketsQuery.refetch();
      setShowLiveNotification(true);
      setTimeout(() => setShowLiveNotification(false), 4000);
    }, 500);

    return () => clearTimeout(timer);
  }, [realtime.ticketUpdated, realtime.ticketCreated, ticketsQuery]);

  if (ticketsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const tickets = (ticketsQuery.data || []).slice().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const openTickets = tickets.filter((ticket) => {
    return ["OPEN", "AI_IN_PROGRESS", "ESCALATED", "IN_PROGRESS"].includes(ticket.status);
  });
  const aiReviewingTickets = tickets.filter((ticket) => ticket.status === "AI_IN_PROGRESS");
  const inProgressTickets = tickets.filter((ticket) => ticket.status === "IN_PROGRESS" || ticket.status === "ESCALATED");
  const resolvedTickets = tickets.filter((ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED");

  const metrics: MetricCard[] = [
    {
      icon: MessageSquare,
      label: "Open Tickets",
      value: openTickets.length,
      detail: "Tickets still active",
      color: "blue",
    },
    {
      icon: Sparkles,
      label: "AI Reviewing",
      value: aiReviewingTickets.length,
      detail: "Currently being handled by AI",
      color: "green",
    },
    {
      icon: Clock3,
      label: "In Progress",
      value: inProgressTickets.length,
      detail: "With a support agent",
      color: "purple",
    },
    {
      icon: CheckCircle2,
      label: "Resolved",
      value: resolvedTickets.length,
      detail: "Closed or completed tickets",
      color: "orange",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Track your tickets, latest updates, and current support progress</p>
        </div>
      </div>

      <Card className="dashboard-highlight dashboard-highlight--customer">
        <div className="dashboard-highlight__label">Support Snapshot</div>
        <div className="dashboard-highlight__title">
          {openTickets.length} active tickets, {aiReviewingTickets.length} under AI review, {resolvedTickets.length} completed
        </div>
        <div className="dashboard-highlight__detail">
          Open a ticket to review the latest reply, attachments, and current resolution progress.
        </div>
      </Card>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          Your ticket summary has been refreshed.
        </Alert>
      )}

      {ticketsQuery.isError && (
        <Alert type="warning" title="Unable to load ticket summary">
          Recent ticket updates may be incomplete until the next refresh.
        </Alert>
      )}

      <div className="metrics-grid">
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
                      {new Date(ticket.updatedAt).toLocaleDateString()} - {ticket.priority} priority
                    </div>
                    <div className="ticket-preview">
                      {ticket.messages?.[ticket.messages.length - 1]?.content?.slice(0, 84) || "No recent conversation yet"}
                    </div>
                  </div>
                  <div className={`ticket-status status--${ticket.status.toLowerCase()}`}>{ticket.status}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="dashboard-section">
          <h2 className="section-title">Status Summary</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Open</span>
              <span className="stat-value">{openTickets.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">AI Reviewing</span>
              <span className="stat-value">{aiReviewingTickets.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Agent Working</span>
              <span className="stat-value">{inProgressTickets.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{resolvedTickets.length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
