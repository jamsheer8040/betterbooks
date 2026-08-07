import { useState } from 'react';
import { Eye } from 'lucide-react';
import AgentFilingDetails from '@/components/agent-portal/AgentFilingDetails';

const fmt = value => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AgentFilingsTable({ filings }) {
  const [selected, setSelected] = useState(null);
  return <><div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Period</th><th className="px-5 py-3">Due date</th><th className="px-5 py-3">VAT</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-gray-100">{filings.map(filing => <tr key={filing.id}><td className="px-5 py-4 font-medium text-gray-900">{filing.customer_name}</td><td className="px-5 py-4 text-gray-600">{filing.filing_month}</td><td className="px-5 py-4 text-gray-600">{date(filing.due_date)}</td><td className="px-5 py-4 font-medium text-blue-700">AED {fmt(Math.abs(filing.net_vat_payable))}</td><td className="px-5 py-4"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">{filing.status || 'draft'}</span></td><td className="px-5 py-4"><button onClick={() => setSelected(filing)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"><Eye className="h-3.5 w-3.5" /> View</button></td></tr>)}{!filings.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-400">No filings are available.</td></tr>}</tbody></table></div>{selected && <AgentFilingDetails filing={selected} onClose={() => setSelected(null)} />}</>;
}