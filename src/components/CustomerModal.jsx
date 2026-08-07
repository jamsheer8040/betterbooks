import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

const CYCLES = ['Jan-Apr-Jul-Oct', 'Feb-May-Aug-Nov', 'Mar-Jun-Sep-Dec'];

const field = (label, key, form, set, type = 'text', required = false) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
    <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key] || ''} onChange={e => set(key, e.target.value)} />
  </div>
);

export default function CustomerModal({ customer, agents = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    filing_cycle: customer?.filing_cycle || 'Jan-Apr-Jul-Oct',
    agent_id: customer?.agent_id || '',
    address: customer?.address || '',
    trn: customer?.trn || '',
    trade_license_number: customer?.trade_license_number || '',
    corporate_tax_number: customer?.corporate_tax_number || '',
    contact_person: customer?.contact_person || '',
    email: customer?.email || '',
    mobile: customer?.mobile || '',
    whatsapp_number: customer?.whatsapp_number || '',
    login_username: customer?.login_username || '',
    login_password: customer?.login_password || '',
    status: customer?.status || 'active',
    notes: customer?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    if (customer?.id) {
      await base44.entities.Customer.update(customer.id, form);
    } else {
      await base44.entities.Customer.create(form);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Info</p>
            <div className="space-y-3">
              {field('Company Name', 'name', form, set, 'text', true)}
              {field('Address', 'address', form, set)}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filing Cycle</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.filing_cycle} onChange={e => set('filing_cycle', e.target.value)}>
                    {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Agent</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                  <option value="">No agent assigned</option>
                  {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tax Numbers */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tax Numbers</p>
            <div className="grid grid-cols-2 gap-3">
              {field('Trade License Number', 'trade_license_number', form, set)}
              {field('TRN', 'trn', form, set)}
              {field('Corporate Tax Number', 'corporate_tax_number', form, set)}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</p>
            <div className="space-y-3">
              {field('Contact Person', 'contact_person', form, set)}
              <div className="grid grid-cols-2 gap-3">
                {field('Email', 'email', form, set, 'email')}
                {field('Mobile', 'mobile', form, set, 'tel')}
              </div>
              {field('WhatsApp Number (for reminders)', 'whatsapp_number', form, set, 'tel')}
            </div>
          </div>

          {/* Login Credentials */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Login Credentials</p>
            <div className="grid grid-cols-2 gap-3">
              {field('Username', 'login_username', form, set)}
              {field('Password', 'login_password', form, set, 'text')}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button disabled={saving || !form.name} onClick={save} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}