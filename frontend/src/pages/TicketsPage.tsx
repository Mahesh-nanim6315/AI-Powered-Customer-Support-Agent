import { useEffect, useState } from "react";
import "../page.css";
import type { Ticket } from "../types";
import { fetchTickets } from "../api";

interface TicketsPageProps {
  token: string;
}

const dummyTickets: Ticket[] = [
  {
    id: "TCK-101",
    subject: "Refund for double charge",
    status: "OPEN",
    priority: "HIGH",
    customerName: "Alice Johnson",
    createdAt: "2026-03-03T10:12:00Z",
    updatedAt: "2026-03-03T11:45:00Z",
    assignedAgent: "John Doe",
  },
  {
    id: "TCK-102",
    subject: "Order not received",
    status: "PENDING",
    priority: "MEDIUM",
    customerName: "Bob Smith",
    createdAt: "2026-03-02T09:00:00Z",
    updatedAt: "2026-03-02T12:30:00Z",
    assignedAgent: "Jane Miller",
  },
  {
    id: "TCK-103",
    subject: "Cannot reset password",
    status: "RESOLVED",
    priority: "LOW",
    customerName: "Charlie Brown",
    createdAt: "2026-03-01T14:22:00Z",
    updatedAt: "2026-03-01T16:00:00Z",
  },
];

export function TicketsPage({ token }: TicketsPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const apiTickets = await fetchTickets(token);
        if (!cancelled) {
          setTickets(apiTickets);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            "Could not load tickets from the API. Showing demo data instead.",
          );
          setTickets(dummyTickets);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">
            View and manage customer conversations across all channels.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" type="button">
            New ticket
          </button>
        </div>
      </div>

      <div className="card">
        {loading && <div className="table-status">Loading tickets…</div>}
        {!loading && error && <div className="table-error">{error}</div>}
        {!loading && !error && tickets.length === 0 && (
          <div className="table-status">No tickets yet.</div>
        )}

        {tickets.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.customerName}</td>
                  <td>
                    <span
                      className={`badge badge-status-${ticket.status.toLowerCase()}`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-priority-${ticket.priority.toLowerCase()}`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td>{ticket.assignedAgent ?? "Unassigned"}</td>
                  <td>{new Date(ticket.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

