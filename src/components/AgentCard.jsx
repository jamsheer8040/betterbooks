import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Pencil, Trash2, UserCheck } from 'lucide-react';

export default function AgentCard({ agent, hasAccount, onEdit, onDelete }) {
  const [inviteState, setInviteState] = useState('idle');

  const sendInvite = async () => {
    setInviteState('sending');
    try {
      await base44.users.inviteUser(agent.email.trim().toLowerCase(), 'user');
      setInviteState('sent');
    } catch (error) {
      setInviteState(error?.message?.includes('already') ? 'sent' : 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
          <UserCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{agent.name}</p>
          <p className="text-xs text-gray-500 truncate">{agent.email || 'No email'}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasAccount ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {hasAccount ? 'Portal access active' : 'No portal account yet'}
        </span>
        {agent.email && !hasAccount && (
          <button onClick={sendInvite} disabled={inviteState === 'sending' || inviteState === 'sent'} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            <Mail className="w-3.5 h-3.5" />
            {inviteState === 'sending' ? 'Sending…' : inviteState === 'sent' ? 'Invite sent' : inviteState === 'error' ? 'Failed — retry' : 'Send invite'}
          </button>
        )}
      </div>
    </div>
  );
}