import { useState, useEffect, useRef } from 'react';
import { useTickets, useUnassignedTickets, useCreateTicket, useUpdateTicketStatus, useTicket, useAddMessage, useUpdateTicket, useDeleteTicket, useReopenTicket } from '../hooks/useTickets';
import { useCustomers } from '../hooks/useCustomers';
import { useMarkMessagesRead, useTicketUnreadCount } from '../hooks/useReadReceipts';
import { useUploadAttachments } from '../hooks/useAttachments';
import { useTicketAssignmentHistory } from '../hooks/useTicketAssignments';
import { useTicketActivity } from '../hooks/useTicketActivity';
import { useRealtime } from '../context/RealtimeContext';
import { useEmitSocket } from '../hooks/useSocket';
import { Card, Button, Input, Select, Badge, Spinner, Modal, TextArea, Alert } from '../components';
import { ChevronRight, Plus, Zap, Search, MessageSquare, ArrowLeft } from 'lucide-react';
import type { TicketStatus, AuthUser, FileAttachment } from '../types';
import '../page.css';
import { attachmentService } from '../services/attachment.service';
import { useSearchParams } from 'react-router-dom';

interface TicketsPageProps {
  user?: AuthUser | null;
}

export function TicketsPage({ user }: TicketsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketsQuery = useTickets();
  const customersQuery = useCustomers(user?.role !== 'CUSTOMER');
  const isAgent = user?.role === 'AGENT';
  const unassignedTicketsQuery = useUnassignedTickets(Boolean(isAgent));
  const createTicketMutation = useCreateTicket();
  const updateStatusMutation = useUpdateTicketStatus();
  const reopenTicketMutation = useReopenTicket();
  const updateTicketMutation = useUpdateTicket();
  const deleteTicketMutation = useDeleteTicket();
  const addMessageMutation = useAddMessage();
  const markMessagesReadMutation = useMarkMessagesRead();
  const uploadAttachmentsMutation = useUploadAttachments();
  const realtime = useRealtime();
  const emitSocket = useEmitSocket(user?.token || null);
  const lastReadBatchRef = useRef('');
  const joinedTicketRef = useRef<string | null>(null);

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsByMessage, setAttachmentsByMessage] = useState<Record<string, FileAttachment[]>>({});
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
  const unreadCountQuery = useTicketUnreadCount(selectedTicketId || '', Boolean(selectedTicketId && !isAdmin));
  const assignmentHistoryQuery = useTicketAssignmentHistory(selectedTicketId || '', Boolean(selectedTicketId));
  const activityQuery = useTicketActivity(selectedTicketId || '', Boolean(selectedTicketId));
  const activeTickets = isAgent && agentView === 'unassigned' ? unassignedTickets : tickets;
  const showMobileThread = Boolean(selectedTicketId && !isAdmin);

  useEffect(() => {
    if (user?.role === 'CUSTOMER' && user?.id && !createFormData.customerId) {
      setCreateFormData((prev) => ({ ...prev, customerId: user.id }));
    }
  }, [user?.role, user?.id]);

  useEffect(() => {
    const ticketIdFromUrl = searchParams.get('ticketId');
    if (!ticketIdFromUrl || selectedTicketId === ticketIdFromUrl) {
      return;
    }

    const existsInCurrentList = [...tickets, ...unassignedTickets].some((ticket) => ticket.id === ticketIdFromUrl);
    if (existsInCurrentList) {
      setSelectedTicketId(ticketIdFromUrl);
    }
  }, [searchParams, selectedTicketId, tickets, unassignedTickets]);

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
    if (!selectedTicketId) {
      if (joinedTicketRef.current) {
        emitSocket('leave-ticket', joinedTicketRef.current);
        joinedTicketRef.current = null;
      }
      return;
    }

    if (joinedTicketRef.current && joinedTicketRef.current !== selectedTicketId) {
      emitSocket('leave-ticket', joinedTicketRef.current);
    }

    emitSocket('join-ticket', selectedTicketId);
    joinedTicketRef.current = selectedTicketId;

    return () => {
      if (joinedTicketRef.current === selectedTicketId) {
        emitSocket('leave-ticket', selectedTicketId);
        joinedTicketRef.current = null;
      }
    };
  }, [selectedTicketId, emitSocket]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (realtime.messageAdded.ticketId === selectedTicketId) {
      selectedTicketQuery.refetch();
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
      unreadCountQuery.refetch();
      activityQuery.refetch();
    }
  }, [selectedTicketId, realtime.messageAdded, selectedTicketQuery, ticketsQuery, unassignedTicketsQuery, isAgent, unreadCountQuery, activityQuery]);

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

  useEffect(() => {
    if (isAdmin || !selectedTicket?.messages?.length) {
      return;
    }

    const messageIds = (selectedTicket.messages || [])
      .filter((message) => message.senderId !== user?.id)
      .map((message) => message.id);

    if (messageIds.length === 0) {
      return;
    }

    const batchKey = `${selectedTicket.id}:${messageIds.join(',')}`;
    if (lastReadBatchRef.current === batchKey) {
      return;
    }
    lastReadBatchRef.current = batchKey;

    markMessagesReadMutation.mutate(messageIds, {
      onSuccess: () => {
        unreadCountQuery.refetch();
      },
    });
  }, [selectedTicket?.id, selectedTicket?.updatedAt, isAdmin, user?.id]);

  useEffect(() => {
    if (!selectedTicket?.messages?.length) {
      setAttachmentsByMessage({});
      return;
    }

    let cancelled = false;

    const loadAttachments = async () => {
      const entries = await Promise.all(
        (selectedTicket.messages || []).map(async (message) => {
          try {
            const result = await attachmentService.getMessageAttachments(message.id);
            return [message.id, result.attachments] as const;
          } catch {
            return [message.id, []] as const;
          }
        })
      );

      if (!cancelled) {
        setAttachmentsByMessage(Object.fromEntries(entries));
      }
    };

    loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [selectedTicket?.id, selectedTicket?.updatedAt]);

  const filteredActiveTickets = activeTickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const canUpdateStatus = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const canEditOrDeleteTicket = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const canReopenTicket = user?.role === 'CUSTOMER' && ['RESOLVED', 'CLOSED'].includes(selectedTicket?.status || '');
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
      if (selectedTicketId === ticketId) assignmentHistoryQuery.refetch();
      if (selectedTicketId === ticketId) activityQuery.refetch();
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    try {
      await reopenTicketMutation.mutateAsync({ id: ticketId });
      ticketsQuery.refetch();
      if (isAgent) unassignedTicketsQuery.refetch();
      if (selectedTicketId === ticketId) selectedTicketQuery.refetch();
      if (selectedTicketId === ticketId) assignmentHistoryQuery.refetch();
      if (selectedTicketId === ticketId) activityQuery.refetch();
    } catch (error) {
      console.error('Failed to reopen ticket:', error);
    }
  };

  const handleDownloadAttachment = async (fileId: string, originalName: string) => {
    try {
      await attachmentService.downloadFile(fileId, originalName);
    } catch (error) {
      console.error('Failed to download attachment:', error);
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
      if (pendingFiles.length > 0) {
        await uploadAttachmentsMutation.mutateAsync({
          messageId: response.userMessage.id,
          files: pendingFiles,
        });
        setPendingFiles([]);
      }
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

  const handleMobileBackToList = () => {
    setSelectedTicketId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ticketId');
      return next;
    });
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

  const getLatestMessage = (ticket: typeof filteredActiveTickets[number]) => {
    const messages = ticket.messages || [];
    if (messages.length === 0) {
      return null;
    }

    return [...messages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };

  const getTicketListSummary = (ticket: typeof filteredActiveTickets[number]) => {
    const latestMessage = getLatestMessage(ticket);

    if (!latestMessage) {
      return {
        preview: ticket.description || 'No messages yet',
        helper: 'Awaiting first response',
        helperVariant: 'secondary' as const,
      };
    }

    const preview =
      latestMessage.content.length > 72
        ? `${latestMessage.content.slice(0, 72)}...`
        : latestMessage.content;

    if (user?.role === 'CUSTOMER') {
      if (latestMessage.role === 'CUSTOMER') {
        return {
          preview,
          helper: 'Awaiting support',
          helperVariant: 'warning' as const,
        };
      }

      return {
        preview,
        helper: latestMessage.role === 'AI' ? 'New AI reply' : 'New agent reply',
        helperVariant: 'info' as const,
      };
    }

    if (latestMessage.role === 'CUSTOMER') {
      return {
        preview,
        helper: 'Customer replied',
        helperVariant: 'warning' as const,
      };
    }

    return {
      preview,
      helper: latestMessage.role === 'AI' ? 'Last update from AI' : 'Last update from agent',
      helperVariant: 'secondary' as const,
    };
  };

  const selectedTicketLatestMessage = selectedTicket ? getLatestMessage(selectedTicket as any) : null;

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
        <Card className={`tickets-pane tickets-pane--list ${showMobileThread ? 'tickets-pane--list-collapsed' : ''}`}>
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
            {filteredActiveTickets.map((ticket) => {
              const summary = getTicketListSummary(ticket);

              return (
                <Card
                  key={ticket.id}
                  hoverable
                  onClick={() => {
                    if (isAdmin) return;
                    setSelectedTicketId(ticket.id);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('ticketId', ticket.id);
                      return next;
                    });
                  }}
                  className={`ticket-card ${selectedTicketId === ticket.id ? 'ticket-card--active' : ''}`}
                >
                  <div className="ticket-content">
                    <div className="ticket-main">
                      <h3 className="ticket-title">{ticket.subject}</h3>
                      <p className="ticket-customer">{ticket.customer?.name || 'Unknown Customer'}</p>
                      <div className="ticket-meta" style={{ marginBottom: '0.35rem' }}>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{ticket.messages?.length || 0} messages</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                        {summary.preview}
                      </div>
                      <Badge variant={summary.helperVariant as any}>{summary.helper}</Badge>
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
              );
            })}
          </div>
        </Card>

        <Card className={`tickets-pane tickets-pane--chat ${!selectedTicketId && !isAdmin ? 'tickets-pane--chat-empty' : ''}`}>
          {isAdmin ? (
            <div className="empty-state">
              <MessageSquare size={48} />
              <p>Admin view is read-only. Chat is disabled.</p>
            </div>
          ) : !selectedTicketId ? (
            <div className="empty-state ticket-empty-state">
              <MessageSquare size={48} />
              <p>Select a ticket to open the conversation</p>
              <p className="text-muted">
                Review the latest reply state on the left, then open the thread to respond, download files, or change status.
              </p>
            </div>
          ) : selectedTicketQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="chat-panel">
              <div className="chat-header">
                <div className="chat-header-main">
                  {showMobileThread && (
                    <div className="chat-header-back">
                      <Button
                        variant="secondary"
                        onClick={handleMobileBackToList}
                      >
                        <ArrowLeft size={16} />
                        Back to tickets
                      </Button>
                    </div>
                  )}
                  <h3 style={{ margin: 0 }}>{selectedTicket?.subject}</h3>
                  <div className="ticket-meta" style={{ marginTop: '0.35rem' }}>
                    <span>{selectedTicket?.customer?.name || 'Unknown Customer'}</span>
                    <span>•</span>
                    <span>{selectedTicket?.id}</span>
                  </div>
                  <div className="ticket-thread-summary">
                    <span>
                      Last update:{' '}
                      {selectedTicketLatestMessage
                        ? `${selectedTicketLatestMessage.role} • ${new Date(selectedTicketLatestMessage.createdAt).toLocaleString()}`
                        : 'No messages yet'}
                    </span>
                  </div>
                </div>
                <div className="chat-header-actions">
                  {!isAdmin && (
                    <Badge variant={unreadCountQuery.data?.unreadCount ? 'warning' : 'success'}>
                      {unreadCountQuery.data?.unreadCount ? `${unreadCountQuery.data.unreadCount} unread` : 'All read'}
                    </Badge>
                  )}
                  {canEditOrDeleteTicket && selectedTicket && (
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
                  {canReopenTicket && selectedTicket && (
                    <Button
                      variant="secondary"
                      onClick={() => handleReopenTicket(selectedTicket.id)}
                      disabled={reopenTicketMutation.isPending}
                    >
                      {reopenTicketMutation.isPending ? 'Reopening...' : 'Reopen Ticket'}
                    </Button>
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
                {(assignmentHistoryQuery.data?.history || []).length > 0 && (
                  <div className="thread-insight-card">
                    <div className="thread-insight-title">Assignment history</div>
                    {(assignmentHistoryQuery.data?.history || []).slice(0, 3).map((entry) => (
                      <div key={entry.id} className="thread-insight-row">
                        {entry.action} {entry.agentEmail ? `- ${entry.agentEmail}` : ''} - {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
                {(activityQuery.data?.activity || []).length > 0 && (
                  <div className="thread-insight-card">
                    <div className="thread-insight-title">Recent activity</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(activityQuery.data?.activity || []).slice(0, 6).map((entry) => (
                        <div key={entry.id} className="thread-insight-row">
                          <span>
                            <strong>{entry.actor}</strong>: {entry.description}
                          </span>
                          <span>{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedTicket?.messages || []).map((msg) => (
                  <div key={msg.id} className={`chat-bubble chat-bubble--${msg.role.toLowerCase()}`}>
                    <div className="chat-bubble-role">{msg.role}</div>
                    <div>{msg.content}</div>
                    {(attachmentsByMessage[msg.id] || []).length > 0 && (
                      <div className="message-attachments">
                        {attachmentsByMessage[msg.id]?.map((attachment) => (
                          <div key={attachment.id} className="attachment-chip">
                            <div className="attachment-chip__meta">
                              <span className="attachment-chip__name">{attachment.originalName}</span>
                              <span>{Math.max(1, Math.round(attachment.size / 1024))} KB</span>
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                            >
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
                    disabled={addMessageMutation.isPending || uploadAttachmentsMutation.isPending}
                  />
                  <input
                    type="file"
                    multiple
                    className="ticket-file-input"
                    onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
                    disabled={addMessageMutation.isPending || uploadAttachmentsMutation.isPending}
                  />
                  {pendingFiles.length > 0 && (
                    <div className="pending-file-list">
                      {pendingFiles.map((file) => (
                        <span key={`${file.name}-${file.size}`} className="pending-file-chip">{file.name}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '-0.25rem' }}>
                    AI auto-reply is triggered for customer messages. Agent/Admin messages are human replies only.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handleSendMessage}
                      disabled={(addMessageMutation.isPending || uploadAttachmentsMutation.isPending) || (!messageText.trim() && pendingFiles.length === 0)}
                    >
                      {(addMessageMutation.isPending || uploadAttachmentsMutation.isPending) ? 'Sending...' : 'Send Message'}
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

