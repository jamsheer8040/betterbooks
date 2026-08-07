import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import AgentModal from '@/components/AgentModal';
import AgentCard from '@/components/AgentCard';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [userEmails, setUserEmails] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => base44.entities.Agent.list('-created_date', 100).then(setAgents);
  useEffect(() => {
    load();
    base44.entities.User.list('-created_date', 200).then(users => setUserEmails(users.map(u => u.email?.toLowerCase())));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this agent?')) return;
    await base44.entities.Agent.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm">Manage commission agents</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            hasAccount={!!agent.email && userEmails.includes(agent.email.toLowerCase())}
            onEdit={() => { setEditing(agent); setModalOpen(true); }}
            onDelete={() => handleDelete(agent.id)}
          />
        ))}
        {agents.length === 0 && <p className="text-gray-400 col-span-3 text-center py-12">No agents yet</p>}
      </div>

      {modalOpen && <AgentModal agent={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />}
    </div>
  );
}