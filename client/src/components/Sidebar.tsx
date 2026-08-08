'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Receipt,
  Clock,
  Wallet,
  UserCheck,
  Percent,
  Package,
  Settings,
  ShieldCheck,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout, companySettings } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
    { label: 'Customers', href: '/customers', icon: Users, permission: 'customers.view' },
    { label: 'VAT Filings', href: '/filings', icon: FileCheck, permission: 'filings.view' },
    { label: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoices.view' },
    { label: 'Document Tracker', href: '/document-tracker', icon: Clock, permission: 'customers.view' },
    { label: 'Wallets & Banking', href: '/wallets', icon: Wallet, permission: 'wallets.view' },
    { label: 'Agents', href: '/agents', icon: UserCheck, permission: 'agents.view' },
    { label: 'Commissions', href: '/commissions', icon: Percent, permission: 'commissions.view' },
    { label: 'Products & Services', href: '/masters/products', icon: Package, permission: 'products.manage' },
    { label: 'Company Setup', href: '/company-setup', icon: Settings, permission: 'company.manage' },
  ];

  const visibleItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white text-base tracking-tight truncate">
            {companySettings?.company_name || 'Better Books'}
          </h1>
          <p className="text-xs text-blue-400 font-medium">UAE Tax & Compliance</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Agent Portal direct link if user is an agent */}
        {user?.role === 'agent' && (
          <Link
            href="/agent-portal"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              pathname.startsWith('/agent-portal')
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Agent Portal</span>
          </Link>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate capitalize">{user?.role || 'Staff'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
