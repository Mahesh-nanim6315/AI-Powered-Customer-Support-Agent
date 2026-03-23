import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, Select, Spinner } from "../components";
import { AlertTriangle, FileText, Info, ShieldAlert } from "lucide-react";
import { logsService } from "../services/logs.service";
import type { LogEntry } from "../types";
import "../page.css";
import "../dashboard.css";

const levelIconMap = {
  info: Info,
  warn: AlertTriangle,
  error: ShieldAlert,
};

const levelVariantMap = {
  info: "info",
  warn: "warning",
  error: "danger",
} as const;

export function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const loadLogs = async (
    nextLevel = levelFilter,
    nextSource = sourceFilter,
    nextStartDate = startDate,
    nextEndDate = endDate
  ) => {
    try {
      setError(null);
      const filters: { limit: number; level?: string; source?: string; startDate?: string; endDate?: string } = { limit: 60 };
      if (nextLevel) {
        filters.level = nextLevel;
      }
      if (nextSource) {
        filters.source = nextSource;
      }
      if (nextStartDate) {
        filters.startDate = nextStartDate;
      }
      if (nextEndDate) {
        filters.endDate = nextEndDate;
      }

      const response = await logsService.list({
        ...filters,
      });
      setEntries(response.entries);
      setAvailableSources(response.availableSources);
    } catch (loadError) {
      console.error("Failed to load logs:", loadError);
      setError("Failed to load system logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    loadLogs(levelFilter, sourceFilter, startDate, endDate);
  }, [levelFilter, sourceFilter, startDate, endDate]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const filters: { limit: number; level?: string; source?: string; startDate?: string; endDate?: string } = { limit: 100 };
      if (levelFilter) filters.level = levelFilter;
      if (sourceFilter) filters.source = sourceFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      await logsService.downloadCsv(filters);
    } catch (exportError) {
      console.error("Failed to export logs:", exportError);
      setError("Failed to export system logs");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
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
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">Live operational events from system activity, customer notifications, AI suggestions, and ticket updates</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => loadLogs()} disabled={isLoading}>
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="dashboard-highlight">
        <div className="dashboard-highlight__label">Log Overview</div>
        <div className="dashboard-highlight__title">
          {entries.length} recent event{entries.length === 1 ? "" : "s"} loaded across {availableSources.length} source{availableSources.length === 1 ? "" : "s"}.
        </div>
        <div className="dashboard-highlight__detail">
          Use filters to narrow by severity or source. When audit tables are present, they are included automatically; otherwise this feed falls back to live operational records.
        </div>
      </Card>

      <Card className="dashboard-section">
        <div className="logs-toolbar">
          <Select
            options={[
              { value: "", label: "All levels" },
              { value: "info", label: "Info" },
              { value: "warn", label: "Warning" },
              { value: "error", label: "Error" },
            ]}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          />
          <Select
            options={[
              { value: "", label: "All sources" },
              ...availableSources.map((source) => ({ value: source, label: source })),
            ]}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </Card>

      {entries.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <FileText size={48} />
            <p>No log events matched the current filters</p>
            <p className="text-muted">Try clearing filters or come back after new system activity occurs.</p>
          </div>
        </Card>
      ) : (
        <div className="suggestions-list">
          {entries.map((entry) => {
            const LevelIcon = levelIconMap[entry.level];

            return (
              <Card key={entry.id} className="suggestion-card">
                <div className="suggestion-header">
                  <div className="suggestion-main">
                    <div className="suggestion-title-row">
                      <h3 className="suggestion-title">{entry.message}</h3>
                      <span className={`metric-icon metric-icon--${entry.level === "error" ? "red" : entry.level === "warn" ? "orange" : "blue"}`}>
                        <LevelIcon size={16} />
                      </span>
                    </div>
                    <div className="suggestion-ticket">
                      <span>{entry.source}</span>
                      {entry.entityType && <span>• {entry.entityType}</span>}
                      {entry.actor && <span>• {entry.actor}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className={`badge badge--${levelVariantMap[entry.level]} badge--sm`}>{entry.level.toUpperCase()}</span>
                    <span className="metric-label">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {entry.details && Object.keys(entry.details).length > 0 && (
                  <div className="suggestion-params">
                    <div className="suggestion-params__title">Event details</div>
                    <pre className="log-details">{JSON.stringify(entry.details, null, 2)}</pre>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
