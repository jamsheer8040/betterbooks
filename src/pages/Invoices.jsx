import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Eye, MessageCircle, Download, Receipt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DateRangeFilter from '@/components/DateRangeFilter';
import { resolveDateRange } from '@/utils/dateRangePresets';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';
import ReceiptModal from '@/components/ReceiptModal';
import { downloadInvoicePDF } from '@/utils/invoiceTemplates';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };

const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  credit: { label: 'Credit', cls: 'bg-blue-100 text-blue-700' },
  partially_paid: { label: 'Partial', cls: 'bg-orange-100 text-orange-700' },
  paid: { label: 'Paid', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  sent: { label: 'Credit', cls: 'bg-blue-100 text-blue-700' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'credit', label: 'Credit' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ preset: 'all', start: '', end: '' });
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const load = () => {
    base44.entities.Invoice.list('-created_date', 500).then(inv => {
      setInvoices(inv);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    base44.entities.CompanySettings.list().then(c => setCompany(c?.[0] || null));
    base44.entities.Wallet.filter({ status: 'active' }).then(w => setWallets(w));
  }, []);

  const template = localStorage.getItem('invoiceTemplate') || 'standard';

  const handleShare = async (inv) => {
    const text = encodeURIComponent(`Dear ${inv.customer_name}, please find the Invoice ${inv.invoice_number} for your reference.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    const updated = await base44.entities.Invoice.update(inv.id, { whatsapp_share_count: (inv.whatsapp_share_count || 0) + 1 });
    setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.customer_name?.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || inv.type === typeFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter || (statusFilter === 'credit' && inv.status === 'sent');
    const range = resolveDateRange(dateRange);
    const matchDate = !range || (inv.invoice_date && new Date(inv.invoice_date) >= range.start && new Date(inv.invoice_date) <= range.end);
    return matchSearch && matchType && matchStatus && matchDate;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Receipts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{invoices.length} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReceiptModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Receipt className="w-4 h-4" /> New Receipt
          </button>
          <Link to="/invoices/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search customer or invoice #..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
          <option value="all">All Types</option>
          <option value="vat_invoice">Invoices</option>
          <option value="service_receipt">Receipts</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-2">Invoice #</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Month</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No records found</div>
          ) : filtered.map(inv => {
            const isReceipt = inv.type === 'service_receipt';
            const sc = isReceipt
              ? (inv.is_advance ? { label: 'Advance', cls: 'bg-purple-100 text-purple-800 font-semibold' } : { label: 'Collected', cls: 'bg-purple-100 text-purple-700 font-semibold' })
              : (STATUS_CONFIG[inv.status === 'sent' ? 'credit' : inv.status] || STATUS_CONFIG.draft);
            return (
              <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="col-span-2">
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{inv.invoice_number}</span>
                </div>
                <div className="col-span-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${isReceipt ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{isReceipt ? 'Receipt' : 'Invoice'}</span>
                </div>
                <div className="col-span-2 text-sm font-medium text-gray-900 truncate">{inv.customer_name}</div>
                <div className="col-span-1"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span></div>
                <div className="col-span-2 text-xs text-gray-500">{inv.month_key}</div>
                <div className="col-span-1 text-right font-semibold text-gray-900 text-sm">AED {fmt(inv.total)}</div>
                <div className="col-span-3 flex justify-end items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPreviewInvoice(inv)} title="View" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleShare(inv)} title="Share on WhatsApp" className="flex items-center gap-1 p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {inv.whatsapp_share_count > 0 && <span className="text-[10px] font-semibold">{inv.whatsapp_share_count}</span>}
                  </button>
                  <button onClick={() => downloadInvoicePDF(inv, company, template)} title="Download PDF" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          company={company}
          template={template}
          onClose={() => setPreviewInvoice(null)}
          onShare={() => handleShare(previewInvoice)}
        />
      )}

      {showReceiptModal && (
        <ReceiptModal
          wallets={wallets}
          onSaved={() => {
            setShowReceiptModal(false);
            load();
          }}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}