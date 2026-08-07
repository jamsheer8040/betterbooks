import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, Plus, ChevronRight, Users, UserCheck, UserX, RefreshCw } from 'lucide-react';
import CustomerModal from '@/components/CustomerModal';

const CYCLE_SHORT = {
  'Jan-Apr-Jul-Oct': 'Jan/Apr/Jul/Oct',
  'Feb-May-Aug-Nov': 'Feb/May/Aug/Nov',
  'Mar-Jun-Sep-Dec': 'Mar/Jun/Sep/Dec',
};

const CYCLE_COLORS = {
  'Jan-Apr-Jul-Oct': 'bg-violet-50 text-violet-700 border-violet-200',
  'Feb-May-Aug-Nov': 'bg-sky-50 text-sky-700 border-sky-200',
  'Mar-Jun-Sep-Dec': 'bg-amber-50 text-amber-700 border-amber-200',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Customer.list('-created_date', 200),
      base44.entities.Agent.filter({ status: 'active' }),
    ]).then(([customerData, agentData]) => {
      setCustomers(customerData);
      setAgents(agentData);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name?.toLowerCase().includes(q) || c.trn?.toLowerCase().includes(q) || c.contact_person?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchCycle = cycleFilter === 'all' || c.filing_cycle === cycleFilter;
    return matchSearch && matchStatus && matchCycle;
  });

  const active = customers.filter(c => c.status === 'active').length;
  const inactive = customers.filter(c => c.status !== 'active').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your VAT filing clients</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Total Customers" value={customers.length} color="bg-blue-50 text-blue-600" />
        <StatCard icon={UserCheck} label="Active" value={active} color="bg-green-50 text-green-600" />
        <StatCard icon={UserX} label="Inactive" value={inactive} color="bg-gray-100 text-gray-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, TRN, contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={cycleFilter} onChange={e => setCycleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
          <option value="all">All Cycles</option>
          <option value="Jan-Apr-Jul-Oct">Jan · Apr · Jul · Oct</option>
          <option value="Feb-May-Aug-Nov">Feb · May · Aug · Nov</option>
          <option value="Mar-Jun-Sep-Dec">Mar · Jun · Sep · Dec</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-3">Company</div>
          <div className="col-span-2">TRN</div>
          <div className="col-span-2">Contact</div>
          <div className="col-span-3">Filing Cycle</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No customers found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(customer => (
              <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-blue-50/50 transition-colors group"
              >
              {/* Company */}
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {customer.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{customer.name}</p>
                    {customer.address && <p className="text-xs text-gray-400 truncate mt-0.5">{customer.address}</p>}
                  </div>
                </div>

                {/* TRN */}
                <div className="col-span-2">
                  {customer.trn ? (
                    <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{customer.trn}</span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>

                {/* Contact */}
                <div className="col-span-2 min-w-0">
                  {customer.contact_person ? (
                    <p className="text-sm text-gray-700 truncate">{customer.contact_person}</p>
                  ) : null}
                  {customer.mobile ? (
                    <p className="text-xs text-gray-400 truncate">{customer.mobile}</p>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>

                {/* Filing Cycle */}
                <div className="col-span-3">
                  {customer.filing_cycle ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${CYCLE_COLORS[customer.filing_cycle] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {CYCLE_SHORT[customer.filing_cycle] || customer.filing_cycle}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {customer.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
            Showing {filtered.length} of {customers.length} customers
          </div>
        )}
      </div>

      {modalOpen && (
        <CustomerModal
          customer={null}
          agents={agents}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}