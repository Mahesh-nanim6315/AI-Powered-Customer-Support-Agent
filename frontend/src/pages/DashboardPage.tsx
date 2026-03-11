import { useDashboardAnalytics } from '../hooks/useAnalytics';
import { useTickets } from '../hooks/useTickets';
import { useAgents } from '../hooks/useAgents';
import { useCustomers } from '../hooks/useCustomers';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Spinner, Alert } from '../components';
import { TrendingUp, Users, Zap, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AuthUser } from '../types';
import '../dashboard.css';

interface DashboardPageProps {
  user?: AuthUser | null;
}

export function DashboardPage({ user }: DashboardPageProps) {
  const isCustomer = user?.role === 'CUSTOMER';
  const analyticsQuery = useDashboardAnalytics(!isCustomer);
  const ticketsQuery = useTickets();
  const agentsQuery = useAgents(!isCustomer);
  const customersQuery = useCustomers(!isCustomer);
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  // Auto-refresh analytics when real-time events occur
  useEffect(() => {
    if (realtime.ticketUpdated.id || realtime.ticketCreated.id) {
      // Delay slightly to allow backend to process
      const timer = setTimeout(() => {
        analyticsQuery.refetch();
        ticketsQuery.refetch();
        setShowLiveNotification(true);
        setTimeout(() => setShowLiveNotification(false), 4000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [realtime.ticketUpdated, realtime.ticketCreated, analyticsQuery, ticketsQuery]);

  if (analyticsQuery.isLoading || ticketsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const tickets = ticketsQuery.data || [];
  const agents = agentsQuery.data || [];
  const customers = customersQuery.data || [];

  const metrics = [
    {
      icon: MessageSquare,
      label: 'Open Tickets',
      value: analytics?.openTickets || 0,
      total: analytics?.totalTickets || 0,
      trend: analytics?.openTickets ? '+5 today' : 'No open tickets',
      color: 'blue',
    },
    {
      icon: Zap,
      label: 'AI Resolution Rate',
      value: `${Math.round((analytics?.aiResolutionRate || 0) * 100)}%`,
      detail: `${analytics?.resolvedTickets || 0} resolved`,
      color: 'green',
    },
    {
      icon: TrendingUp,
      label: 'Avg Response Time',
      value: `${Math.round((analytics?.avgResponseTime || 0) / 60)}m`,
      detail: 'Last 7 days',
      color: 'purple',
    },
    {
      icon: Users,
      label: 'Active Agents',
      value: agents.filter((a) => !a.busyStatus).length,
      total: agents.length,
      color: 'orange',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of your AI-powered support operations
          </p>
        </div>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={16} style={{ animation: 'pulse 1s infinite' }} />
            Dashboard metrics updated from live events
          </div>
        </Alert>
      )}

      {analyticsQuery.isError && (
        <Alert type="warning" title="Unable to load analytics">
          Some metrics may not be available. Using cached data.
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
                {metric.total && (
                  <div className="metric-detail">of {metric.total} total</div>
                )}
                {metric.detail && (
                  <div className="metric-detail">{metric.detail}</div>
                )}
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
                      {ticket.customer?.name} • {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`ticket-status status--${ticket.status.toLowerCase()}`}>
                    {ticket.status}
                  </div>
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
                      {agent.activeTickets} active ticket{agent.activeTickets !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className={`agent-state ${agent.busyStatus ? 'busy' : 'available'}`}>
                    {agent.busyStatus ? 'Busy' : 'Available'}
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
            <span className="stat-value">{Math.round((analytics?.customerSatisfaction || 0) * 100)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolved This Week</span>
            <span className="stat-value">{analytics?.resolvedTickets || 0}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

