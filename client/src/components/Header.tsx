'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, Search, Shield } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        {title && <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {children}

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 capitalize">
              {user?.role}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {user?.name?.[0] || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
