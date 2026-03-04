import "../page.css";
import type { Agent } from "../types";

const dummyAgents: Agent[] = [
  {
    id: "AG-1",
    email: "agent1@example.com",
    role: "AGENT",
    activeTickets: 3,
    specialization: "Billing",
  },
  {
    id: "AG-2",
    email: "agent2@example.com",
    role: "AGENT",
    activeTickets: 1,
    specialization: "Technical",
  },
];

export function AgentsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">
            Manage support agents and balance workloads across the team.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" type="button">
            Add agent
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Active tickets</th>
              <th>Specialization</th>
            </tr>
          </thead>
          <tbody>
            {dummyAgents.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.email}</td>
                <td>{agent.role}</td>
                <td>{agent.activeTickets}</td>
                <td>{agent.specialization ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

