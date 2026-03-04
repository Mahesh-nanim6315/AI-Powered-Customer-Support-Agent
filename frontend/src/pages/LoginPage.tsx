import { FormEvent, useState } from "react";
import type { AuthUser } from "../types";
import { login } from "../api";
import "../auth.css";

interface LoginPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user: AuthUser = await login(email, password);
      onAuthenticated(user);
    } catch (err) {
      console.error(err);
      setError("Invalid credentials or server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in to Chitti AI</h1>
        <p className="auth-subtitle">
          Use your organization admin or agent account to access the console.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label className="auth-label">
            Work email
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

