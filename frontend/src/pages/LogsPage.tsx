import { useState } from 'react';
import { Card } from '../components';
import { FileText, Search, Filter, Download, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import '../page.css';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  source: string;
  details?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    level: 'INFO',
    message: 'AI model initialized successfully',
    source: 'AI Service',
    details: 'Model version: gpt-4, Temperature: 0.7'
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:32:15Z',
    level: 'SUCCESS',
    message: 'Ticket #12345 resolved by AI',
    source: 'Ticket System',
    details: 'Resolution time: 2.5 minutes, Customer satisfaction: 5/5'
  },
  {
    id: '3',
    timestamp: '2024-01-15T10:35:22Z',
    level: 'WARNING',
    message: 'High ticket volume detected',
    source: 'Monitoring',
    details: 'Current queue: 15 tickets, Average wait time: 8 minutes'
  },
  {
    id: '4',
    timestamp: '2024-01-15T10:38:45Z',
    level: 'ERROR',
    message: 'Failed to process ticket attachment',
    source: 'File Processor',
    details: 'File size exceeds limit (25MB), Ticket ID: #12346'
  },
  {
    id: '5',
    timestamp: '2024-01-15T10:40:12Z',
    level: 'INFO',
    message: 'Agent performance metrics updated',
    source: 'Analytics',
    details: '5 agents active, 12 tickets resolved in last hour'
  },
];

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'INFO':
        return <Info size={16} className="text-blue-500" />;
      case 'SUCCESS':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'WARNING':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'ERROR':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Info size={16} className="text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Source', 'Message', 'Details'],
      ...filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.source,
        log.message,
        log.details || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">
            Monitor and troubleshoot your support system
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn btn--secondary" onClick={exportLogs}>
            <Download size={16} />
            Export Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="filter-card">
        <div className="filter-grid">
          <div className="filter-group">
            <div className="filter-icon">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search logs..."
              className="filter-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <div className="filter-icon">
              <Filter size={16} />
            </div>
            <select
              className="filter-select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">Info</option>
              <option value="SUCCESS">Success</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs List */}
      <Card className="logs-card">
        <div className="logs-header">
          <h2 className="logs-title">System Activity</h2>
          <span className="logs-count">{filteredLogs.length} entries</span>
        </div>
        
        <div className="logs-list">
          {filteredLogs.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="text-gray-400" />
              <p>No logs found matching your criteria</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`log-entry ${expandedLog === log.id ? 'expanded' : ''}`}
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="log-main">
                  <div className="log-level">
                    {getLevelIcon(log.level)}
                    <span className={`log-level-badge ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                  
                  <div className="log-content">
                    <div className="log-message">{log.message}</div>
                    <div className="log-meta">
                      <span className="log-source">{log.source}</span>
                      <span className="log-timestamp">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {log.details && expandedLog === log.id && (
                  <div className="log-details">
                    <div className="log-details-content">
                      <strong>Details:</strong> {log.details}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
