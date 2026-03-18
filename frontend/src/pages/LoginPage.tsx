import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLogin } from '../hooks/useAuth';
import type { AuthUser, LoginRequest } from '../types';
import { Input, Button, Alert, Spinner } from '../components';
import '../auth.css';

interface LoginPageProps {
  onAuthenticated: (user: AuthUser) => void;
  onGoToSignup?: () => void;
}

export function LoginPage({ onAuthenticated, onGoToSignup }: LoginPageProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginRequest>({
    defaultValues: {
      email: 'admin@example.com',
      password: 'password123',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();

  async function onSubmit(data: LoginRequest) {
    try {
      console.log('🔐 Logging in with email:', data.email);
      const response = await loginMutation.mutateAsync(data);
      console.log('✅ Login response:', response);
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        orgId: response.user.orgId,
        role: response.user.role,
        token: response.token,
      };
      console.log('👤 Constructed AuthUser:', authUser);
      onAuthenticated(authUser);
      console.log('✅ onAuthenticated called');
    } catch (error) {
      console.error('❌ Login failed:', error);
    }
  }

  const isLoading = loginMutation.isPending;
  const email = watch('email');

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">ZenDesk AI</h1>
          <p className="auth-subtitle">Customer Support Intelligence Platform</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          {loginMutation.isError && (
            <Alert type="error" title="Login Failed">
              {loginMutation.error instanceof Error ? loginMutation.error.message : 'Invalid credentials or server error'}
            </Alert>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="admin@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            error={errors.email?.message}
            disabled={isLoading}
          />

          <div className="password-wrapper">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              error={errors.password?.message}
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Spinner size="sm" />
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </Button>

          <p className="auth-demo-note">
            Demo credentials:
            <br />
            Email: admin@example.com
            <br />
            Password: password123
          </p>

          {onGoToSignup && (
            <>
              <div className="auth-divider">
                <span>Don't have an account?</span>
              </div>
              <button
                type="button"
                className="auth-link-button"
                onClick={onGoToSignup}
                disabled={isLoading}
              >
                Create Account
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

