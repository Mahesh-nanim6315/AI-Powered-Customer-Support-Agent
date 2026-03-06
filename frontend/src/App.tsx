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
    console.log('📦 Stored user raw:', raw);
    if (!raw) {
      console.log('❌ No stored user found');
      return null;
    }
    const user = JSON.parse(raw) as AuthUser;
    console.log('✅ Loaded user from localStorage:', user);
    if (user.token) {
      authService.setToken(user.token);
      console.log('🔐 Token set in authService');
    }
    return user;
  } catch (error) {
    console.error('❌ Error loading stored user:', error);
    return null;
  }
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);

  useEffect(() => {
    console.log('🚀 App initializing, loading stored user...');
    const storedUser = loadStoredUser();
    console.log('📦 Setting user state to:', storedUser ? storedUser.email : 'null');
    setUser(storedUser);
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    // Only persist to localStorage AFTER bootstrap is complete
    if (!bootstrapped) {
      console.log('⏳ Skipping persist - still bootstrapping');
      return;
    }

    if (!user) {
      console.log('❌ User is null after bootstrap, clearing localStorage');
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      authService.clearToken();
      return;
    }

    console.log('💾 Persisting user to localStorage:', user.email);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    authService.setToken(user.token);
    console.log('✅ User persisted with token');
  }, [user, bootstrapped]);

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
                <Route path="/tickets" element={<TicketsPage user={user} />} />
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
