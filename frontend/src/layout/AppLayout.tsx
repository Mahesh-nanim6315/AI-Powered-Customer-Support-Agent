import { PropsWithChildren, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Zap,
  BookOpen,
  LogOut,
  Menu,
  X,
  Lightbulb,
  Circle,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { useOrg } from '../context/OrgContext';
import '../layout.css';
import type { UserRole } from '../types';

interface AppLayoutProps extends PropsWithChildren {
  userEmail: string;
  userRole: UserRole;
  onLogout: () => void;
}

export function AppLayout({ children, userEmail, userRole, onLogout }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const realtime = useRealtime();
  const { organizations, activeOrgId, switchOrg, isLoading } = useOrg();
  const displayName = (userEmail.split('@')[0] || 'User')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard',
    },
    {
      icon: MessageSquare,
      label: 'Tickets',
      path: '/tickets',
      allowedRoles: ['ADMIN', 'AGENT', 'CUSTOMER'],
    },
    {
      icon: Users,
      label: 'Customers',
      path: '/customers',
      allowedRoles: ['ADMIN'],
    },
    {
      icon: Zap,
      label: 'Agents',
      path: '/agents',
      allowedRoles: ['ADMIN'],
    },
    {
      icon: BookOpen,
      label: 'Knowledge Base',
      path: '/knowledge',
      allowedRoles: ['ADMIN', 'AGENT'],
    },
    {
      icon: Lightbulb,
      label: 'AI Suggestions',
      path: '/ai-suggestions',
      allowedRoles: ['ADMIN', 'AGENT'],
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      path: '/analytics',
      allowedRoles: ['ADMIN'],
    },
    {
      icon: Settings,
      label: 'AI Settings',
      path: '/ai-settings',
      allowedRoles: ['ADMIN'],
    },
    {
      icon: FileText,
      label: 'Logs',
      path: '/logs',
      allowedRoles: ['ADMIN'],
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(userRole)
  );

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'app-sidebar--open' : ''}`}>
        <div className="app-sidebar-header">
          <div className="app-logo">
            <Lightbulb size={24} />
            <span>Chitti</span>
          </div>
          <button
            className="app-sidebar-toggle"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="app-nav">
          {visibleNavItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `app-nav-item ${isActive ? 'app-nav-item--active' : ''}`
              }
              onClick={handleNavClick}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <div className="app-user-info">
            <div className="app-user-avatar">{userEmail.charAt(0).toUpperCase()}</div>
            <div className="app-user-details">
              <div className="app-user-email">{userEmail}</div>
              <div className="app-user-role">{userRole}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button
            className="app-header-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={24} />
          </button>
          <div className="app-header-title">Support Console</div>
          <div className="app-header-user">
            <div className="app-header-user-name">{displayName}</div>
            <div className="app-header-user-role">{userRole}</div>
          </div>
          {organizations.length > 1 && (
            <select
              className="app-header-org-switcher"
              value={activeOrgId}
              onChange={(e) => switchOrg(e.target.value)}
              disabled={isLoading}
              aria-label="Switch organization"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
          <div className="app-header-status">
            <div
              className={`connection-status ${realtime.isConnected ? 'connected' : 'disconnected'}`}
              title={realtime.isConnected ? 'Connected to real-time updates' : 'Reconnecting...'}
            >
              <Circle size={12} fill={realtime.isConnected ? '#10b981' : '#ef4444'} color={realtime.isConnected ? '#10b981' : '#ef4444'} />
              <span>{realtime.isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <button className="app-header-logout" onClick={onLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
    
  );
}

