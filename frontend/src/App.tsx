import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from './context/RealtimeContext';
import { OrgProvider } from './context/OrgContext';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { CustomerInvitePage } from './pages/CustomerInvitePage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { CustomersPage } from './pages/CustomersPage';
import { AgentsPage } from './pages/AgentsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { AiSuggestionsPage } from './pages/AiSuggestionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AiSettingsPage } from './pages/AiSettingsPage';
import { LogsPage } from './pages/LogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { authService } from './services/auth.service';
import type { AuthUser } from './types';
import './design-system.css';
import './App.css';

const AUTH_STORAGE_KEY = 'chitti_auth_user';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 429) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

function loadStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const user = JSON.parse(raw) as AuthUser;
    if (user.token) {
      authService.setToken(user.token);
    }
    return user;
  } catch (error) {
    return null;
  }
}

interface RoleRouteProps {
  user: AuthUser;
  allowedRoles: AuthUser['role'][];
  children: ReactNode;
}

function RoleRoute({ user, allowedRoles, children }: RoleRouteProps) {
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
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
    // Only persist to localStorage AFTER bootstrap is complete
    if (!bootstrapped) {
      return;
    }

    if (!user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      authService.clearToken();
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    authService.setToken(user.token);
  }, [user, bootstrapped]);

  useEffect(() => {
    if (!bootstrapped) return;
    queryClient.clear();
  }, [user?.id, user?.orgId, user?.role, user?.token, bootstrapped]);

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
            <Route
              path="/accept-invite"
              element={
                <AcceptInvitePage
                  onAuthenticated={(authUser) => {
                    setUser(authUser);
                  }}
                />
              }
            />
            <Route path="/customer-invite" element={<CustomerInvitePage />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <RealtimeProvider token={user.token}>
            <OrgProvider user={user} onUserUpdate={setUser}>
              <AppLayout
                userEmail={user.email}
                userRole={user.role}
                onLogout={() => {
                  setUser(null);
                }}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage user={user} />} />
                  <Route path="/tickets" element={<TicketsPage user={user} />} />
                  <Route
                    path="/notifications"
                    element={
                      <RoleRoute user={user} allowedRoles={['CUSTOMER']}>
                        <NotificationsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN']}>
                        <CustomersPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/agents"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN']}>
                        <AgentsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/knowledge"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN', 'AGENT']}>
                        <KnowledgePage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/ai-suggestions"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN', 'AGENT']}>
                        <AiSuggestionsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN']}>
                        <AnalyticsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/ai-settings"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN']}>
                        <AiSettingsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN']}>
                        <LogsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/customer-invite"
                    element={
                      <RoleRoute user={user} allowedRoles={['ADMIN']}>
                        <CustomerInvitePage />
                      </RoleRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </OrgProvider>
          </RealtimeProvider>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
