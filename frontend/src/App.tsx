import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketsPage } from "./pages/TicketsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { AgentsPage } from "./pages/AgentsPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { AiSuggestionsPage } from "./pages/AiSuggestionsPage";
import type { AuthUser } from "./types";
import "./App.css";

const AUTH_STORAGE_KEY = "chitti_ai_demo_auth";

function loadStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    setUser(loadStoredUser());
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  if (!bootstrapped) {
    return (
      <div className="app-bootstrap">
        <div className="app-bootstrap-spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage
                onAuthenticated={(fakeUser) => {
                  setUser(fakeUser);
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AppLayout
          userEmail={user.email}
          onLogout={() => {
            setUser(null);
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tickets" element={<TicketsPage token={user.token} />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/ai-suggestions" element={<AiSuggestionsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppLayout>
      )}
    </BrowserRouter>
  );
}

export default App;
