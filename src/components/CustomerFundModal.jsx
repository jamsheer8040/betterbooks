import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Coins, Loader2, Wallet } from 'lucide-react';
import { recordFundDeposit } from '@/utils/ledger';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerFundModal({ customer, onClose, onSaved }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    amount: '',
    payment_date: today,
    wallet_id: '',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    base44.entities.Wallet.filter({ status: 'active' }).then(w => {
      setWallets(w);
      setForm(f => ({ ...f, wallet_id: w[0]?.id || '' }));
      setLoading(false);
    });
  }, []);

  const handleWalletChange = (id) => {
    const w = wallets.find(w => w.id === id);
    setForm(f => ({ ...f, wallet_id: id, wallet_name: w?.name || '' }));
  };

  const handleSave = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { alert('Please enter a valid amount'); return; }
    if (!form.wallet_id) { alert('Please select a wallet'); return; }
    setSaving(true);
    try {
      const wallet = wallets.find(w => w.id === form.wallet_id);
      const fund = await base44.entities.CustomerFund.create({
        customer_id: customer.id,
        customer_name: customer.name,
        amount: amt,
        remaining_balance: amt,
        payment_date: form.payment_date,
        wallet_id: form.wallet_id,
        wallet_name: wallet?.name || '',
        reference_number: form.reference_number,
        notes: form.notes,
      });
      // Update wallet balance
      if (wallet) {
        await base44.entities.Wallet.update(form.wallet_id, { balance: (wallet.balance || 0) + amt });
      }
      // Create ledger entry
      await recordFundDeposit(fund);
      setSaving(false);
      onSaved();
    } catch (e) {
      setSaving(false);
      alert('Failed to save fund: ' + e.message);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center"><Coins className="w-4.5 h-4.5 text-amber-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Customer Fund</h2>
              <p className="text-xs text-gray-500 mt-0.5">{customer?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            Customer advance funds are stored as a liability. They can be adjusted against invoices later.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">AED</span>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5"><span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Receive into Wallet *</span></label>
            {wallets.length === 0 ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">No active wallets found.</div>
            ) : (
              <select value={form.wallet_id} onChange={e => handleWalletChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}{w.bank_name ? ` — ${w.bank_name}` : ''} (Bal: AED {fmt(w.balance)})</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
            <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference Number</label>
            <input type="text" value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Optional" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-14 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Optional" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Add Fund'}
          </button>
        </div>
      </div>
    </div>
  );
}