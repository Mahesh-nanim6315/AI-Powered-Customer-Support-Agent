import { useEffect, useMemo, useState } from 'react';
import { useCustomers, useCreateCustomer } from '../hooks/useCustomers';
import { useRealtime } from '../context/RealtimeContext';
import { Alert, Badge, Button, Card, Input, Modal, Select, Spinner } from '../components';
import { CircleAlert, FolderHeart, Plus, Search, Users } from 'lucide-react';
import type { Customer, Ticket } from '../types';
import '../page.css';

type CustomerIssueFilter = 'all' | 'open' | 'healthy' | 'pending';

function getTickets(customer: Customer) {
  return customer.tickets || [];
}

function getOpenTickets(customer: Customer) {
  return getTickets(customer).filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status));
}

function getResolvedTickets(customer: Customer) {
  return getTickets(customer).filter((ticket) => ['RESOLVED', 'CLOSED'].includes(ticket.status));
}

function getLatestTicket(customer: Customer): Ticket | undefined {
  return [...getTickets(customer)].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )[0];
}

function getHealthState(customer: Customer) {
  if (customer.status === 'PENDING') {
    return { label: 'Pending', variant: 'warning' as const };
  }

  if (getOpenTickets(customer).length > 0) {
    return { label: 'Needs attention', variant: 'danger' as const };
  }

  return { label: 'Healthy', variant: 'success' as const };
}

