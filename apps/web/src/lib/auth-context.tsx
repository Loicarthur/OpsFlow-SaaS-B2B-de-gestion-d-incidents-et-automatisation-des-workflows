'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';
import { tokenStorage } from './token-storage';
import type { AuthResponse, OrgRole, UserSummary } from './types';
import { roleHasPermission, type Permission } from '@opsflow/shared';

interface Session {
  user: UserSummary;
  organization: { id: string; name: string };
  role: OrgRole;
}

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = 'opsflow.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Reads localStorage after mount (not in a lazy useState initializer) so the
  // server-rendered and first client render match, avoiding a hydration mismatch.
  useEffect(() => {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw && tokenStorage.getAccessToken()) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(JSON.parse(raw));
      } catch {
        // ignore malformed cache
      }
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((data: AuthResponse) => {
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    const nextSession: Session = { user: data.user, organization: data.organization, role: data.role };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiClient.post<AuthResponse>('/auth/login', { email, password }, { skipAuth: true });
      persist(data);
      router.push('/dashboard');
    },
    [persist, router],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    }) => {
      const data = await apiClient.post<AuthResponse>('/auth/register', input, { skipAuth: true });
      persist(data);
      router.push('/dashboard');
    },
    [persist, router],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // best-effort revoke; proceed with local logout regardless
    }
    tokenStorage.clear();
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    router.push('/login');
  }, [router]);

  const can = useCallback((permission: Permission) => (session ? roleHasPermission(session.role, permission) : false), [session]);

  return (
    <AuthContext.Provider value={{ session, isLoading, login, register, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
