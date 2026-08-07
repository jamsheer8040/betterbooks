import { FileText, LogOut } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AgentLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link to="/agent-portal" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600"><FileText className="h-4 w-4 text-white" /></span>
            <span className="text-sm font-semibold text-gray-900">VAT Manager</span>
          </Link>
          <button onClick={() => logout()} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-screen-lg px-6 py-6"><Outlet /></main>
    </div>
  );
}