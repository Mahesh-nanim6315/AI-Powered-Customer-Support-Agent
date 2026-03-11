import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button, Input, Alert, Card } from '../components';
import { customersService } from '../services/customer.service';
import '../auth.css';

export function CustomerInvitePage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!token) {
      setError('Invite token is missing.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await customersService.acceptInvite({ token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to activate account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Activate Your Account</h1>
          <p className="auth-subtitle">Set a password to access the support portal.</p>
        </div>

        {error && (
          <Alert type="warning" title="Activation Error">
            {error}
          </Alert>
        )}

        {success ? (
          <Alert type="success" title="Account Activated">
            Your account is ready. You can now sign in to the portal.
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/login">Go to login</Link>
            </div>
          </Alert>
        ) : (
          <div className="auth-form">
            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button onClick={handleAccept} disabled={isSubmitting || !token}>
              {isSubmitting ? 'Activating...' : 'Activate Account'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
