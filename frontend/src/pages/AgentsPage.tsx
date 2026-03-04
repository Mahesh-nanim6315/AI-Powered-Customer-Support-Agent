import { useEffect, useState } from 'react';
import { useAgents } from '../hooks/useAgents';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Badge, Spinner, Alert } from '../components';
import { Activity } from 'lucide-react';
import '../page.css';

export function AgentsPage() {
  const agentsQuery = useAgents();
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  // Auto-refresh when agent status changes
  useEffect(() => {
    if (realtime.agentStatusChanged.agentId) {
      const timer = setTimeout(() => {
        agentsQuery.refetch();
        setShowLiveNotification(true);
        setTimeout(() => setShowLiveNotification(false), 4000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [realtime.agentStatusChanged, agentsQuery]);

  if (agentsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const agents = agentsQuery.data || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Agents</h1>
          <p className="page-subtitle">Manage your support team</p>
        </div>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} style={{ animation: 'pulse 1s infinite' }} />
            Agent status updated in real-time
          </div>
        </Alert>
      )}

      {agents.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <p>No agents assigned yet</p>
          </div>
        </Card>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <Card key={agent.id} className="agent-card">
              <div className="agent-header">
                <h3 className="agent-email">{agent.user?.email}</h3>
                <Badge
                  variant={agent.busyStatus ? 'warning' : 'success'}
                >
                  {agent.busyStatus ? 'Busy' : 'Available'}
                </Badge>
              </div>
              <div className="agent-details">
                <div className="agent-detail-row">
                  <span className="detail-label">Active Tickets</span>
                  <span className="detail-value">{agent.activeTickets}</span>
                </div>
                {agent.specialization && (
                  <div className="agent-detail-row">
                    <span className="detail-label">Specialization</span>
                    <span className="detail-value">{agent.specialization}</span>
                  </div>
                )}
                {agent.lastAssignedAt && (
                  <div className="agent-detail-row">
                    <span className="detail-label">Last Assigned</span>
                    <span className="detail-value">
                      {new Date(agent.lastAssignedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

