import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, CreditCard, Loader2, Wallet, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { recordPayment, recordFundAdjustment } from '@/utils/ledger';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function PaymentModal({ invoice, mode = 'add', onPaid, onClose }) {
  const isQuick = mode === 'quick';
  const [wallets, setWallets] = useState([]);
  const [funds, setFunds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('full');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [walletId, setWalletId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [useFund, setUseFund] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.Wallet.filter({ status: 'active' }),
      base44.entities.CustomerFund.filter({ customer_id: invoice.customer_id }),
      base44.entities.Payment.filter({ invoice_id: invoice.id }),
      base44.entities.Invoice.filter({ linked_invoice_id: invoice.id }),
    ]).then(([w, f, p, legacy]) => {
      setWallets(w);
      setFunds(f.filter(fund => (fund.remaining_balance || 0) > 0));
      setPayments([...p, ...legacy.map(r => ({ id: r.id, amount: r.total, payment_date: r.invoice_date, wallet_name: r.wallet_name, reference_number: '', from_fund: false, _legacy: true }))]);
      setWalletId(w[0]?.id || '');
      setLoading(false);
    });
  }, [invoice.id, invoice.customer_id]);

  const invoiceTotal = invoice.total || 0;
  const alreadyPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = Math.max(0, invoiceTotal - alreadyPaid);
  const fundBalance = funds.reduce((s, f) => s + (f.remaining_balance || 0), 0);

  const effectiveAmount = useFund
    ? (parseFloat(fundAmount) || 0)
    : isQuick
      ? remaining
      : payMode === 'full'
        ? remaining
        : (parseFloat(amount) || 0);

  const exceedsRemaining = effectiveAmount > remaining + 0.001;
  const exceedsFund = useFund && effectiveAmount > fundBalance + 0.001;
  const isValid = effectiveAmount > 0 && !exceedsRemaining && !exceedsFund && (useFund || walletId);

  const handlePayModeChange = (m) => {
    setPayMode(m);
    if (m === 'full') setAmount(remaining.toFixed(2));
  };

  const handleFundToggle = () => {
    setUseFund(!useFund);
    if (!useFund) { setFundAmount(remaining > fundBalance ? fundBalance.toFixed(2) : remaining.toFixed(2)); }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      if (useFund) {
        // Deduct from customer funds (FIFO)
        let toDeduct = effectiveAmount;
        const sortedFunds = [...funds].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
        for (const fund of sortedFunds) {
          if (toDeduct <= 0) break;
          const deduct = Math.min(toDeduct, fund.remaining_balance || 0);
          await base44.entities.CustomerFund.update(fund.id, { remaining_balance: (fund.remaining_balance || 0) - deduct });
          toDeduct -= deduct;
        }
        const payment = await base44.entities.Payment.create({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          amount: effectiveAmount,
          payment_date: paymentDate,
          payment_method: 'other',
          reference_number: referenceNumber || 'Fund adjustment',
          notes: notes || 'Paid from customer fund',
          from_fund: true,
        });
        await recordFundAdjustment(invoice.customer_id, invoice.customer_name, invoice, effectiveAmount);
        await recordPayment(payment, invoice);
      } else {
        const wallet = wallets.find(w => w.id === walletId);
        const payment = await base44.entities.Payment.create({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          amount: effectiveAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          wallet_id: walletId,
          wallet_name: wallet?.name || '',
          reference_number: referenceNumber,
          notes,
          from_fund: false,
        });
        if (wallet) {
          await base44.entities.Wallet.update(walletId, { balance: (wallet.balance || 0) + effectiveAmount });
        }
        await recordPayment(payment, invoice);
      }

      // Update invoice status
      const newPaidTotal = alreadyPaid + effectiveAmount;
      const newStatus = newPaidTotal >= invoiceTotal - 0.01 ? 'paid' : 'partially_paid';
      await base44.entities.Invoice.update(invoice.id, { status: newStatus });

      setSaving(false);
      onPaid();
    } catch (e) {
      setSaving(false);
      alert('Failed to process payment: ' + e.message);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
  );

  const noWallets = wallets.length === 0 && !useFund;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><CreditCard className="w-4.5 h-4.5 text-green-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Payment</h2>
              <p className="text-xs text-gray-500 mt-0.5">{invoice.invoice_number} · {invoice.customer_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Invoice summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Invoice Total</span><span className="font-semibold text-gray-900">AED {fmt(invoiceTotal)}</span></div>
            {alreadyPaid > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Already Paid</span><span className="font-semibold text-green-600">AED {fmt(alreadyPaid)}</span></div>}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200"><span className="text-gray-700">Remaining</span><span className="text-blue-600">AED {fmt(remaining)}</span></div>
          </div>

          {remaining <= 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="w-4 h-4" /> This invoice is fully paid.</div>
          ) : (
            <>
              {/* Use Customer Fund toggle (shows whenever advance funds exist) */}
              {fundBalance > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <button onClick={handleFundToggle} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Use Customer Fund</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors relative ${useFund ? 'bg-amber-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useFund ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  {useFund && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs"><span className="text-amber-700">Available Fund</span><span className="font-bold text-amber-800">AED {fmt(fundBalance)}</span></div>
                      <input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} placeholder="0.00" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      {exceedsFund && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Amount exceeds available fund</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              {!useFund && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Payment Amount</label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 mb-3">
                    <button onClick={() => handlePayModeChange('full')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${payMode === 'full' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Pay Full</button>
                    <button onClick={() => handlePayModeChange('partial')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${payMode === 'partial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Partial</button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">AED</span>
                    <input type="number" disabled={payMode === 'full'} value={payMode === 'full' ? remaining.toFixed(2) : amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={`w-full pl-12 pr-3 py-2.5 border rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-green-500 ${exceedsRemaining ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  </div>
                  {exceedsRemaining && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Exceeds remaining (AED {fmt(remaining)})</p>}
                </div>
              )}

              {/* Wallet selector (hidden when using fund) */}
              {!useFund && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5"><span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Bank / Wallet *</span></label>
                  {noWallets ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">No active wallets found. Please add a wallet first.</div>
                  ) : (
                    <select value={walletId} onChange={e => setWalletId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name}{w.bank_name ? ` — ${w.bank_name}` : ''} (Bal: AED {fmt(w.balance)})</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* Payment Method */}
              {!useFund && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              )}

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference Number</label>
                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="Cheque no., transfer ref, etc." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-14 resize-none focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Optional notes" />
              </div>
            </>
          )}
        </div>

        {remaining > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            {!useFund && wallets.find(w => w.id === walletId) && (
              <div className="flex justify-between text-xs mb-2 text-gray-500">
                <span>New Wallet Balance</span>
                <span className="font-semibold text-gray-700">AED {fmt((wallets.find(w => w.id === walletId)?.balance || 0) + effectiveAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={!isValid || saving || (noWallets && !useFund)} className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Processing…' : `Record AED ${fmt(effectiveAmount)}`}
              </button>
            </div>
          </div>
        )}
        {remaining <= 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}