export function CustomersPage() {
  const customersQuery = useCustomers();
  const createMutation = useCreateCustomer();
  const realtime = useRealtime();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'PENDING'>('all');
  const [issueFilter, setIssueFilter] = useState<CustomerIssueFilter>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showLiveNotification, setShowLiveNotification] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (realtime.ticketCreated.customerId || realtime.ticketUpdated.id) {
      const timer = setTimeout(() => {
        customersQuery.refetch();
        setShowLiveNotification(true);
        setTimeout(() => setShowLiveNotification(false), 4000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [customersQuery, realtime.ticketCreated, realtime.ticketUpdated]);

  const customers = customersQuery.data || [];

  const summary = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter((customer) => customer.status === 'ACTIVE').length,
      pending: customers.filter((customer) => customer.status === 'PENDING').length,
      openIssues: customers.filter((customer) => getOpenTickets(customer).length > 0).length,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const latestTicket = getLatestTicket(customer);
      const health = getHealthState(customer);

      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        latestTicket?.subject?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      const matchesIssue =
        issueFilter === 'all' ||
        (issueFilter === 'open' && health.label === 'Needs attention') ||
        (issueFilter === 'healthy' && health.label === 'Healthy') ||
        (issueFilter === 'pending' && health.label === 'Pending');

      return matchesSearch && matchesStatus && matchesIssue;
    });
  }, [customers, issueFilter, searchQuery, statusFilter]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setCreateError('Please fill in both name and email.');
      return;
    }

    try {
      setCreateError(null);
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim(),
      });
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '' });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to create customer';
      setCreateError(message);
    }
  };

  if (customersQuery.isLoading) {
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
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            Customer health, support activity, and issue pressure across your workspace.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          Add Customer
        </Button>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          Customer health and recent issue activity were refreshed from live ticket changes.
        </Alert>
      )}

      <div className="ops-summary-grid">
        <Card className="ops-summary-card">
          <div className="ops-summary-card__label">Total customers</div>
          <div className="ops-summary-card__value">{summary.total}</div>
          <div className="ops-summary-card__detail">Customer records in this workspace</div>
        </Card>
        <Card className="ops-summary-card">
          <div className="ops-summary-card__label">Active customers</div>
          <div className="ops-summary-card__value">{summary.active}</div>
          <div className="ops-summary-card__detail">Ready to engage with support</div>
        </Card>
        <Card className="ops-summary-card">
          <div className="ops-summary-card__label">Pending invites</div>
          <div className="ops-summary-card__value">{summary.pending}</div>
          <div className="ops-summary-card__detail">Need activation or onboarding follow-up</div>
        </Card>
        <Card className="ops-summary-card">
          <div className="ops-summary-card__label">Open issues</div>
          <div className="ops-summary-card__value">{summary.openIssues}</div>
          <div className="ops-summary-card__detail">Customers with unresolved ticket activity</div>
        </Card>
      </div>

      <Card className="search-filters">
        <div className="management-toolbar">
          <div className="filter-input">
            <Search size={20} />
            <Input
              placeholder="Search by name, email, or latest ticket"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', padding: '0.5rem' }}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ACTIVE' | 'PENDING')}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PENDING', label: 'Pending' },
            ]}
          />
          <Select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value as CustomerIssueFilter)}
            options={[
              { value: 'all', label: 'All health states' },
              { value: 'open', label: 'Needs attention' },
              { value: 'healthy', label: 'Healthy' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </div>
      </Card>

      {filteredCustomers.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <Users size={36} />
            <p>No customers match this view</p>
            <p className="text-muted">Try broader filters or add a new customer record.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="management-table-card management-table-card--desktop">
            <div className="management-table-wrap">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Health</th>
                    <th>Open Tickets</th>
                    <th>Resolved</th>
                    <th>Latest Ticket</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => {
                    const openTickets = getOpenTickets(customer);
                    const resolvedTickets = getResolvedTickets(customer);
                    const latestTicket = getLatestTicket(customer);
                    const health = getHealthState(customer);

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="management-identity">
                            <div className="management-identity__avatar">
                              {(customer.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="management-identity__content">
                              <div className="management-identity__title">{customer.name}</div>
                              <div className="management-identity__subtitle">{customer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'warning'}>
                            {customer.status}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={health.variant}>{health.label}</Badge>
                        </td>
                        <td><span className="management-number">{openTickets.length}</span></td>
                        <td><span className="management-number">{resolvedTickets.length}</span></td>
                        <td>
                          <span className="management-muted">
                            {latestTicket ? latestTicket.subject : 'No tickets yet'}
                          </span>
                        </td>
                        <td>
                          <span className="management-muted">
                            {latestTicket
                              ? new Date(latestTicket.updatedAt).toLocaleString()
                              : new Date(customer.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <div className="management-row-actions">
                            <Button size="sm" variant="secondary" onClick={() => setSelectedCustomer(customer)}>
                              View details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="management-grid management-grid--mobile">
            {filteredCustomers.map((customer) => {
              const openTickets = getOpenTickets(customer);
              const resolvedTickets = getResolvedTickets(customer);
              const latestTicket = getLatestTicket(customer);
              const health = getHealthState(customer);

              return (
                <Card key={customer.id} className="management-card">
                  <div className="management-card__header">
                    <div className="management-card__title-block">
                      <h3 className="management-card__title">{customer.name}</h3>
                      <div className="management-card__meta">
                        <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {customer.status}
                        </Badge>
                        <Badge variant={health.variant}>{health.label}</Badge>
                      </div>
                      <p className="management-card__subtext">{customer.email}</p>
                    </div>
                  </div>

                  <div className="management-card__details">
                    <div className="management-detail-row">
                      <span className="management-detail-label">Open tickets</span>
                      <span className="management-detail-value management-detail-value--warning">
                        {openTickets.length}
                      </span>
                    </div>
                    <div className="management-detail-row">
                      <span className="management-detail-label">Resolved tickets</span>
                      <span className="management-detail-value">{resolvedTickets.length}</span>
                    </div>
                    <div className="management-detail-row">
                      <span className="management-detail-label">Latest ticket</span>
                      <span className="management-detail-value">
                        {latestTicket ? latestTicket.subject : 'No tickets yet'}
                      </span>
                    </div>
                  </div>

                  <div className="management-card__actions">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedCustomer(customer)}>
                      View details
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Customer"
        actions={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add Customer'}
            </Button>
          </div>
        }
      >
        {createError && (
          <Alert type="error" title="Customer Create Failed" onClose={() => setCreateError(null)}>
            {createError}
          </Alert>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            placeholder="Full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="customer@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer ? `${selectedCustomer.name} details` : 'Customer details'}
      >
        {selectedCustomer && (
          <div className="customer-detail-stack">
            <div className="suggestion-context-grid">
              <div className="suggestion-context-card">
                <div className="suggestion-context-label">Email</div>
                <div className="suggestion-context-value">{selectedCustomer.email}</div>
              </div>
              <div className="suggestion-context-card">
                <div className="suggestion-context-label">Status</div>
                <div className="suggestion-context-value">{selectedCustomer.status}</div>
              </div>
              <div className="suggestion-context-card">
                <div className="suggestion-context-label">Open tickets</div>
                <div className="suggestion-context-value">{getOpenTickets(selectedCustomer).length}</div>
              </div>
              <div className="suggestion-context-card">
                <div className="suggestion-context-label">Resolved tickets</div>
                <div className="suggestion-context-value">
                  {getResolvedTickets(selectedCustomer).length}
                </div>
              </div>
            </div>

            <div className="thread-insight-card">
              <div className="thread-insight-title">Recent ticket activity</div>
              {getTickets(selectedCustomer).length === 0 ? (
                <div className="management-footnote">No ticket history yet.</div>
              ) : (
                <div className="customer-detail-ticket-list">
                  {[...getTickets(selectedCustomer)]
                    .sort(
                      (left, right) =>
                        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
                    )
                    .slice(0, 5)
                    .map((ticket) => (
                      <div key={ticket.id} className="customer-detail-ticket">
                        <div className="customer-detail-ticket__main">
                          <div className="customer-detail-ticket__title">{ticket.subject}</div>
                          <div className="customer-detail-ticket__meta">
                            <span>{ticket.priority}</span>
                            <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            ['RESOLVED', 'CLOSED'].includes(ticket.status) ? 'success' : 'warning'
                          }
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="thread-insight-card">
              <div className="thread-insight-title">Health summary</div>
              <div className="customer-health-note">
                {selectedCustomer.status === 'PENDING' ? (
                  <>
                    <CircleAlert size={16} />
                    This customer is still pending activation and may need onboarding follow-up.
                  </>
                ) : getOpenTickets(selectedCustomer).length > 0 ? (
                  <>
                    <FolderHeart size={16} />
                    This customer has unresolved issues that still need active support attention.
                  </>
                ) : (
                  <>
                    <FolderHeart size={16} />
                    This customer currently looks healthy with no unresolved support issues.
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
