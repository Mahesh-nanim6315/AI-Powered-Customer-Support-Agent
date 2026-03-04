import { useState, useEffect } from 'react';
import { useCustomers, useCreateCustomer } from '../hooks/useCustomers';
import { useRealtime } from '../context/RealtimeContext';
import { Card, Button, Input, Spinner, Modal, Alert } from '../components';
import { Plus, Search } from 'lucide-react';
import '../page.css';

export function CustomersPage() {
  const customersQuery = useCustomers();
  const createMutation = useCreateCustomer();
  const realtime = useRealtime();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showLiveNotification, setShowLiveNotification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  // Auto-refresh when real-time events occur
  useEffect(() => {
    if (realtime.ticketCreated.customerId || realtime.ticketUpdated.id) {
      const timer = setTimeout(() => {
        customersQuery.refetch();
        setShowLiveNotification(true);
        setTimeout(() => setShowLiveNotification(false), 4000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [realtime.ticketCreated, realtime.ticketUpdated, customersQuery]);

  const customers = customersQuery.data || [];
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.name || !formData.email) {
      alert('Please fill in all fields');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
      });
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '' });
    } catch (error) {
      console.error('Failed to create customer:', error);
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
          <p className="page-subtitle">Manage your customer database</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          Add Customer
        </Button>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} style={{ animation: 'pulse 1s infinite' }} />
            Customer list updated from live events
          </div>
        </Alert>
      )}

      <Card className="search-filters">
        <div className="filter-input">
          <Search size={20} />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', padding: '0.5rem' }}
          />
        </div>
      </Card>

      {filteredCustomers.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <p>No customers found</p>
          </div>
        </Card>
      ) : (
        <div className="tickets-list">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} hoverable className="ticket-card">
              <div className="ticket-content">
                <div className="ticket-main">
                  <h3 className="ticket-title">{customer.name}</h3>
                  <p className="ticket-customer">{customer.email}</p>
                  <div className="ticket-meta">
                    <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ticket-side">
                  <div className="ticket-agent">
                    {customer.tickets?.length || 0} tickets
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
    </div>
  );
}

