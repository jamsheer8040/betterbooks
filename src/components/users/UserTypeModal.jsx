import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { PERMISSION_GROUPS } from '@/lib/permissions';

const COLORS = ['blue', 'green', 'red', 'purple', 'amber', 'gray'];
const COLOR_CLASSES = {
  blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500',
  purple: 'bg-purple-500', amber: 'bg-amber-500', gray: 'bg-gray-500',
};

export default function UserTypeModal({ userType, onSaved, onClose }) {
  const [name, setName] = useState(userType?.name || '');
  const [description, setDescription] = useState(userType?.description || '');
  const [color, setColor] = useState(userType?.color || 'blue');
  const [permissions, setPermissions] = useState(new Set(userType?.permissions || []));
  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setPermissions(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (group, allOn) => {
    setPermissions(prev => {
      const next = new Set(prev);
      group.permissions.forEach(p => allOn ? next.delete(p.key) : next.add(p.key));
      return next;
    });
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { name: name.trim(), description, color, permissions: [...permissions] };
    const saved = userType?.id
      ? await base44.entities.UserType.update(userType.id, payload)
      : await base44.entities.UserType.create(payload);
    setSaving(false);
    onSaved(saved);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{userType?.id ? 'Edit' : 'New'} User Type</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Accountant" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Color</label>
              <div className="flex gap-2 pt-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full ${COLOR_CLASSES[c]} ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of this role" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-3">
              {PERMISSION_GROUPS.map(group => {
                const allOn = group.permissions.every(p => permissions.has(p.key));
                return (
                  <div key={group.module} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">{group.module}</span>
                      <button onClick={() => toggleGroup(group, allOn)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        {allOn ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.permissions.map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={permissions.has(p.key)} onChange={() => toggle(p.key)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={saving || !name.trim()} onClick={save} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Type'}
          </button>
        </div>
      </div>
    </div>
  );
}