import { useDashboardAnalytics, useAdminAnalytics } from '../hooks/useAnalytics';
import { useTickets } from '../hooks/useTickets';
import { useAgents } from '../hooks/useAgents';
import { useCustomers } from '../hooks/useCustomers';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Spinner, Alert } from '../components';
import { TrendingUp, Users, Zap, MessageSquare, Clock, Target, UserCheck, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AuthUser } from '../types';
import '../dashboard.css';

interface DashboardPageProps {
  user?: AuthUser | null;
}

interface MetricCard {
  icon: any;
  label: string;
  value: any;
  detail?: string;
  color: string;
  total?: number;
  trend?: string;
}

export function DashboardPage({ user }: DashboardPageProps) {
  const isCustomer = user?.role === 'CUSTOMER';
  const isAdmin = user?.role === 'ADMIN';
  
  // Use different analytics based on user role
  const analyticsQuery = useDashboardAnalytics(!isCustomer && !isAdmin);
  const adminAnalyticsQuery = useAdminAnalytics(isAdmin);
  
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
        adminAnalyticsQuery.refetch();
        ticketsQuery.refetch();
        setShowLiveNotification(true);
        setTimeout(() => setShowLiveNotification(false), 4000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [realtime.ticketUpdated, realtime.ticketCreated, analyticsQuery, adminAnalyticsQuery, ticketsQuery]);

  const isLoading = isAdmin ? adminAnalyticsQuery.isLoading : analyticsQuery.isLoading;
  const isError = isAdmin ? adminAnalyticsQuery.isError : analyticsQuery.isError;

  if (isLoading || ticketsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  // Use admin analytics for admin users, regular analytics for others
  const analytics = isAdmin ? adminAnalyticsQuery.data : analyticsQuery.data;
  const tickets = ticketsQuery.data || [];
  const agents = agentsQuery.data || [];
  const customers = customersQuery.data || [];

  // Helper function to safely get analytics values
  const getAnalyticsValue = (key: string, fallback: any = 0) => {
    if (!analytics) return fallback;
    return (analytics as any)[key] ?? fallback;
  };

  // Enhanced metrics for admin users
  const metrics: MetricCard[] = isAdmin ? [
    {
      icon: MessageSquare,
      label: 'Total Tickets',
      value: getAnalyticsValue('totalTickets'),
      detail: 'All time',
      color: 'blue',
    },
    {
      icon: Target,
      label: 'Active Tickets',
      value: getAnalyticsValue('activeTickets'),
      detail: 'Currently open',
      color: 'orange',
    },
    {
      icon: Zap,
      label: 'AI Resolution Rate',
      value: `${Math.round((getAnalyticsValue('aiResolutionRate') || 0) * 100)}%`,
      detail: 'AI-resolved tickets',
      color: 'green',
    },
    {
      icon: Users,
      label: 'Agent Resolution Rate',
      value: `${Math.round((getAnalyticsValue('agentResolutionRate') || 0) * 100)}%`,
      detail: 'Agent-resolved tickets',
      color: 'purple',
    },
    {
      icon: Clock,
      label: 'Avg Response Time',
      value: `${Math.round(getAnalyticsValue('avgResponseTime') || 0)}m`,
      detail: 'First response',
      color: 'indigo',
    },
    {
      icon: TrendingUp,
      label: 'CSAT Score',
      value: `${Math.round((getAnalyticsValue('csat') || 0) * 100)}%`,
      detail: 'Customer satisfaction',
      color: 'pink',
    },
    {
      icon: AlertTriangle,
      label: 'Escalation Rate',
      value: `${Math.round((getAnalyticsValue('escalationRate') || 0) * 100)}%`,
      detail: 'Tickets escalated',
      color: 'red',
    },
    {
      icon: UserCheck,
      label: 'Active Agents',
      value: getAnalyticsValue('activeAgents'),
      detail: 'Available now',
      color: 'teal',
    },
  ] : [
    {
      icon: MessageSquare,
      label: 'Open Tickets',
      value: getAnalyticsValue('openTickets'),
      total: getAnalyticsValue('totalTickets'),
      trend: getAnalyticsValue('openTickets') ? '+5 today' : 'No open tickets',
      color: 'blue',
    },
    {
      icon: Zap,
      label: 'AI Resolution Rate',
      value: `${Math.round((getAnalyticsValue('aiResolutionRate') || 0) * 100)}%`,
      detail: `${getAnalyticsValue('resolvedTickets') || 0} resolved`,
      color: 'green',
    },
    {
      icon: TrendingUp,
      label: 'Avg Response Time',
      value: `${Math.round((getAnalyticsValue('avgResponseTime') || 0) / 60)}m`,
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
            {isAdmin ? 'Admin overview of your AI-powered support operations' : 'Overview of your AI-powered support operations'}
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

      {isError && (
        <Alert type="warning" title="Unable to load analytics">
          Some metrics may not be available. Using cached data.
        </Alert>
      )}

      <div className={`metrics-grid ${isAdmin ? 'metrics-grid--admin' : ''}`}>
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
                {metric.trend && (
                  <div className="metric-detail">{metric.trend}</div>
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

        {!isCustomer && (
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
        )}
      </div>

      {!isCustomer && (
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
              <span className="stat-value">{Math.round((getAnalyticsValue('customerSatisfaction') || (isAdmin ? getAnalyticsValue('csat') : 0) || 0) * 100)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Resolved This Week</span>
              <span className="stat-value">{getAnalyticsValue('resolvedTickets')}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

