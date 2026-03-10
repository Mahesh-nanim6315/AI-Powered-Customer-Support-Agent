import { useEffect, useState } from 'react';
import * as useAgentsHooks from '../hooks/useAgents';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Badge, Spinner, Alert, Button, Modal, Input, Select } from '../components';
import { Activity, Plus, Edit2, Trash2 } from 'lucide-react';
import type { Agent } from '../types';
import { authService } from '../services/auth.service';
import '../page.css';

export function AgentsPage() {
  const agentsQuery = useAgentsHooks.useAgents();
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);
  const userRole = JSON.parse(localStorage.getItem('chitti_auth_user') || '{}')?.role;

  const createAgentMutation = useAgentsHooks.useCreateAgent();
  const updateAgentMutation = useAgentsHooks.useUpdateAgent();
  const deleteAgentMutation = useAgentsHooks.useDeleteAgent();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
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
        {userRole === 'ADMIN' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            <Button onClick={() => {
              setFormData({ email: '', password: '', specialization: '' });
              setIsCreateModalOpen(true);
            }}>
              <Plus size={18} />
              New Agent
            </Button>
          </div>
        )}
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
                {userRole === 'ADMIN' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button 
                      onClick={() => {
                        setSelectedAgent(agent);
                        setFormData({ email: agent.user?.email || '', password: '', specialization: agent.specialization || '' });
                        setIsEditModalOpen(true);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
                            await deleteAgentMutation.mutateAsync(agent.id);
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
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

      {/* CREATE AGENT MODAL */}
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

      {/* INVITE AGENT MODAL */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Team Member"
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
              { value: 'ADMIN', label: 'Admin' },
              { value: 'CUSTOMER', label: 'Customer' },
            ]}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          />
        </div>
      </Modal>

      {/* EDIT AGENT MODAL */}
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

