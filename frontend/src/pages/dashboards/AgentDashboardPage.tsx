import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { AlertTriangle, Briefcase, Clock3, Inbox } from "lucide-react";
import { Card, Spinner, Alert } from "../../components";
import { useTickets, useUnassignedTickets } from "../../hooks/useTickets";
import { useAgents } from "../../hooks/useAgents";
import { useRealtime } from "../../context/RealtimeContext";
import type { AuthUser, Agent, Ticket } from "../../types";
import "../../dashboard.css";

interface AgentDashboardPageProps {
  user: AuthUser;
}

interface MetricCard {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  detail: string;
  color: string;
}

function isOwnedByAgent(ticket: Ticket, currentAgent?: Agent) {
  if (!currentAgent) {
    return false;
  }

  return (
    ticket.assignedAgentId === currentAgent.id ||
    ticket.assignedAgent?.userId === currentAgent.userId ||
    ticket.assignedAgent?.user?.id === currentAgent.user?.id
  );
}

function getLatestMessage(ticket: Ticket) {
  const messages = ticket.messages || [];
  if (messages.length === 0) {
    return null;
  }

  return [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

function getAgentQueueState(ticket: Ticket) {
  const latestMessage = getLatestMessage(ticket);

  if (!latestMessage) {
    return {
      label: "Needs first response",
      tone: "warning" as const,
    };
  }

  if (latestMessage.role === "CUSTOMER") {
    return {
      label: "Customer replied",
      tone: "warning" as const,
    };
  }

  return {
    label: "Waiting on customer",
    tone: "secondary" as const,
  };
}

export function AgentDashboardPage({ user }: AgentDashboardPageProps) {
  const ticketsQuery = useTickets();
  const unassignedQuery = useUnassignedTickets(true);
  const agentsQuery = useAgents(true);
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  useEffect(() => {
    if (!realtime.ticketUpdated.id && !realtime.ticketCreated.id) {
      return;
    }

    const timer = setTimeout(() => {
      ticketsQuery.refetch();
      unassignedQuery.refetch();
      agentsQuery.refetch();
      setShowLiveNotification(true);
      setTimeout(() => setShowLiveNotification(false), 4000);
    }, 500);

    return () => clearTimeout(timer);
  }, [realtime.ticketUpdated, realtime.ticketCreated, ticketsQuery, unassignedQuery, agentsQuery]);

  if (ticketsQuery.isLoading || unassignedQuery.isLoading || agentsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const tickets = ticketsQuery.data || [];
  const unassignedTickets = unassignedQuery.data || [];
  const agents = agentsQuery.data || [];
  const currentAgent = agents.find((agent) => agent.userId === user.id);

  const myTickets = tickets
    .filter((ticket) => isOwnedByAgent(ticket, currentAgent))
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const inProgressTickets = myTickets.filter((ticket) => ticket.status === "IN_PROGRESS");
  const escalatedTickets = myTickets.filter((ticket) => ticket.status === "ESCALATED");
  const highPriorityTickets = myTickets.filter((ticket) => ticket.priority === "HIGH");
  const customerRepliedTickets = myTickets.filter((ticket) => getLatestMessage(ticket)?.role === "CUSTOMER");
  const waitingOnCustomerTickets = myTickets.filter((ticket) => {
    const latestMessage = getLatestMessage(ticket);
    return latestMessage?.role === "AGENT" || latestMessage?.role === "AI";
  });
  const availableAgents = agents.filter((agent) => !agent.busyStatus);

  const metrics: MetricCard[] = [
    {
      icon: Briefcase,
      label: "My Tickets",
      value: myTickets.length,
      detail: "Currently assigned",
      color: "blue",
    },
    {
      icon: Clock3,
      label: "Customer Replied",
      value: customerRepliedTickets.length,
      detail: "Need your response",
      color: "purple",
    },
    {
      icon: AlertTriangle,
      label: "Escalated",
      value: escalatedTickets.length,
      detail: "Need attention now",
      color: "orange",
    },
    {
      icon: Inbox,
      label: "Unassigned Queue",
      value: unassignedTickets.length,
      detail: "Available to pick up",
      color: "green",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Agent workbench for assigned work, queue pressure, and team availability</p>
        </div>
      </div>

      <Card className="dashboard-highlight dashboard-highlight--agent">
        <div className="dashboard-highlight__label">Queue Snapshot</div>
        <div className="dashboard-highlight__title">
          {customerRepliedTickets.length} waiting for your reply, {waitingOnCustomerTickets.length} waiting on customer,{" "}
          {unassignedTickets.length} available in queue
        </div>
        <div className="dashboard-highlight__detail">
          Prioritize customer replies first, then escalations, then available unassigned work.
        </div>
      </Card>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          Agent dashboard refreshed from live ticket activity.
        </Alert>
      )}

      {(ticketsQuery.isError || unassignedQuery.isError || agentsQuery.isError) && (
        <Alert type="warning" title="Unable to load some dashboard data">
          Queue and team metrics may be incomplete until the next refresh.
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
          <h2 className="section-title">My Queue</h2>
          {myTickets.length === 0 ? (
            <div className="empty-state">
              <p>No assigned tickets right now</p>
            </div>
          ) : (
            <div className="ticket-list">
              {myTickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="ticket-item">
                  <div className="ticket-info">
                    <div className="ticket-subject">{ticket.subject}</div>
                    <div className="ticket-meta">
                      {ticket.customer?.name || ticket.customer?.email || "Unknown customer"} - {ticket.priority} priority
                    </div>
                    <div className="ticket-meta" style={{ marginTop: "0.35rem" }}>
                      {getLatestMessage(ticket)?.content?.slice(0, 72) || "No messages yet"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
                    <div className={`ticket-status status--${ticket.status.toLowerCase()}`}>{ticket.status}</div>
                    <div className={`ticket-status status--${getAgentQueueState(ticket).tone}`}>
                      {getAgentQueueState(ticket).label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="dashboard-section">
          <h2 className="section-title">Team Availability</h2>
          {agents.length === 0 ? (
            <div className="empty-state">
              <p>No agents available</p>
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
            <span className="stat-label">High Priority</span>
            <span className="stat-value">{highPriorityTickets.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Waiting on Customer</span>
            <span className="stat-value">{waitingOnCustomerTickets.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">My Active Load</span>
            <span className="stat-value">{currentAgent?.activeTickets ?? myTickets.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Team Available</span>
            <span className="stat-value">{availableAgents.length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
