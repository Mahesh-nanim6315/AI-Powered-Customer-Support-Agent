import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from './context/RealtimeContext';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { CustomersPage } from './pages/CustomersPage';
import { AgentsPage } from './pages/AgentsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { AiSuggestionsPage } from './pages/AiSuggestionsPage';
import { authService } from './services/auth.service';
import type { AuthUser } from './types';
import './App.css';

const AUTH_STORAGE_KEY = 'chitti_auth_user';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

function loadStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    if (user.token) {
      authService.setToken(user.token);
    }
    return user;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);

  useEffect(() => {
    const storedUser = loadStoredUser();
    setUser(storedUser);
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      authService.clearToken();
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    authService.setToken(user.token);
  }, [user]);

  if (!bootstrapped) {
    return (
      <div className="app-loader">
        <div className="app-loader-spinner" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {!user ? (
          <Routes>
            <Route
              path="/login"
              element={
                isSignupMode ? (
                  <SignupPage
                    onAuthenticated={(authUser) => {
                      setUser(authUser);
                    }}
                    onBackToLogin={() => setIsSignupMode(false)}
                  />
                ) : (
                  <LoginPage
                    onAuthenticated={(authUser) => {
                      setUser(authUser);
                    }}
                    onGoToSignup={() => setIsSignupMode(true)}
                  />
                )
              }
            />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <RealtimeProvider token={user.token}>
            <AppLayout
              userEmail={user.email}
              userRole={user.role}
              onLogout={() => {
                setUser(null);
              }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/ai-suggestions" element={<AiSuggestionsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </RealtimeProvider>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
