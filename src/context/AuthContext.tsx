import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, saveTokens, clearTokens, saveUser, loadUser, getAccessToken, getRefreshToken } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true,
  login: async () => {}, logout: async () => {}, refreshUser: async () => {}, setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadUser();
        const token  = await getAccessToken();
        if (stored && token) {
          setUser(stored);
          // Silently refresh user from API in background
          try {
            const r = await authApi.me();
            setUser(r.data);
            await saveUser(r.data);
          } catch { /* keep stored user */ }
        }
      } catch { /* expired/missing — stay logged out */ }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r    = await authApi.login(email, password);
    const data = r.data;

    // Defensive: handle any shape the backend sends
    const access   = data.access   ?? data.tokens?.access   ?? data.token;
    const refresh  = data.refresh  ?? data.tokens?.refresh  ?? '';
    const userData = data.user     ?? data.farmer            ?? data.profile ?? data;

    if (!access) throw new Error('No access token returned by server.');

    await saveTokens(access, refresh);
    await saveUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = await getRefreshToken();
      if (refresh) await authApi.logout(refresh);
    } catch { /* ignore */ }
    await clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const r = await authApi.me();
      setUser(r.data);
      await saveUser(r.data);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
