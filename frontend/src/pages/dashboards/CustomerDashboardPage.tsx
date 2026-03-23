import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, LifeBuoy, MessageSquare, Plus, Sparkles } from "lucide-react";
import { Card, Spinner, Alert, Button } from "../../components";
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
  const navigate = useNavigate();
  const ticketsQuery = useTickets();
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  const tickets = (ticketsQuery.data || []).slice().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const openTickets = tickets.filter((ticket) =>
    ["OPEN", "AI_IN_PROGRESS", "ESCALATED", "IN_PROGRESS"].includes(ticket.status)
  );
  const aiReviewingTickets = tickets.filter((ticket) => ticket.status === "AI_IN_PROGRESS");
  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS" || ticket.status === "ESCALATED"
  );
  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED"
  );
  const awaitingSupportTickets = tickets.filter((ticket) => {
    const lastMessage = ticket.messages?.[ticket.messages.length - 1];
    return lastMessage?.role === "CUSTOMER";
  });
  const latestTicket = tickets[0] || null;

  const latestUpdateSummary = useMemo(() => {
    if (!latestTicket) {
      return null;
    }

    const latestMessage = latestTicket.messages?.[latestTicket.messages.length - 1];
    const responder =
      latestMessage?.role === "AI"
        ? "AI replied"
        : latestMessage?.role === "AGENT"
          ? "Agent replied"
          : latestMessage?.role === "CUSTOMER"
            ? "Awaiting support"
            : "No conversation yet";

    return {
      title: latestTicket.subject,
      responder,
      preview:
        latestMessage?.content?.slice(0, 120) ||
        latestTicket.description ||
        "No recent conversation yet",
      updatedAt: latestTicket.updatedAt,
      id: latestTicket.id,
    };
  }, [latestTicket]);

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

      <div className="dashboard-action-strip dashboard-action-strip--customer">
        <div className="dashboard-action-strip__main">
          <div className="dashboard-action-strip__label">Latest update</div>
          <div className="dashboard-action-strip__title">
            {latestUpdateSummary ? latestUpdateSummary.title : "No tickets yet"}
          </div>
          <div className="dashboard-action-strip__detail">
            {latestUpdateSummary
              ? `${latestUpdateSummary.responder} • ${new Date(latestUpdateSummary.updatedAt).toLocaleString()}`
              : "Create your first ticket to start a conversation with support."}
          </div>
        </div>
        <div className="dashboard-action-strip__actions">
          <Button
            onClick={() =>
              navigate(latestUpdateSummary ? `/tickets?ticketId=${latestUpdateSummary.id}` : "/tickets")
            }
          >
            Open latest ticket
          </Button>
          <Button variant="secondary" onClick={() => navigate("/tickets")}>
            <Plus size={16} />
            Create ticket
          </Button>
        </div>
      </div>

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
          <div className="section-header-inline">
            <div>
              <h2 className="section-title">What Needs Attention</h2>
              <p className="section-subtitle">The clearest next steps from your support inbox.</p>
            </div>
          </div>
          <div className="attention-grid">
            <div className="attention-card">
              <div className="attention-card__label">Awaiting support</div>
              <div className="attention-card__value">{awaitingSupportTickets.length}</div>
              <div className="attention-card__detail">
                Tickets where your message is waiting for AI or agent follow-up.
              </div>
            </div>
            <div className="attention-card">
              <div className="attention-card__label">Latest reply</div>
              <div className="attention-card__value">
                {latestUpdateSummary ? latestUpdateSummary.responder : "None yet"}
              </div>
              <div className="attention-card__detail">
                Quick visibility into whether support answered last.
              </div>
            </div>
          </div>
        </Card>

        <Card className="dashboard-section">
          <div className="section-header-inline">
            <div>
              <h2 className="section-title">Recent Tickets</h2>
              <p className="section-subtitle">
                Your most recent support conversations and their current state.
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/tickets")}>
              View all tickets
            </Button>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>No tickets yet</p>
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.slice(0, 5).map((ticket) => {
                const latestMessage = ticket.messages?.[ticket.messages.length - 1];
                const helper =
                  latestMessage?.role === "CUSTOMER"
                    ? "Awaiting support"
                    : latestMessage?.role === "AI"
                      ? "AI replied"
                      : latestMessage?.role === "AGENT"
                        ? "Agent replied"
                        : "No replies yet";

                return (
                  <button
                    key={ticket.id}
                    className="ticket-item ticket-item--interactive"
                    onClick={() => navigate(`/tickets?ticketId=${ticket.id}`)}
                  >
                    <div className="ticket-info">
                      <div className="ticket-subject">{ticket.subject}</div>
                      <div className="ticket-meta">
                        {new Date(ticket.updatedAt).toLocaleDateString()} - {ticket.priority} priority
                      </div>
                      <div className="ticket-preview">
                        {latestMessage?.content?.slice(0, 84) || "No recent conversation yet"}
                      </div>
                      <div className="ticket-helper-row">{helper}</div>
                    </div>
                    <div className="ticket-item__side">
                      <div className={`ticket-status status--${ticket.status.toLowerCase()}`}>
                        {ticket.status}
                      </div>
                      <ArrowRight size={16} />
                    </div>
                  </button>
                );
              })}
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

      <div className="dashboard-grid">
        <Card className="dashboard-section">
          <div className="section-header-inline">
            <div>
              <h2 className="section-title">Latest Conversation</h2>
              <p className="section-subtitle">
                A quick preview so you can tell whether support responded.
              </p>
            </div>
          </div>
          {latestUpdateSummary ? (
            <div className="conversation-glance">
              <div className="conversation-glance__header">
                <div>
                  <div className="conversation-glance__title">{latestUpdateSummary.title}</div>
                  <div className="conversation-glance__meta">
                    {latestUpdateSummary.responder} •{" "}
                    {new Date(latestUpdateSummary.updatedAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/tickets?ticketId=${latestUpdateSummary.id}`)}
                >
                  Open
                </Button>
              </div>
              <div className="conversation-glance__preview">{latestUpdateSummary.preview}</div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No recent support conversation yet</p>
            </div>
          )}
        </Card>

        <Card className="dashboard-section">
          <div className="section-header-inline">
            <div>
              <h2 className="section-title">Self-Service Tips</h2>
              <p className="section-subtitle">
                Simple ways to resolve issues faster before or during support.
              </p>
            </div>
            <LifeBuoy size={18} color="#2563eb" />
          </div>
          <div className="guidance-grid">
            <div className="guidance-card">
              <div className="guidance-card__title">Add screenshots or files</div>
              <div className="guidance-card__text">
                Attachments help the team understand the issue faster and reduce back-and-forth.
              </div>
            </div>
            <div className="guidance-card">
              <div className="guidance-card__title">Use one issue per ticket</div>
              <div className="guidance-card__text">
                Separate issues are easier to track, resolve, and reopen if needed.
              </div>
            </div>
            <div className="guidance-card">
              <div className="guidance-card__title">Check for the latest reply</div>
              <div className="guidance-card__text">
                Open your most recent ticket first if you are waiting on support or need to respond.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
