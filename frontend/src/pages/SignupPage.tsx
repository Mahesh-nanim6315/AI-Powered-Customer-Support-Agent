import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRegister } from '../hooks/useAuth';
import type { AuthUser, RegisterRequest } from '../types';
import { Input, Button, Alert, Spinner } from '../components';
import '../auth.css';

interface SignupPageProps {
  onAuthenticated: (user: AuthUser) => void;
  onBackToLogin: () => void;
}

export function SignupPage({ onAuthenticated, onBackToLogin }: SignupPageProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterRequest & { confirmPassword: string }>({
    defaultValues: {
      orgName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const passwordsMatch = password === confirmPassword;

  async function onSubmit(data: RegisterRequest & { confirmPassword: string }) {
    if (!passwordsMatch) {
      return;
    }

    try {
      const response = await registerMutation.mutateAsync({
        orgName: data.orgName,
        email: data.email,
        password: data.password,
      });
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        orgId: response.user.orgId,
        role: response.user.role,
        token: response.token,
      };
      onAuthenticated(authUser);
    } catch (error) {
      console.error('Signup failed:', error);
    }
  }

  const isLoading = registerMutation.isPending;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">Join Chitti AI Support Platform</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          {registerMutation.isError && (
            <Alert type="error" title="Signup Failed">
              {registerMutation.error instanceof Error ? registerMutation.error.message : 'Failed to create account'}
            </Alert>
          )}

          <Input
            label="Organization Name"
            type="text"
            placeholder="Your Company Name"
            {...register('orgName', {
              required: 'Organization name is required',
              minLength: {
                value: 3,
                message: 'Organization name must be at least 3 characters',
              },
            })}
            error={errors.orgName?.message}
            disabled={isLoading}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
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

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: () => passwordsMatch || 'Passwords do not match',
            })}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
          />

          <Button
            type="submit"
            fullWidth
            disabled={isLoading || !passwordsMatch}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Spinner size="sm" />
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </Button>

          <div className="auth-divider">
            <span>Already have an account?</span>
          </div>

          <button
            type="button"
            className="auth-link-button"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            Sign In Instead
          </button>
        </form>
      </div>
    </div>
  );
}
