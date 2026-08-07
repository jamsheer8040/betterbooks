import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function AgentModal({ agent, onClose, onSaved }) {
  const [form, setForm] = useState({ name: agent?.name || '', email: agent?.email || '', user_id: agent?.user_id || '', status: agent?.status || 'active' });
  const [onboarding, setOnboarding] = useState('profile');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const email = form.email.trim().toLowerCase();
    if (agent?.id) {
      await base44.entities.Agent.update(agent.id, { ...form, email });
    } else if (onboarding === 'invite') {
      const users = await base44.entities.User.list('-created_date', 100);
      const linkedUser = users.find(user => user.email?.toLowerCase() === email);
      if (!linkedUser) await base44.users.inviteUser(email, 'user');
      await base44.entities.Agent.create({ ...form, email, user_id: linkedUser?.id || email });
    } else {
      await base44.entities.Agent.create({ ...form, email });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{agent ? 'Edit Agent' : 'New Agent'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {!agent && <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setOnboarding('profile')} className={`rounded-xl border p-3 text-left ${onboarding === 'profile' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><span className="block text-sm font-semibold text-gray-800">Add profile</span><span className="mt-1 block text-xs text-gray-500">Create an agent record only</span></button>
            <button type="button" onClick={() => setOnboarding('invite')} className={`rounded-xl border p-3 text-left ${onboarding === 'invite' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><span className="block text-sm font-semibold text-gray-800">Send invite</span><span className="mt-1 block text-xs text-gray-500">Agent creates a secure password</span></button>
          </div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={saving || !form.name || !form.email.trim()} onClick={save} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : agent ? 'Save' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}