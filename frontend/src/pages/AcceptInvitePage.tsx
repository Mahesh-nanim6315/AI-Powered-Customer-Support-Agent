import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input, Alert, Card } from '../components';
import { authService } from '../services/auth.service';
import type { AuthUser } from '../types';
import '../auth.css';

interface AcceptInvitePageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export function AcceptInvitePage({ onAuthenticated }: AcceptInvitePageProps) {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!token) {
      setError('Invite token is missing.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await authService.acceptInvite(token, password || undefined);
      onAuthenticated({ ...response.user, token: response.token });
    } catch (err: any) {
      setError(err?.message || 'Failed to accept invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Accept Invite</h1>
          <p className="auth-subtitle">Set a password to join your organization.</p>
        </div>

        {error && (
          <Alert type="warning" title="Invite Error">
            {error}
          </Alert>
        )}

        <div className="auth-form">
          <Input
            label="Password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={handleAccept} disabled={isSubmitting || !token}>
            {isSubmitting ? 'Accepting...' : 'Accept Invite'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
