import { Card, Badge, Button, Spinner } from '../components';
import { Check, X, Clock } from 'lucide-react';
import '../page.css';

export function AiSuggestionsPage() {
  // TODO: Hook up with aiSuggestions service
  const suggestions: any[] = [];
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    // TODO: Call approve endpoint
    console.log('Approve suggestion:', id);
  };

  const handleReject = async (id: string) => {
    // TODO: Call reject endpoint
    console.log('Reject suggestion:', id);
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
            Review and approve AI-generated suggestions for your support team
          </p>
        </div>
      </div>

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
          {suggestions.map((suggestion: any) => (
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
                  >
                    <X size={16} />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(suggestion.id)}
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

