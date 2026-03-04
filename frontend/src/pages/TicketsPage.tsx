import { useState, useEffect } from 'react';
import { useTickets, useCreateTicket, useUpdateTicketStatus } from '../hooks/useTickets';
import { useCustomers } from '../hooks/useCustomers';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Button, Input, Select, Badge, Spinner, Modal, TextArea, Alert } from '../components';
import { ChevronRight, Plus, Zap, Search } from 'lucide-react';
import type { Ticket, CreateTicketRequest, TicketStatus } from '../types';
import '../page.css';

export function TicketsPage() {
  const ticketsQuery = useTickets();
  const customersQuery = useCustomers();
  const createTicketMutation = useCreateTicket();
  const updateStatusMutation = useUpdateTicketStatus();
  const realtime = useRealtime();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showLiveNotification, setShowLiveNotification] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    customerId: '',
    subject: '',
    description: '',
    priority: 'MEDIUM' as const,
  });

  const tickets = ticketsQuery.data || [];
  const customers = customersQuery.data || [];

  // Listen for real-time updates and refresh tickets
  useEffect(() => {
    if (realtime.ticketCreated.id || realtime.ticketUpdated.id) {
      setShowLiveNotification(true);
      ticketsQuery.refetch();
      const timer = setTimeout(() => setShowLiveNotification(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [realtime.ticketCreated, realtime.ticketUpdated, ticketsQuery]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTicket = async () => {
    if (!createFormData.customerId || !createFormData.subject) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createTicketMutation.mutateAsync({
        customerId: createFormData.customerId,
        subject: createFormData.subject,
        description: createFormData.description,
        priority: createFormData.priority,
      });
      setIsCreateModalOpen(false);
      setCreateFormData({
        customerId: '',
        subject: '',
        description: '',
        priority: 'MEDIUM',
      });
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: ticketId,
        status: newStatus,
      });
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  const priorityColors: Record<string, 'danger' | 'warning' | 'success'> = {
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'success',
  };

  const statusColors: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
    OPEN: 'danger',
    WAITING_FOR_HUMAN: 'warning',
    AI_HANDLING: 'info',
    RESOLVED: 'success',
    CLOSED: 'success',
  };

  if (ticketsQuery.isLoading || customersQuery.isLoading) {
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
          <p className="page-subtitle">Manage and track customer issues</p>
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
            Tickets refreshed from live updates
          </div>
        </Alert>
      )}

      {!realtime.isConnected && (
        <Alert type="warning" title="Connection Status">
          Reconnecting to live updates...
        </Alert>
      )}

      <Card className="search-filters">
        <div className="filters-row">
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
              { value: 'AI_HANDLING', label: 'AI Handling' },
              { value: 'WAITING_FOR_HUMAN', label: 'Waiting for Human' },
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
      </Card>

      {filteredTickets.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <MessageSquareOff size={48} />
            <p>No tickets found</p>
            <p className="text-muted">Try adjusting your filters</p>
          </div>
        </Card>
      ) : (
        <div className="tickets-list">
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              hoverable
              onClick={() => setSelectedTicketId(ticket.id)}
              className="ticket-card"
            >
              <div className="ticket-content">
                <div className="ticket-main">
                  <h3 className="ticket-title">{ticket.subject}</h3>
                  <p className="ticket-customer">
                    {ticket.customer?.name || 'Unknown Customer'}
                  </p>
                  <div className="ticket-meta">
                    <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{ticket.messages?.length || 0} messages</span>
                  </div>
                </div>
                <div className="ticket-side">
                  <div className="ticket-badges">
                    <Badge variant={statusColors[ticket.status] as any}>
                      {ticket.status}
                    </Badge>
                    <Badge variant={priorityColors[ticket.priority] as any}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  {ticket.assignedAgent && (
                    <div className="ticket-agent">
                      Assigned to {ticket.assignedAgent.user?.email}
                    </div>
                  )}
                  <ChevronRight size={20} className="ticket-arrow" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Ticket"
        actions={
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
            >
              {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Customer *"
            options={customers.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={createFormData.customerId}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, customerId: e.target.value })
            }
          />
          <Input
            label="Subject *"
            placeholder="Brief description of the issue"
            value={createFormData.subject}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, subject: e.target.value })
            }
          />
          <TextArea
            label="Description"
            placeholder="Detailed description..."
            value={createFormData.description}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, description: e.target.value })
            }
          />
          <Select
            label="Priority"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
            value={createFormData.priority}
            onChange={(e) =>
              setCreateFormData({
                ...createFormData,
                priority: e.target.value as any,
              })
            }
          />
        </div>
      </Modal>
    </div>
  );
}

// Placeholder icon component
function MessageSquareOff({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

