import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, RotateCcw } from 'lucide-react';
import { PERMISSION_GROUPS, isPermissionEffective } from '@/lib/permissions';

// Manages a single user's assigned type + manual permission overrides.
export default function UserPermissionsModal({ user, profile, userTypes, onSaved, onClose }) {
  const [typeId, setTypeId] = useState(profile?.user_type_id || '');
  const [overrides, setOverrides] = useState({ ...(profile?.permission_overrides || {}) });
  const [saving, setSaving] = useState(false);

  const selectedType = userTypes.find(t => t.id === typeId);

  // Toggling cycles a permission's override relative to the base type.
  const toggle = (key) => {
    setOverrides(prev => {
      const next = { ...prev };
      const effective = isPermissionEffective(key, selectedType, prev);
      const base = (selectedType?.permissions || []).includes(key);
      const target = !effective;
      if (target === base) delete next[key]; // back to base → drop override
      else next[key] = target;
      return next;
    });
  };

  const resetOverrides = () => setOverrides({});

  const save = async () => {
    setSaving(true);
    const payload = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || '',
      user_type_id: typeId,
      user_type_name: selectedType?.name || '',
      permission_overrides: overrides,
    };
    const saved = profile?.id
      ? await base44.entities.UserProfile.update(profile.id, payload)
      : await base44.entities.UserProfile.create(payload);
    setSaving(false);
    onSaved(saved);
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
            <p className="text-xs text-gray-500">{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={typeId} onChange={e => { setTypeId(e.target.value); setOverrides({}); }}>
              <option value="">No type assigned</option>
              {userTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Effective Permissions</label>
            {overrideCount > 0 && (
              <button onClick={resetOverrides} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <RotateCcw className="w-3 h-3" /> Reset {overrideCount} override{overrideCount > 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {PERMISSION_GROUPS.map(group => (
              <div key={group.module} className="border border-gray-200 rounded-lg p-3">
                <span className="text-sm font-semibold text-gray-800 block mb-2">{group.module}</span>
                <div className="grid grid-cols-2 gap-2">
                  {group.permissions.map(p => {
                    const effective = isPermissionEffective(p.key, selectedType, overrides);
                    const overridden = p.key in overrides;
                    return (
                      <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={effective} onChange={() => toggle(p.key)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className={effective ? 'text-gray-700' : 'text-gray-400'}>{p.label}</span>
                        {overridden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">override</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={saving} onClick={save} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}