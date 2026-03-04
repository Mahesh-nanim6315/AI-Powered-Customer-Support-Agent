import { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import "../layout.css";

interface AppLayoutProps extends PropsWithChildren {
  userEmail: string;
  onLogout: () => void;
}

export function AppLayout({ children, userEmail, onLogout }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-logo">Chitti AI</div>
        <nav className="app-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `app-nav-item${isActive ? " app-nav-item-active" : ""}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `app-nav-item${isActive ? " app-nav-item-active" : ""}`
            }
          >
            Tickets
          </NavLink>
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `app-nav-item${isActive ? " app-nav-item-active" : ""}`
            }
          >
            Customers
          </NavLink>
          <NavLink
            to="/agents"
            className={({ isActive }) =>
              `app-nav-item${isActive ? " app-nav-item-active" : ""}`
            }
          >
            Agents
          </NavLink>
          <NavLink
            to="/knowledge"
            className={({ isActive }) =>
              `app-nav-item${isActive ? " app-nav-item-active" : ""}`
            }
          >
            Knowledge Base
          </NavLink>
          <NavLink
            to="/ai-suggestions"
            className={({ isActive }) =>
              `app-nav-item${isActive ? " app-nav-item-active" : ""}`
            }
          >
            AI Suggestions
          </NavLink>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-header-title">AI-Powered Support Console</div>
          <div className="app-header-user">
            <span className="app-header-user-name">{userEmail}</span>
            <button className="app-header-logout" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

