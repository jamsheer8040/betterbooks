import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Wallet, X, Pencil, Trash2 } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function WalletModal({ wallet, onClose, onSaved }) {
  const [form, setForm] = useState(wallet || { name: '', bank_name: '', account_number: '', iban: '', currency: 'AED', balance: 0, notes: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (wallet?.id) {
      await base44.entities.Wallet.update(wallet.id, form);
    } else {
      await base44.entities.Wallet.create(form);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{wallet ? 'Edit Wallet' : 'Add Wallet'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wallet Name *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Main Business Account" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. Emirates NBD" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option>AED</option><option>USD</option><option>EUR</option><option>GBP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.account_number} onChange={e => set('account_number', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">IBAN</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="AE..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opening Balance</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.balance} onChange={e => set('balance', parseFloat(e.target.value)||0)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalWallet, setModalWallet] = useState(undefined); // undefined=closed, null=new, obj=edit

  const load = () => {
    base44.entities.Wallet.list('-created_date', 100).then(data => {
      setWallets(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this wallet?')) return;
    await base44.entities.Wallet.delete(id);
    load();
  };

  const totalBalance = wallets.filter(w => w.status === 'active').reduce((s, w) => s + (w.balance || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage bank accounts & payment wallets</p>
        </div>
        <button onClick={() => setModalWallet(null)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Wallet
        </button>
      </div>

      {/* Total balance card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 mb-6 text-white">
        <p className="text-blue-200 text-sm">Total Balance (Active Wallets)</p>
        <p className="text-3xl font-bold mt-1">AED {fmt(totalBalance)}</p>
        <p className="text-blue-200 text-xs mt-1">{wallets.filter(w=>w.status==='active').length} active wallet(s)</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : wallets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          No wallets yet. Add your first wallet to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map(w => (
            <div key={w.id} className={`bg-white rounded-xl border p-5 ${w.status === 'inactive' ? 'opacity-60 border-gray-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    {w.bank_name && <p className="text-xs text-gray-500">{w.bank_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setModalWallet(w)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(w.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {w.account_number && <div className="flex justify-between"><span className="text-gray-500">Account</span><span className="font-mono text-gray-700 text-xs">{w.account_number}</span></div>}
                {w.iban && <div className="flex justify-between"><span className="text-gray-500">IBAN</span><span className="font-mono text-gray-700 text-xs">{w.iban}</span></div>}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Balance</span>
                  <span className="font-bold text-gray-900">{w.currency} {fmt(w.balance)}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${w.status==='active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{w.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalWallet !== undefined && (
        <WalletModal
          wallet={modalWallet}
          onClose={() => setModalWallet(undefined)}
          onSaved={() => { setModalWallet(undefined); load(); }}
        />
      )}
    </div>
  );
}