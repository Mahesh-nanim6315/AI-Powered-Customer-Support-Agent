import { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button, Spinner, Alert, Select } from '../components';
import { Check, Clock, Play, Sparkles, Ticket, X } from 'lucide-react';
import type { AiSuggestion, SuggestionStatus } from '../types';
import { aiSuggestionsService } from '../services/ai.service';
import '../page.css';
import '../dashboard.css';

const statusVariants: Record<SuggestionStatus, 'warning' | 'success' | 'danger' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  REJECTED: 'danger',
  EXECUTED: 'success',
};

const actionLabels: Record<string, string> = {
  ESCALATE_TO_HUMAN: 'Escalate to human',
  CHANGE_PRIORITY: 'Change ticket priority',
  UPDATE_TICKET_STATUS: 'Update ticket status',
  SEND_REFUND_LINK: 'Send refund link',
};

function getSuggestionConfidence(params: Record<string, any>) {
  const candidates = [params.confidence, params.confidenceScore, params.score];
  const raw = candidates.find((value) => typeof value === 'number');
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return null;
  }
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function getSuggestionReason(params: Record<string, any>) {
  return params.reason || params.description || params.summary || null;
}

function getSuggestionContext(params: Record<string, any>) {
  const entries = Object.entries(params || {}).filter(([key]) => !['description', 'reason', 'summary', 'confidence', 'confidenceScore', 'score'].includes(key));
  return entries.slice(0, 4);
}

export function AiSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingKey, setIsSubmittingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadSuggestions = async () => {
    try {
      setError(null);
      const data = await aiSuggestionsService.getAll();
      setSuggestions(data);
    } catch (e) {
      console.error('Failed to load suggestions:', e);
      setError('Failed to load AI suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!statusFilter) {
      return suggestions;
    }
    return suggestions.filter((suggestion) => suggestion.status === statusFilter);
  }, [suggestions, statusFilter]);

  const pendingCount = suggestions.filter((suggestion) => suggestion.status === 'PENDING').length;
  const executedCount = suggestions.filter((suggestion) => suggestion.status === 'EXECUTED').length;

  const handleApprove = async (id: string, execute: boolean) => {
    try {
      setIsSubmittingKey(`${id}:${execute ? 'execute' : 'approve'}`);
      await aiSuggestionsService.approve(id, { execute });
      await loadSuggestions();
    } catch (e) {
      console.error('Approve failed:', e);
      setError(execute ? 'Failed to approve and execute suggestion' : 'Failed to approve suggestion');
    } finally {
      setIsSubmittingKey(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setIsSubmittingKey(`${id}:reject`);
      await aiSuggestionsService.reject(id);
      await loadSuggestions();
    } catch (e) {
      console.error('Reject failed:', e);
      setError('Failed to reject suggestion');
    } finally {
      setIsSubmittingKey(null);
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
          <h1 className="page-title">AI Suggestions</h1>
          <p className="page-subtitle">
            Review AI-generated actions with ticket context, confidence, and decision history
          </p>
        </div>
        <div className="analytics-toolbar">
          <Select
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'EXECUTED', label: 'Executed' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      <Card className="dashboard-highlight">
        <div className="dashboard-highlight__label">Suggestion Queue</div>
        <div className="dashboard-highlight__title">
          {pendingCount} pending suggestion{pendingCount === 1 ? '' : 's'} waiting for review, {executedCount} already executed.
        </div>
        <div className="dashboard-highlight__detail">
          Approve only when you want to hold execution, or approve and execute when the action is ready to run immediately.
        </div>
      </Card>

      {error && (
        <Alert type="error" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {filteredSuggestions.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <Clock size={48} />
            <p>No suggestions at the moment</p>
            <p className="text-muted">AI suggestions will appear here as the system proposes ticket actions.</p>
          </div>
        </Card>
      ) : (
        <div className="suggestions-list">
          {filteredSuggestions.map((suggestion) => {
            const params = suggestion.params || {};
            const confidence = getSuggestionConfidence(params);
            const reason = getSuggestionReason(params);
            const contextRows = getSuggestionContext(params);
            const actionLabel = actionLabels[suggestion.actionType] || suggestion.actionType;

            return (
              <Card key={suggestion.id} className="suggestion-card">
                <div className="suggestion-header">
                  <div className="suggestion-main">
                    <div className="suggestion-title-row">
                      <h3 className="suggestion-title">{actionLabel}</h3>
                      {confidence !== null && <Badge variant="info">Confidence {confidence}%</Badge>}
                    </div>
                    <div className="suggestion-ticket">
                      <Ticket size={16} />
                      <span>{suggestion.ticket?.subject || `Ticket ${suggestion.ticketId.slice(0, 8)}`}</span>
                    </div>
                    <p className="suggestion-description">
                      {reason || 'No additional rationale was provided for this suggestion.'}
                    </p>
                  </div>
                  <Badge variant={statusVariants[suggestion.status]}>{suggestion.status}</Badge>
                </div>

                <div className="suggestion-context-grid">
                  <div className="suggestion-context-card">
                    <div className="suggestion-context-label">Customer</div>
                    <div className="suggestion-context-value">
                      {suggestion.ticket?.customer?.name || suggestion.ticket?.customer?.email || 'Unknown customer'}
                    </div>
                  </div>
                  <div className="suggestion-context-card">
                    <div className="suggestion-context-label">Ticket status</div>
                    <div className="suggestion-context-value">{suggestion.ticket?.status || 'Unknown'}</div>
                  </div>
                  <div className="suggestion-context-card">
                    <div className="suggestion-context-label">Priority</div>
                    <div className="suggestion-context-value">{suggestion.ticket?.priority || 'Unknown'}</div>
                  </div>
                  <div className="suggestion-context-card">
                    <div className="suggestion-context-label">Created</div>
                    <div className="suggestion-context-value">{new Date(suggestion.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                {contextRows.length > 0 && (
                  <div className="suggestion-params">
                    <div className="suggestion-params__title">
                      <Sparkles size={16} />
                      Suggested parameters
                    </div>
                    <div className="suggestion-params__grid">
                      {contextRows.map(([key, value]) => (
                        <div key={key} className="suggestion-param-chip">
                          <span className="suggestion-param-chip__key">{key}</span>
                          <span className="suggestion-param-chip__value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestion.status === 'PENDING' ? (
                  <div className="suggestion-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReject(suggestion.id)}
                      disabled={isSubmittingKey === `${suggestion.id}:reject`}
                    >
                      <X size={16} />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApprove(suggestion.id, false)}
                      disabled={isSubmittingKey === `${suggestion.id}:approve`}
                    >
                      <Check size={16} />
                      Approve only
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(suggestion.id, true)}
                      disabled={isSubmittingKey === `${suggestion.id}:execute`}
                    >
                      <Play size={16} />
                      Approve & execute
                    </Button>
                  </div>
                ) : (
                  <div className="suggestion-decision">
                    {suggestion.decidedAt
                      ? `Decision recorded ${new Date(suggestion.decidedAt).toLocaleString()}`
                      : 'No decision timestamp available'}
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
