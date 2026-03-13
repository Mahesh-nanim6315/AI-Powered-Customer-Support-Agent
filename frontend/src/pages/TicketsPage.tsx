import { useState, useEffect } from 'react';
import { useTickets, useUnassignedTickets, useCreateTicket, useUpdateTicketStatus, useTicket, useAddMessage, useUpdateTicket, useDeleteTicket } from '../hooks/useTickets';
import { useCustomers } from '../hooks/useCustomers';
import { useRealtime } from '../context/RealtimeContext';
import { useEmitSocket } from '../hooks/useSocket';
import { Card, Button, Input, Select, Badge, Spinner, Modal, TextArea, Alert } from '../components';
import { ChevronRight, Plus, Zap, Search, MessageSquare } from 'lucide-react';
import type { TicketStatus, AuthUser } from '../types';
import '../page.css';

interface TicketsPageProps {
  user?: AuthUser | null;
}

export function TicketsPage({ user }: TicketsPageProps) {
  const ticketsQuery = useTickets();
  const customersQuery = useCustomers(user?.role !== 'CUSTOMER');
  const isAgent = user?.role === 'AGENT';
  const unassignedTicketsQuery = useUnassignedTickets(Boolean(isAgent));
  const createTicketMutation = useCreateTicket();
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateTicket();
  const deleteTicketMutation = useDeleteTicket();
  const addMessageMutation = useAddMessage();
  const realtime = useRealtime();
  const emitSocket = useEmitSocket(user?.token || null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicketQuery = useTicket(selectedTicketId || '');
  const [showLiveNotification, setShowLiveNotification] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [currentAiMode, setCurrentAiMode] = useState<'llm' | 'kb_fallback' | 'safe_fallback' | null>(null);
  const [agentView, setAgentView] = useState<'my' | 'unassigned'>('my');
  const [createFormData, setCreateFormData] = useState({
    customerId: '',
    subject: '',
    description: '',
    priority: 'MEDIUM' as const,
  });
  const [editFormData, setEditFormData] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  });

  const tickets = ticketsQuery.data || [];
  const unassignedTickets = unassignedTicketsQuery.data || [];
  const customers = customersQuery.data || [];
  const selectedTicket = selectedTicketQuery.data;
  const isAdmin = user?.role === 'ADMIN';
  const activeTickets = isAgent && agentView === 'unassigned' ? unassignedTickets : tickets;

  useEffect(() => {
    if (user?.role === 'CUSTOMER' && user?.id && !createFormData.customerId) {
      setCreateFormData((prev) => ({ ...prev, customerId: user.id }));
    }
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (realtime.ticketCreated.id || realtime.ticketUpdated.id) {
      setShowLiveNotification(true);
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
      const timer = setTimeout(() => setShowLiveNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [realtime.ticketCreated, realtime.ticketUpdated, ticketsQuery, unassignedTicketsQuery, isAgent]);

  useEffect(() => {
    if (!selectedTicketId) return;
    emitSocket('join-ticket', selectedTicketId);
  }, [selectedTicketId, emitSocket]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (realtime.messageAdded.ticketId === selectedTicketId) {
      selectedTicketQuery.refetch();
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
    }
  }, [selectedTicketId, realtime.messageAdded, selectedTicketQuery, ticketsQuery, unassignedTicketsQuery, isAgent]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (realtime.aiMode?.ticketId === selectedTicketId && realtime.aiMode?.mode) {
      setCurrentAiMode(realtime.aiMode.mode);
    }
  }, [selectedTicketId, realtime.aiMode]);

  useEffect(() => {
    if (!selectedTicketId || isAdmin) return;
    const isTyping = messageText.trim().length > 0;
    emitSocket('typing_indicator', { ticketId: selectedTicketId, isTyping });
    const timer = setTimeout(() => {
      emitSocket('typing_indicator', { ticketId: selectedTicketId, isTyping: false });
    }, 800);
    return () => clearTimeout(timer);
  }, [messageText, selectedTicketId, emitSocket, isAdmin]);

  useEffect(() => {
    if (!selectedTicket) return;
    setEditFormData({
      subject: selectedTicket.subject || '',
      description: selectedTicket.description || '',
      priority: (selectedTicket.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
    });
  }, [selectedTicket?.id]);

  const filteredActiveTickets = activeTickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const canUpdateStatus = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const canManageTicket = user?.role === 'ADMIN' || user?.role === 'AGENT' || user?.role === 'CUSTOMER';
  const statusOptions: TicketStatus[] = ['OPEN', 'AI_IN_PROGRESS', 'ESCALATED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  const handleCreateTicket = async () => {
    if (!createFormData.customerId || !createFormData.subject) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const created = await createTicketMutation.mutateAsync({
        customerId: createFormData.customerId,
        subject: createFormData.subject,
        description: createFormData.description,
        priority: createFormData.priority,
      });
      setIsCreateModalOpen(false);
      setCreateFormData({ customerId: '', subject: '', description: '', priority: 'MEDIUM' });
      setSelectedTicketId(created.id);
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: ticketId, status: newStatus });
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
      if (selectedTicketId === ticketId) selectedTicketQuery.refetch();
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedTicket) return;
    setEditFormData({
      subject: selectedTicket.subject || '',
      description: selectedTicket.description || '',
      priority: (selectedTicket.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateTicketMutation.mutateAsync({
        id: selectedTicket.id,
        data: {
          subject: editFormData.subject,
          description: editFormData.description,
          priority: editFormData.priority,
        },
      });
      setIsEditModalOpen(false);
      selectedTicketQuery.refetch();
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      alert('Failed to update ticket');
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Delete this ticket permanently?')) return;
    try {
      await deleteTicketMutation.mutateAsync({ id: selectedTicket.id });
      setSelectedTicketId(null);
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      alert('Failed to delete ticket');
    }
  };

  const handleSendMessage = async () => {
    if (isAdmin) return;
    if (!selectedTicketId || !messageText.trim()) return;
    try {
      const response = await addMessageMutation.mutateAsync({ ticketId: selectedTicketId, content: messageText.trim() });
      setMessageText('');
      if (response.aiMode) {
        setCurrentAiMode(response.aiMode);
      }
      emitSocket('typing_indicator', { ticketId: selectedTicketId, isTyping: false });
      selectedTicketQuery.refetch();
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
      setTimeout(() => {
        selectedTicketQuery.refetch();
        ticketsQuery.refetch();
        if (isAgent) unassignedTicketsQuery.refetch();
      }, 3500);
      setTimeout(() => {
        selectedTicketQuery.refetch();
        ticketsQuery.refetch();
        if (isAgent) unassignedTicketsQuery.refetch();
      }, 9000);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check connection and retry.');
    }
  };

  const priorityColors: Record<string, 'danger' | 'warning' | 'success'> = {
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'success',
  };

  const statusColors: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
    OPEN: 'danger',
    ESCALATED: 'warning',
    IN_PROGRESS: 'info',
    AI_IN_PROGRESS: 'info',
    RESOLVED: 'success',
    CLOSED: 'success',
  };

  const statusLabelMap: Record<string, string> = {
    OPEN: 'Open',
    AI_IN_PROGRESS: 'AI In Progress',
    ESCALATED: 'Escalated',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };

  const aiModeLabelMap: Record<string, string> = {
    llm: 'AI Mode: LLM',
    kb_fallback: 'AI Mode: KB Fallback',
    safe_fallback: 'AI Mode: Safe Fallback',
  };

  const aiModeVariantMap: Record<string, 'success' | 'warning' | 'danger'> = {
    llm: 'success',
    kb_fallback: 'warning',
    safe_fallback: 'danger',
  };

  if (ticketsQuery.isLoading || customersQuery.isLoading || (isAgent && unassignedTicketsQuery.isLoading)) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Industry-style queue + live conversation workspace</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          New Ticket
        </Button>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={16} style={{ animation: 'pulse 1s infinite' }} />
            Queue and thread synced in real time
          </div>
        </Alert>
      )}

      {!realtime.isConnected && (
        <Alert type="warning" title="Connection Status">
          Reconnecting to live updates...
        </Alert>
      )}

      <div className="tickets-workspace">
        <Card className="tickets-pane tickets-pane--list">
          {isAgent && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <Button
                variant={agentView === 'my' ? 'primary' : 'secondary'}
                onClick={() => setAgentView('my')}
              >
                My Tickets ({tickets.length})
              </Button>
              <Button
                variant={agentView === 'unassigned' ? 'primary' : 'secondary'}
                onClick={() => setAgentView('unassigned')}
              >
                Unassigned ({unassignedTickets.length})
              </Button>
            </div>
          )}
          <div className="filters-row" style={{ marginBottom: '1rem' }}>
            <div className="filter-input">
              <Search size={20} />
              <Input
                placeholder="Search by subject or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', padding: '0.5rem' }}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'OPEN', label: 'Open' },
                { value: 'AI_IN_PROGRESS', label: 'AI In Progress' },
                { value: 'ESCALATED', label: 'Escalated' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>

          <div className="tickets-list tickets-list--compact">
            {filteredActiveTickets.map((ticket) => (
              <Card
                key={ticket.id}
                hoverable
                onClick={() => {
                  if (isAdmin) return;
                  setSelectedTicketId(ticket.id);
                }}
                className={`ticket-card ${selectedTicketId === ticket.id ? 'ticket-card--active' : ''}`}
              >
                <div className="ticket-content">
                  <div className="ticket-main">
                    <h3 className="ticket-title">{ticket.subject}</h3>
                    <p className="ticket-customer">{ticket.customer?.name || 'Unknown Customer'}</p>
                    <div className="ticket-meta">
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{ticket.messages?.length || 0} messages</span>
                    </div>
                  </div>
                  <div className="ticket-side">
                    <div className="ticket-badges">
                      <Badge variant={statusColors[ticket.status] as any}>
                        {statusLabelMap[ticket.status] || ticket.status}
                      </Badge>
                      <Badge variant={priorityColors[ticket.priority] as any}>{ticket.priority}</Badge>
                    </div>
                    <ChevronRight size={20} className="ticket-arrow" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="tickets-pane tickets-pane--chat">
          {isAdmin ? (
            <div className="empty-state">
              <MessageSquare size={48} />
              <p>Admin view is read-only. Chat is disabled.</p>
            </div>
          ) : !selectedTicketId ? (
            <div className="empty-state">
              <MessageSquare size={48} />
            </div>
          ) : selectedTicketQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="chat-panel">
              <div className="chat-header">
                <div>
                  <h3 style={{ margin: 0 }}>{selectedTicket?.subject}</h3>
                  <div className="ticket-meta" style={{ marginTop: '0.35rem' }}>
                    <span>{selectedTicket?.customer?.name || 'Unknown Customer'}</span>
                    <span>•</span>
                    <span>{selectedTicket?.id}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {canManageTicket && selectedTicket && (
                    <>
                      <Button variant="secondary" onClick={handleOpenEditModal}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={handleDeleteTicket} disabled={deleteTicketMutation.isPending}>
                        {deleteTicketMutation.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </>
                  )}
                  {currentAiMode && (
                    <Badge variant={aiModeVariantMap[currentAiMode] as any}>
                      {aiModeLabelMap[currentAiMode]}
                    </Badge>
                  )}
                  {canUpdateStatus && selectedTicket && (
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                      style={{
                        padding: '0.35rem 0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  )}
                  <Badge variant={statusColors[selectedTicket?.status || 'OPEN'] as any}>
                    {statusLabelMap[selectedTicket?.status || 'OPEN'] || selectedTicket?.status || 'OPEN'}
                  </Badge>
                </div>
              </div>

              <div className="chat-messages">
                {(selectedTicket?.messages || []).map((msg) => (
                  <div key={msg.id} className={`chat-bubble chat-bubble--${msg.role.toLowerCase()}`}>
                    <div className="chat-bubble-role">{msg.role}</div>
                    <div>{msg.content}</div>
                    <div className="chat-bubble-time">{new Date(msg.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                {realtime.typingIndicator?.ticketId === selectedTicketId && realtime.typingIndicator?.isTyping && (
                  <div className="chat-typing">{realtime.typingIndicator?.actor || 'Someone'} is typing...</div>
                )}
              </div>

              {!isAdmin && (
                <div className="chat-composer">
                  <TextArea
                    label="Reply"
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={addMessageMutation.isPending}
                  />
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '-0.25rem' }}>
                    AI auto-reply is triggered for customer messages. Agent/Admin messages are human replies only.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handleSendMessage}
                      disabled={addMessageMutation.isPending || !messageText.trim()}
                    >
                      {addMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Ticket"
        actions={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTicket} disabled={updateTicketMutation.isPending || !editFormData.subject.trim()}>
              {updateTicketMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Subject *"
            value={editFormData.subject}
            onChange={(e) => setEditFormData((prev) => ({ ...prev, subject: e.target.value }))}
          />
          <TextArea
            label="Description"
            value={editFormData.description}
            onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Select
            label="Priority"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
            value={editFormData.priority}
            onChange={(e) => setEditFormData((prev) => ({ ...prev, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Ticket"
        actions={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={createTicketMutation.isPending}>
              {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {user?.role === 'CUSTOMER' ? (
            <Input label="Customer" value={user?.email || ''} disabled placeholder="Your account" />
          ) : (
            <Select
              label="Customer *"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              value={createFormData.customerId}
              onChange={(e) => setCreateFormData({ ...createFormData, customerId: e.target.value })}
            />
          )}
          <Input
            label="Subject *"
            placeholder="Brief description of the issue"
            value={createFormData.subject}
            onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
          />
          <TextArea
            label="Description"
            placeholder="Detailed description..."
            value={createFormData.description}
            onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
          />
          <Select
            label="Priority"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
            value={createFormData.priority}
            onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value as any })}
          />
        </div>
      </Modal>
    </div>
  );
}

