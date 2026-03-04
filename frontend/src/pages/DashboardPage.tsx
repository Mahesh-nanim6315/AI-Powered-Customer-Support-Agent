import "../dashboard.css";

export function DashboardPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            High-level overview of your AI-powered support operations.
          </p>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card metric-card">
          <div className="metric-label">Open tickets</div>
          <div className="metric-value">42</div>
          <div className="metric-trend positive">+8 today</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">AI resolution rate</div>
          <div className="metric-value">63%</div>
          <div className="metric-trend neutral">Last 7 days</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Avg. first response</div>
          <div className="metric-value">1m 48s</div>
          <div className="metric-trend positive">Improved vs last week</div>
        </div>
      </div>
    </div>
  );
}

