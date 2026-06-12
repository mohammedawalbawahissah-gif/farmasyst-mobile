import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, saveTokens, clearTokens, saveUser, loadUser } from '../api/client';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await loadUser();
        if (cached) setUser(cached);
        // Validate token with /me/
        const { data } = await authApi.me();
        setUser(data);
        await saveUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    await saveTokens(data.access, data.refresh);
    const me = await authApi.me();
    setUser(me.data);
    await saveUser(me.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = await AsyncStorage.getItem('farmasyst:refresh');
      if (refresh) await authApi.logout(refresh);
    } catch { /* ignore */ }
    await clearTokens();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data);
    await saveUser(data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
