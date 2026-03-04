import "../page.css";
import type { Customer } from "../types";

const dummyCustomers: Customer[] = [
  {
    id: "CUST-1",
    name: "Alice Johnson",
    email: "alice@example.com",
    createdAt: "2025-12-01T09:00:00Z",
    totalTickets: 12,
    lastSeenAt: "2026-03-03T11:00:00Z",
  },
  {
    id: "CUST-2",
    name: "Bob Smith",
    email: "bob@example.com",
    createdAt: "2026-01-10T10:30:00Z",
    totalTickets: 4,
    lastSeenAt: "2026-03-02T15:30:00Z",
  },
];

export function CustomersPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            Single view of every customer and their history.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" type="button">
            Add customer
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Created</th>
              <th>Total tickets</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {dummyCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                <td>{customer.totalTickets}</td>
                <td>
                  {customer.lastSeenAt
                    ? new Date(customer.lastSeenAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

