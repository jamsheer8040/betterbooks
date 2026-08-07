import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, FilePlus, UserCheck, DollarSign, BarChart2, User, TableProperties, Receipt, Wallet, Building2, Package, FileClock } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'New Filing', path: '/filings/new', icon: FilePlus },
  { label: 'All Filings', path: '/filings', icon: FileText },
  { label: 'Document Tracker', path: '/document-tracker', icon: FileClock },
  { label: 'Invoices', path: '/invoices', icon: Receipt },
  { label: 'Products & Services', path: '/masters/products', icon: Package },
  { label: 'Wallets', path: '/wallets', icon: Wallet },
  { label: 'Agents', path: '/agents', icon: UserCheck },
  { label: 'Commissions', path: '/commissions', icon: DollarSign },
  { label: 'Agent View', path: '/agent-view', icon: BarChart2 },
  { label: 'Company Setup', path: '/company-setup', icon: Building2 },
];

export default function Layout() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/filings/new') return location.pathname === '/filings/new';
    if (path === '/filings') return location.pathname === '/filings' || (location.pathname.startsWith('/filings/') && location.pathname !== '/filings/new');
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">VAT Manager</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}