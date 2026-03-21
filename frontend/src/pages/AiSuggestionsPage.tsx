import { useEffect, useState } from 'react';
import { Card, Badge, Button, Spinner, Alert } from '../components';
import { Check, X, Clock } from 'lucide-react';
import type { AiSuggestion } from '../types';
import { aiSuggestionsService } from '../services/ai.service';
import '../page.css';

export function AiSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    try {
      setIsSubmittingId(id);
      await aiSuggestionsService.approve(id);
      await loadSuggestions();
    } catch (e) {
      console.error('Approve failed:', e);
      setError('Failed to approve suggestion');
    } finally {
      setIsSubmittingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setIsSubmittingId(id);
      await aiSuggestionsService.reject(id);
      await loadSuggestions();
    } catch (e) {
      console.error('Reject failed:', e);
      setError('Failed to reject suggestion');
    } finally {
      setIsSubmittingId(null);
    }
  };

  const statusVariants: any = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    EXECUTED: 'success',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Suggestions</h1>
          <p className="page-subtitle">
            Review the live approve-or-reject queue for AI-generated support suggestions
          </p>
        </div>
      </div>

      <Alert type="info" title="Current Scope">
        This screen currently supports basic approve and reject actions only. Confidence scoring, execution audit, and richer suggestion context are not exposed here yet.
      </Alert>

      {error && (
        <Alert type="error" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {suggestions.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <Clock size={48} />
            <p>No suggestions at the moment</p>
            <p className="text-muted">AI suggestions will appear here</p>
          </div>
        </Card>
      ) : (
        <div className="suggestions-list">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="suggestion-card">
              <div className="suggestion-header">
                <div>
                  <h3 className="suggestion-title">{suggestion.actionType}</h3>
                  <p className="suggestion-description">{suggestion.params?.description}</p>
                </div>
                <Badge variant={statusVariants[suggestion.status]}>
                  {suggestion.status}
                </Badge>
              </div>
              
              {suggestion.status === 'PENDING' && (
                <div className="suggestion-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReject(suggestion.id)}
                    disabled={isSubmittingId === suggestion.id}
                  >
                    <X size={16} />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(suggestion.id)}
                    disabled={isSubmittingId === suggestion.id}
                  >
                    <Check size={16} />
                    Approve
                  </Button>
                </div>
              )}

              <div className="suggestion-meta">
                Created {new Date(suggestion.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
