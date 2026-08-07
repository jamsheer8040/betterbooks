import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, UserPlus2, Users, Plus, Pencil, Trash2, Shield, SlidersHorizontal } from 'lucide-react';
import UserTypeModal from '@/components/users/UserTypeModal';
import UserPermissionsModal from '@/components/users/UserPermissionsModal';
import AddUserModal from '@/components/users/AddUserModal';
import { getEffectivePermissions } from '@/lib/permissions';

const BADGE_CLASSES = {
  blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50', amber: 'text-amber-600 bg-amber-50', gray: 'text-gray-600 bg-gray-100',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const [typeModal, setTypeModal] = useState(null); // { userType } | { }
  const [permModal, setPermModal] = useState(null); // { user, profile }

  const load = () => {
    Promise.all([
      base44.entities.User.list('-created_date', 100),
      base44.entities.UserType.list('-created_date', 100),
      base44.entities.UserProfile.list('-created_date', 200),
    ]).then(([u, t, p]) => {
      setUsers(u); setUserTypes(t); setProfiles(p); setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    setInviteEmail(''); setShowInvite(false); setInviting(false);
    alert('Invitation sent!');
  };

  const deleteType = async (t) => {
    if (!confirm(`Delete user type "${t.name}"?`)) return;
    await base44.entities.UserType.delete(t.id);
    load();
  };

  const getProfile = (userId) => profiles.find(p => p.user_id === userId);

  const onTypeSaved = () => { setTypeModal(null); load(); };
  const onPermSaved = () => { setPermModal(null); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Manage user types, permissions and access</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <UserPlus className="w-4 h-4" /> Invite User
          </button>
          <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <UserPlus2 className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* User Types */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">User Types</h2>
            <span className="text-gray-400 text-sm">({userTypes.length})</span>
          </div>
          <button onClick={() => setTypeModal({})} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Type
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : userTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No user types yet. Create one to define role permissions.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {userTypes.map(t => (
              <div key={t.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_CLASSES[t.color] || BADGE_CLASSES.blue}`}>{t.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setTypeModal({ userType: t })} className="text-gray-400 hover:text-gray-700 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteType(t)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
                <p className="text-xs text-gray-400">{(t.permissions || []).length} permission{(t.permissions || []).length !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">All Users</h2>
          <span className="text-gray-400 text-sm">({users.length})</span>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No users yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map(user => {
              const profile = getProfile(user.id);
              const type = userTypes.find(t => t.id === profile?.user_type_id);
              const effectiveCount = profile ? getEffectivePermissions(profile, type).size : 0;
              return (
                <div key={user.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {(user.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || 'No name'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {type ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_CLASSES[type.color] || BADGE_CLASSES.blue}`}>{type.name}</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">No type</span>
                  )}
                  {profile && <span className="text-xs text-gray-400 hidden sm:inline">{effectiveCount} perms</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{user.role || 'user'}</span>
                  <button onClick={() => setPermModal({ user, profile })} className="flex items-center gap-1 text-xs border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-gray-600 font-medium transition-colors">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Permissions
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Invite User</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Role</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Assign a user type & permissions after they join.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button disabled={inviting || !inviteEmail} onClick={handleInvite} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddUser && (
        <AddUserModal userTypes={userTypes} onSaved={() => { setShowAddUser(false); load(); }} onClose={() => setShowAddUser(false)} />
      )}

      {typeModal && (
        <UserTypeModal userType={typeModal.userType} onSaved={onTypeSaved} onClose={() => setTypeModal(null)} />
      )}
      {permModal && (
        <UserPermissionsModal user={permModal.user} profile={permModal.profile} userTypes={userTypes} onSaved={onPermSaved} onClose={() => setPermModal(null)} />
      )}
    </div>
  );
}