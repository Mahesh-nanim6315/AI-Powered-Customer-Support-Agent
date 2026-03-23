import { useEffect, useMemo, useState } from 'react';
import * as useAgentsHooks from '../hooks/useAgents';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Badge, Spinner, Alert, Button, Modal, Input, Select } from '../components';
import { Activity, Gauge, Plus, Edit2, Trash2, Users, UserCheck, AlertTriangle } from 'lucide-react';
import type { Agent } from '../types';
import { authService } from '../services/auth.service';
import '../page.css';
import '../dashboard.css';

export function AgentsPage() {
  const agentsQuery = useAgentsHooks.useAgents();
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  const createAgentMutation = useAgentsHooks.useCreateAgent();
  const updateAgentMutation = useAgentsHooks.useUpdateAgent();
  const deleteAgentMutation = useAgentsHooks.useDeleteAgent();
  const updateAgentStatusMutation = useAgentsHooks.useUpdateAgentStatus();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [loadFilter, setLoadFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    specialization: '',
  });

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
  const specializations = Array.from(
    new Set(agents.map((agent) => agent.specialization).filter(Boolean) as string[])
  ).sort();

  const totalAgents = agents.length;
  const availableAgents = agents.filter((agent) => !agent.busyStatus).length;
  const overloadedAgents = agents.filter((agent) => agent.activeTickets >= 5).length;
  const averageLoad = totalAgents
    ? (agents.reduce((sum, agent) => sum + agent.activeTickets, 0) / totalAgents).toFixed(1)
    : '0.0';

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const email = agent.user?.email || '';
      const specialization = agent.specialization || '';
      const matchesSearch =
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        specialization.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAvailability =
        !availabilityFilter ||
        (availabilityFilter === 'available' && !agent.busyStatus) ||
        (availabilityFilter === 'busy' && agent.busyStatus);
      const matchesLoad =
        !loadFilter ||
        (loadFilter === 'overloaded' && agent.activeTickets >= 5) ||
        (loadFilter === 'moderate' && agent.activeTickets >= 2 && agent.activeTickets < 5) ||
        (loadFilter === 'light' && agent.activeTickets < 2);
      const matchesSpecialization = !specializationFilter || specialization === specializationFilter;

      return matchesSearch && matchesAvailability && matchesLoad && matchesSpecialization;
    });
  }, [agents, searchQuery, availabilityFilter, loadFilter, specializationFilter]);

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      email: agent.user?.email || '',
      password: '',
      specialization: agent.specialization || '',
    });
    setIsEditModalOpen(true);
  };

  const getLoadTone = (activeTickets: number) => {
    if (activeTickets >= 5) return 'danger';
    if (activeTickets >= 2) return 'warning';
    return 'success';
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Agents</h1>
          <p className="page-subtitle">Manage staffing, availability, specialization, and active workload across the support team</p>
        </div>
        <div className="page-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setInviteEmail('');
              setInviteRole('AGENT');
              setInviteError(null);
              setInviteSuccess(null);
              setIsInviteModalOpen(true);
            }}
          >
            Invite Agent
          </Button>
          <Button
            onClick={() => {
              setFormData({ email: '', password: '', specialization: '' });
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={18} />
            New Agent
          </Button>
        </div>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} style={{ animation: 'pulse 1s infinite' }} />
            Agent status updated in real time
          </div>
        </Alert>
      )}

      <div className="insights-grid">
        <Card className="insight-card">
          <div className="insight-card__header">
            <div className="metric-icon metric-icon--blue"><Users size={22} /></div>
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>Coverage</h2>
              <p className="section-subtitle" style={{ margin: 0 }}>Total support staffing currently in the workspace</p>
            </div>
          </div>
          <div className="insight-row"><span>Total agents</span><strong>{totalAgents}</strong></div>
        </Card>

        <Card className="insight-card">
          <div className="insight-card__header">
            <div className="metric-icon metric-icon--green"><UserCheck size={22} /></div>
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>Availability</h2>
              <p className="section-subtitle" style={{ margin: 0 }}>Agents currently available to pick up work</p>
            </div>
          </div>
          <div className="insight-row"><span>Available now</span><strong>{availableAgents}</strong></div>
        </Card>

        <Card className="insight-card">
          <div className="insight-card__header">
            <div className="metric-icon metric-icon--orange"><AlertTriangle size={22} /></div>
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>Load Risk</h2>
              <p className="section-subtitle" style={{ margin: 0 }}>Agents likely to need rebalance attention</p>
            </div>
          </div>
          <div className="insight-row"><span>Overloaded agents</span><strong>{overloadedAgents}</strong></div>
        </Card>

        <Card className="insight-card">
          <div className="insight-card__header">
            <div className="metric-icon metric-icon--purple"><Gauge size={22} /></div>
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>Average Load</h2>
              <p className="section-subtitle" style={{ margin: 0 }}>Average active tickets per agent</p>
            </div>
          </div>
          <div className="insight-row"><span>Current average</span><strong>{averageLoad}</strong></div>
        </Card>
      </div>

      <Card className="dashboard-section">
        <div className="logs-toolbar">
          <Input
            placeholder="Search by email or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All availability' },
              { value: 'available', label: 'Available' },
              { value: 'busy', label: 'Busy' },
            ]}
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All load bands' },
              { value: 'overloaded', label: 'Overloaded (5+)' },
              { value: 'moderate', label: 'Moderate (2-4)' },
              { value: 'light', label: 'Light (0-1)' },
            ]}
            value={loadFilter}
            onChange={(e) => setLoadFilter(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All specializations' },
              ...specializations.map((specialization) => ({ value: specialization, label: specialization })),
            ]}
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
          />
        </div>
      </Card>

      {filteredAgents.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <p>No agents matched the current filters</p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="management-table-card management-table-card--desktop">
            <div className="management-table-wrap">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Specialization</th>
                    <th>Availability</th>
                    <th>Active Tickets</th>
                    <th>Load State</th>
                    <th>Last Assigned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id}>
                      <td>
                        <div className="management-identity">
                          <div className="management-identity__avatar">
                            {(agent.user?.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="management-identity__content">
                            <div className="management-identity__title">{agent.user?.email}</div>
                            <div className="management-identity__subtitle">Support agent</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={agent.specialization ? 'info' : 'warning'}>
                          {agent.specialization || 'General queue'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={agent.busyStatus ? 'warning' : 'success'}>
                          {agent.busyStatus ? 'Busy now' : 'Available'}
                        </Badge>
                      </td>
                      <td>
                        <span className="management-number">{agent.activeTickets}</span>
                      </td>
                      <td>
                        <span className={`management-load-state management-load-state--${getLoadTone(agent.activeTickets)}`}>
                          {agent.activeTickets >= 5 ? 'Overloaded' : agent.activeTickets >= 2 ? 'Moderate' : 'Light'}
                        </span>
                      </td>
                      <td>
                        <span className="management-muted">
                          {agent.lastAssignedAt
                            ? new Date(agent.lastAssignedAt).toLocaleString()
                            : 'No assignments yet'}
                        </span>
                      </td>
                      <td>
                        <div className="management-row-actions">
                          <Button
                            size="sm"
                            variant={agent.busyStatus ? 'primary' : 'secondary'}
                            onClick={() => updateAgentStatusMutation.mutate({ id: agent.id, busyStatus: !agent.busyStatus })}
                            disabled={updateAgentStatusMutation.isPending}
                          >
                            {agent.busyStatus ? 'Mark Available' : 'Mark Busy'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openEditModal(agent)}>
                            <Edit2 size={14} />
                            Edit
                          </Button>
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
                                await deleteAgentMutation.mutateAsync(agent.id);
                              }
                            }}
                            className="icon-action icon-action--danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="management-grid management-grid--mobile">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="management-card">
                <div className="management-card__header">
                  <div className="management-card__title-block">
                    <h3 className="management-card__title">{agent.user?.email}</h3>
                    <div className="management-card__meta">
                      <Badge variant={agent.specialization ? 'info' : 'warning'}>
                        {agent.specialization || 'General queue'}
                      </Badge>
                      <Badge variant={agent.busyStatus ? 'warning' : 'success'}>
                        {agent.busyStatus ? 'Busy now' : 'Available'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="management-card__details">
                  <div className="management-detail-row">
                    <span className="management-detail-label">Active tickets</span>
                    <span className="management-detail-value">{agent.activeTickets}</span>
                  </div>
                  <div className="management-detail-row">
                    <span className="management-detail-label">Load state</span>
                    <span className={`management-detail-value management-detail-value--${getLoadTone(agent.activeTickets)}`}>
                      {agent.activeTickets >= 5 ? 'Overloaded' : agent.activeTickets >= 2 ? 'Moderate' : 'Light'}
                    </span>
                  </div>
                  <div className="management-detail-row">
                    <span className="management-detail-label">Last assigned</span>
                    <span className="management-detail-value">
                      {agent.lastAssignedAt
                        ? new Date(agent.lastAssignedAt).toLocaleDateString()
                        : 'Not assigned yet'}
                    </span>
                  </div>
                </div>
                <div className="management-card__actions">
                  <Button
                    size="sm"
                    variant={agent.busyStatus ? 'primary' : 'secondary'}
                    onClick={() => updateAgentStatusMutation.mutate({ id: agent.id, busyStatus: !agent.busyStatus })}
                    disabled={updateAgentStatusMutation.isPending}
                  >
                    {agent.busyStatus ? 'Mark Available' : 'Mark Busy'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(agent)}>
                    <Edit2 size={14} />
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Support Agent"
        actions={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                await createAgentMutation.mutateAsync({
                  email: formData.email,
                  password: formData.password,
                  specialization: formData.specialization
                });
                setIsCreateModalOpen(false);
              }}
              disabled={createAgentMutation.isPending || !formData.email || !formData.password}
            >
              {createAgentMutation.isPending ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Email *" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} />
          <Input label="Temporary Password *" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} />
          <Input label="Specialization" placeholder="e.g. Billing, Technical" value={formData.specialization} onChange={(e) => setFormData(prev => ({...prev, specialization: e.target.value}))} />
        </div>
      </Modal>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Support Agent"
        actions={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setInviteError(null);
                setInviteSuccess(null);
                setIsInviting(true);
                try {
                  await authService.invite(inviteEmail, inviteRole);
                  setInviteSuccess('Invite sent successfully.');
                  setInviteEmail('');
                } catch (error: any) {
                  setInviteError(error?.message || 'Failed to send invite.');
                } finally {
                  setIsInviting(false);
                }
              }}
              disabled={isInviting || !inviteEmail}
            >
              {isInviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {inviteError && (
            <Alert type="warning" title="Invite Error">
              {inviteError}
            </Alert>
          )}
          {inviteSuccess && (
            <Alert type="info" title="Invite Sent">
              {inviteSuccess}
            </Alert>
          )}
          <Input
            label="Email *"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            label="Role"
            options={[
              { value: 'AGENT', label: 'Agent' },
            ]}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Support Agent"
        actions={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedAgent) return;

                const payload: any = {
                  id: selectedAgent.id,
                  email: formData.email,
                  specialization: formData.specialization
                };
                if (formData.password) {
                  payload.password = formData.password;
                }

                await updateAgentMutation.mutateAsync(payload);
                setIsEditModalOpen(false);
              }}
              disabled={updateAgentMutation.isPending || !formData.email}
            >
              {updateAgentMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Email *" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} />
          <Input label="New Password (Optional)" type="password" placeholder="Leave empty to keep current password" value={formData.password} onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} />
          <Input label="Specialization" placeholder="e.g. Billing, Technical" value={formData.specialization} onChange={(e) => setFormData(prev => ({...prev, specialization: e.target.value}))} />
        </div>
      </Modal>
    </div>
  );
}
