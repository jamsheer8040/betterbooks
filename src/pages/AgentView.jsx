import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart2, Users, ChevronDown, ChevronUp, Clock, CheckCircle2, DollarSign } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
};

const STATUS_CONFIG = {
  pending_approval: { label: 'Pending', bg: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  approved:         { label: 'Approved', bg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  released:         { label: 'Released', bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AgentCard({ agent, agentComms }) {
  const [expanded, setExpanded] = useState(false);

  const total    = agentComms.reduce((s, c) => s + (c.amount || 0), 0);
  const released = agentComms.filter(c => c.status === 'released').reduce((s, c) => s + (c.amount || 0), 0);
  const pending  = agentComms.filter(c => c.status === 'pending_approval').reduce((s, c) => s + (c.amount || 0), 0);
  const approved = agentComms.filter(c => c.status === 'approved').reduce((s, c) => s + (c.amount || 0), 0);
  const customerCount = new Set(agentComms.map(c => c.customer_id).filter(Boolean)).size;

  // Statement: pending → approved → released order
  const statusOrder = { pending_approval: 0, approved: 1, released: 2 };
  const sorted = [...agentComms].sort((a, b) => {
    const so = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
    if (so !== 0) return so;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Agent header */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
            {agent.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{agent.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {agent.status}
            </span>
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-sm font-bold text-gray-900">AED {fmt(total)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Released</p>
            <p className="text-sm font-bold text-green-700">AED {fmt(released)}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Pending Approval</p>
            <p className="text-sm font-bold text-yellow-700">AED {fmt(pending)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Approved</p>
            <p className="text-sm font-bold text-blue-700">AED {fmt(approved)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {customerCount} customers</div>
          <div className="flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" /> {agentComms.length} commissions</div>
        </div>
      </div>

      {/* Statement toggle */}
      {agentComms.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span>View Statement</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="border-t border-gray-100">
              {/* Section: Under Approval */}
              {sorted.filter(c => c.status === 'pending_approval').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2 bg-yellow-50 border-b border-yellow-100">
                    <Clock className="w-3.5 h-3.5 text-yellow-600" />
                    <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Under Approval</span>
                  </div>
                  {sorted.filter(c => c.status === 'pending_approval').map(c => (
                    <StatementRow key={c.id} commission={c} />
                  ))}
                </div>
              )}

              {/* Section: Approved */}
              {sorted.filter(c => c.status === 'approved').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2 bg-blue-50 border-b border-blue-100 border-t border-gray-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Approved</span>
                  </div>
                  {sorted.filter(c => c.status === 'approved').map(c => (
                    <StatementRow key={c.id} commission={c} />
                  ))}
                </div>
              )}

              {/* Section: Released */}
              {sorted.filter(c => c.status === 'released').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2 bg-green-50 border-b border-green-100 border-t border-gray-100">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Released</span>
                  </div>
                  {sorted.filter(c => c.status === 'released').map(c => (
                    <StatementRow key={c.id} commission={c} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatementRow({ commission: c }) {
  return (
    <div className="px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">AED {fmt(c.amount)}</span>
            {c.is_advance && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Advance</span>}
            <StatusBadge status={c.status} />
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {c.customer_name && <span className="mr-2">{c.customer_name}</span>}
            <span>{formatDate(c.date)}</span>
          </div>
          {c.notes && (
            <div className="mt-1 text-xs text-gray-500 italic bg-gray-50 rounded px-2 py-1">
              {c.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentView() {
  const [agents, setAgents] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Agent.list('-name', 100),
      base44.entities.Commission.list('-date', 500),
    ]).then(([a, c]) => { setAgents(a); setCommissions(c); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agent View</h1>
        <p className="text-gray-500 text-sm">Commission overview and statement by agent</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              agentComms={commissions.filter(c => c.agent_id === agent.id)}
            />
          ))}
          {agents.length === 0 && <p className="text-gray-400 col-span-3 text-center py-12">No agents yet</p>}
        </div>
      )}
    </div>
  );
}