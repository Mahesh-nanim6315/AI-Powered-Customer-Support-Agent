import { Alert, Card } from "../components";
import { FileText, Info } from "lucide-react";
import "../page.css";

const missingLogCapabilities = [
  "No mounted backend route currently serves system logs.",
  "The previous screen showed mock data, not live operational events.",
  "Export and filtering should only return persisted logs from the backend once an audit/logging pipeline exists.",
];

export function LogsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">Operational logging and audit visibility are not wired into the current app yet</p>
        </div>
      </div>

      <Alert type="warning" title="Logs Backend Not Live">
        This screen no longer shows mock events. The backend currently mounts no admin log endpoint, so live logs cannot be displayed yet.
      </Alert>

      <Card className="empty-card">
        <div className="empty-state">
          <FileText size={48} />
          <p>No live system logs available</p>
          <p className="text-muted">This page is blocked until log ingestion, storage, and admin retrieval endpoints are implemented.</p>
        </div>
      </Card>

      <Card className="dashboard-section">
        <h2 className="section-title">Missing Capabilities</h2>
        <div className="ticket-list">
          {missingLogCapabilities.map((item) => (
            <div key={item} className="ticket-item">
              <div className="ticket-info">
                <div className="ticket-subject">{item}</div>
              </div>
              <div className="metric-icon metric-icon--orange">
                <Info size={18} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="dashboard-section">
        <h2 className="section-title">Recommended Next API</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Read logs</span>
            <span className="stat-value" style={{ fontSize: "1rem" }}>
              GET /admin/logs
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filter logs</span>
            <span className="stat-value" style={{ fontSize: "1rem" }}>
              level, source, date range
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Export logs</span>
            <span className="stat-value" style={{ fontSize: "1rem" }}>
              CSV from persisted data
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Audit logs</span>
            <span className="stat-value" style={{ fontSize: "1rem" }}>
              actor, action, entity
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
