import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

function useCurrentAgent() {
  const { user, isLoadingAuth } = useAuth();
  const [checking, setChecking] = useState(true);
  const [agent, setAgent] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user?.email) {
      setAgent(null);
      setChecking(false);
      return;
    }
    base44.entities.Agent.list('-created_date', 100)
      .then(agents => setAgent(agents.find(item => item.status === 'active' && item.email?.toLowerCase() === user.email.toLowerCase()) || null))
      .catch(() => setAgent(null))
      .finally(() => setChecking(false));
  }, [isLoadingAuth, user?.email]);

  return { agent, checking: checking || isLoadingAuth };
}

function CheckingAccess() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
}

export function StaffOnlyRoute() {
  const { agent, checking } = useCurrentAgent();
  if (checking) return <CheckingAccess />;
  return agent ? <Navigate to="/agent-portal" replace /> : <Outlet />;
}

export function AgentOnlyRoute() {
  const { agent, checking } = useCurrentAgent();
  if (checking) return <CheckingAccess />;
  return agent ? <Outlet /> : <Navigate to="/" replace />;
}