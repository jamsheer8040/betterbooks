'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, CompanySettings } from '@/types';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  companySettings: CompanySettings | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCompanySettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanySettings = async () => {
    try {
      const res = await api.company.get();
      if (res.data) setCompanySettings(res.data);
    } catch (e) {
      console.warn('Could not load company settings:', e);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.auth.me();
      if (res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn('Auth check error:', e);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchCompanySettings();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const checkPermission = (key: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(key) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        companySettings,
        loading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        refreshCompanySettings: fetchCompanySettings,
        refreshSettings: fetchCompanySettings,
        hasPermission: checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  // Return safe defaults if called outside provider (e.g. during SSR/static render)
  if (!context) {
    return {
      user: null,
      companySettings: null,
      loading: true,
      login: async () => {},
      logout: () => {},
      refreshUser: async () => {},
      refreshCompanySettings: async () => {},
      refreshSettings: async () => {},
      hasPermission: () => false,
    };
  }
  return context;
}
