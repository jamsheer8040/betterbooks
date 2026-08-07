import { X } from 'lucide-react';

const fmt = value => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AgentFilingDetails({ filing, onClose }) {
  const otherExpenses = (filing.other_expenses || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const refundable = (filing.net_vat_payable || 0) < 0;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-8 max-w-3xl rounded-2xl bg-gray-50 shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-white p-5"><div><h2 className="text-xl font-bold text-gray-900">{filing.customer_name}</h2><p className="mt-1 text-sm text-gray-500">{filing.filing_month} · {date(filing.period_start)} – {date(filing.period_end)}</p></div><button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-4 text-sm md:grid-cols-4"><div><p className="text-xs text-gray-400">TRN</p><p className="font-semibold">{filing.customer_trn || '—'}</p></div><div><p className="text-xs text-gray-400">Due date</p><p className="font-semibold">{date(filing.due_date)}</p></div><div><p className="text-xs text-gray-400">Filing date</p><p className="font-semibold">{date(filing.filing_date)}</p></div><div><p className="text-xs text-gray-400">Status</p><p className="font-semibold capitalize">{filing.status || 'draft'}</p></div></div>
          <section className="rounded-xl border border-gray-200 bg-white p-5"><h3 className="mb-4 font-semibold text-gray-900">VAT Summary</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><div className="rounded-lg bg-green-50 p-4"><p className="text-sm font-medium text-gray-700">Sales</p><p className="mt-2 text-sm">Base: <b>AED {fmt(filing.sales_amount)}</b></p><p className="text-sm">VAT: <b>AED {fmt(filing.sales_vat)}</b></p></div><div className="rounded-lg bg-orange-50 p-4"><p className="text-sm font-medium text-gray-700">Expenses</p><p className="mt-2 text-sm">Base: <b>AED {fmt(filing.expenses_amount)}</b></p><p className="text-sm">VAT: <b>AED {fmt(filing.expenses_vat)}</b></p></div></div><div className={`mt-3 flex items-center justify-between rounded-lg p-4 text-white ${refundable ? 'bg-green-600' : 'bg-blue-600'}`}><span className="font-medium">{refundable ? 'Net VAT Refundable' : 'Net VAT Payable'}</span><b>AED {fmt(Math.abs(filing.net_vat_payable || 0))}</b></div></section>
          <section className="rounded-xl border border-gray-200 bg-white p-5"><h3 className="mb-3 font-semibold text-gray-900">Profit & Loss</h3><div className="space-y-2 text-sm"><p className="flex justify-between"><span>Sales</span><b>AED {fmt(filing.sales_amount)}</b></p><p className="flex justify-between"><span>Purchases</span><b>AED {fmt(filing.expenses_amount)}</b></p><p className="flex justify-between"><span>Other expenses</span><b>AED {fmt(otherExpenses)}</b></p><p className="flex justify-between border-t pt-3 text-base"><span className="font-semibold">Net profit</span><b className="text-green-700">AED {fmt(filing.net_profit)}</b></p></div></section>
          {filing.notes && <section className="rounded-xl border border-gray-200 bg-white p-5"><h3 className="mb-2 font-semibold text-gray-900">Notes</h3><p className="text-sm text-gray-600">{filing.notes}</p></section>}
        </div>
      </div>
    </div>
  );
}