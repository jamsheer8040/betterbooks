import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

// Adds a user record directly via invitation, then optionally pre-assigns a user type
// by creating a UserProfile keyed on their email (linked to the User id once they join).
export default function AddUserModal({ userTypes, onSaved, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [typeId, setTypeId] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!email.trim()) return;
    setSaving(true);
    // Invite so the user is created on the platform
    await base44.users.inviteUser(email.trim(), role);
    // Pre-create a profile so the assigned type/permissions apply once they join
    const selectedType = userTypes.find(t => t.id === typeId);
    await base44.entities.UserProfile.create({
      user_id: email.trim(),
      user_email: email.trim(),
      user_name: name.trim(),
      user_type_id: typeId,
      user_type_name: selectedType?.name || '',
      permission_overrides: {},
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Role</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={typeId} onChange={e => setTypeId(e.target.value)}>
                <option value="">None</option>
                {userTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400">An invitation email is sent. The assigned type applies once they join.</p>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={saving || !email.trim()} onClick={save} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}