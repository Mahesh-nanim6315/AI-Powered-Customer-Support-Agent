import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser, Organization } from '../types';
import { authService } from '../services/auth.service';

interface OrgContextValue {
  organizations: Organization[];
  activeOrgId: string;
  isLoading: boolean;
  switchOrg: (orgId: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

interface OrgProviderProps {
  user: AuthUser;
  onUserUpdate: (user: AuthUser) => void;
  children: React.ReactNode;
}

export function OrgProvider({ user, onUserUpdate, children }: OrgProviderProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState(user.orgId);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActiveOrgId(user.orgId);
  }, [user.orgId]);

  useEffect(() => {
    let mounted = true;
    const loadOrganizations = async () => {
      setIsLoading(true);
      try {
        const response = await authService.me();
        if (!mounted) return;
        setOrganizations(response.organizations || []);
      } catch {
        if (!mounted) return;
        setOrganizations([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadOrganizations();
    return () => {
      mounted = false;
    };
  }, [user.token]);

  const switchOrg = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    setIsLoading(true);
    try {
      const response = await authService.switchOrg(orgId);
      onUserUpdate({ ...user, token: response.token, orgId: response.user.orgId });
      setActiveOrgId(response.user.orgId);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({ organizations, activeOrgId, isLoading, switchOrg }),
    [organizations, activeOrgId, isLoading]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within OrgProvider');
  }
  return ctx;
}
