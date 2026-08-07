import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Paperclip, CheckCircle, DollarSign, Download } from 'lucide-react';
import { exportToCSV } from '@/utils/exportToExcel';
import CommissionModal from '@/components/CommissionModal';

const STATUS_STYLES = {
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  released: 'bg-green-100 text-green-700',
};
const STATUS_LABELS = { pending_approval: 'Pending Approval', approved: 'Approved', released: 'Released' };

export default function Commissions() {
  const [commissions, setCommissions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isAdvance, setIsAdvance] = useState(false);

  const load = async () => {
    const [c, a, cu] = await Promise.all([
      base44.entities.Commission.list('-date', 100),
      base44.entities.Agent.list('-name', 100),
      base44.entities.Customer.list('-name', 100),
    ]);
    setCommissions(c); setAgents(a); setCustomers(cu);
  };
  useEffect(() => { load(); }, []);

  const filtered = commissions.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || c.agent_name?.toLowerCase().includes(s) || c.customer_name?.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchAgent = agentFilter === 'all' || c.agent_id === agentFilter;
    const matchCustomer = customerFilter === 'all' || c.customer_id === customerFilter;
    const matchFrom = !dateFrom || c.date >= dateFrom;
    const matchTo = !dateTo || c.date <= dateTo;
    return matchSearch && matchStatus && matchAgent && matchCustomer && matchFrom && matchTo;
  });

  const handleExport = () => {
    const rows = filtered.map(c => ({
      Agent: c.agent_name || '',
      Customer: c.customer_name || '',
      'Amount (AED)': c.amount || 0,
      Status: STATUS_LABELS[c.status] || c.status || '',
      Date: c.date || '',
      'Is Advance': c.is_advance ? 'Yes' : 'No',
      Notes: c.notes || '',
    }));
    exportToCSV(rows, 'commissions.csv');
  };

  const approve = async (id) => {
    await base44.entities.Commission.update(id, { status: 'approved' });
    load();
  };
  const release = async (id) => {
    await base44.entities.Commission.update(id, { status: 'released' });
    load();
  };

  const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-500 text-sm">Manage agent commissions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setIsAdvance(true); setModalOpen(true); }} className="flex items-center gap-2 border border-yellow-400 text-yellow-700 hover:bg-yellow-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <DollarSign className="w-4 h-4" /> Give Advance
          </button>
          <button onClick={() => { setIsAdvance(false); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Commission
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search agent or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="released">Released</option>
        </select>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3 mb-6 text-sm text-gray-600">
        <span>Date from:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span>to:</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Agent</th>
              <th className="text-left px-5 py-3 font-medium">Customer</th>
              <th className="text-right px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-900">{c.agent_name}</td>
                <td className="px-5 py-3.5 text-gray-600">{c.customer_name}</td>
                <td className="px-5 py-3.5 text-right font-medium">AED {fmt(c.amount)}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{formatDate(c.date)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 justify-end">
                    {c.status === 'pending_approval' && (
                      <button onClick={() => approve(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {c.status === 'approved' && (
                      <button onClick={() => release(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-600 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors">
                        <DollarSign className="w-3.5 h-3.5" /> Release
                      </button>
                    )}
                    <button className="text-gray-400 hover:text-gray-600"><Paperclip className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No commissions found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && <CommissionModal isAdvance={isAdvance} agents={agents} customers={customers} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />}
    </div>
  );
}