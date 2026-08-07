import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Pencil, Trash2, Upload, Download, Share2, Eye, EyeOff, Building2, Phone, Mail, User, FileText, KeyRound, FolderOpen, TrendingUp, ChevronRight, BookOpen, Coins, Plus } from 'lucide-react';
import CustomerModal from '@/components/CustomerModal';
import CustomerFundModal from '@/components/CustomerFundModal';
import CustomerDocuments from '@/components/CustomerDocuments';

function SectionCard({ icon: Icon, title, children, accent = 'blue' }) {
  const accents = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    violet: 'text-violet-600 bg-violet-50',
    amber: 'text-amber-600 bg-amber-50',
    slate: 'text-slate-600 bg-slate-100',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accents[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium sm:w-44 sm:flex-shrink-0 sm:pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 flex-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function FileRow({ label, value, onUpload, uploading }) {
  const handleShare = (url) => {
    if (navigator.share) navigator.share({ url });
    else { navigator.clipboard.writeText(url); alert('Link copied!'); }
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-medium sm:w-44 sm:flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {value ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Uploaded
            </span>
            <a href={value} download target="_blank" rel="noreferrer"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download">
              <Download className="w-3.5 h-3.5" />
            </a>
            <button onClick={() => handleShare(value)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Share link">
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-300 italic">Not uploaded</span>
        )}
        <label className="sm:ml-auto cursor-pointer flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingTrn, setUploadingTrn] = useState(false);
  const [uploadingCorp, setUploadingCorp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [vatHistory, setVatHistory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [funds, setFunds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showFundModal, setShowFundModal] = useState(false);

  const load = async () => {
    const [data, filings, invs, fnds, pays] = await Promise.all([
      base44.entities.Customer.filter({ id }),
      base44.entities.Filing.filter({ customer_id: id }, '-period_start', 5),
      base44.entities.Invoice.filter({ customer_id: id }, '-invoice_date', 100),
      base44.entities.CustomerFund.filter({ customer_id: id }),
      base44.entities.Payment.filter({ customer_id: id }),
    ]);
    setCustomer(data[0] || null);
    setVatHistory(filings);
    setInvoices(invs);
    setFunds(fnds);
    setPayments(pays);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const uploadFile = (field, setUploading) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Customer.update(id, { [field]: file_url });
    setUploading(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    await base44.entities.Customer.delete(id);
    navigate('/customers');
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!customer) return <div className="text-center py-20 text-gray-400">Customer not found</div>;

  const cycleDisplay = (c) => ({
    'Jan-Apr-Jul-Oct': 'Jan · Apr · Jul · Oct',
    'Feb-May-Aug-Nov': 'Feb · May · Aug · Nov',
    'Mar-Jun-Sep-Dec': 'Mar · Jun · Sep · Dec'
  })[c] || c;

  const CYCLE_COLORS = {
    'Jan-Apr-Jul-Oct': 'bg-violet-50 text-violet-700 border border-violet-200',
    'Feb-May-Aug-Nov': 'bg-sky-50 text-sky-700 border border-sky-200',
    'Mar-Jun-Sep-Dec': 'bg-amber-50 text-amber-700 border border-amber-200',
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link to="/customers" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Customers
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{customer.name}</span>
      </div>

      {/* Hero Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-sm flex-shrink-0">
              {customer.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {customer.status === 'active' ? '● Active' : '○ Inactive'}
                </span>
                {customer.filing_cycle && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CYCLE_COLORS[customer.filing_cycle] || ''}`}>
                    {cycleDisplay(customer.filing_cycle)}
                  </span>
                )}
                {customer.trn && (
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    TRN: {customer.trn}
                  </span>
                )}
              </div>
              {customer.address && (
                <p className="text-xs text-gray-400 mt-1.5">{customer.address}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 font-medium transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {(() => {
        const fundBalance = funds.reduce((s, f) => s + (f.remaining_balance || 0), 0);
        const totalInvoiced = invoices.filter(i => i.type === 'vat_invoice' && ['credit', 'partially_paid', 'paid', 'sent'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
        const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0) + invoices.filter(i => i.type === 'service_receipt').reduce((s, i) => s + (i.total || 0), 0);
        const outstanding = Math.max(0, totalInvoiced - totalPaid);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-amber-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><Coins className="w-3.5 h-3.5 text-amber-600" /></div><span className="text-xs font-medium text-gray-500">Fund Balance</span></div>
                <button onClick={() => setShowFundModal(true)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"><Plus className="w-3 h-3" /> Add Fund</button>
              </div>
              <p className="text-lg font-bold text-amber-700">AED {fmt(fundBalance)}</p>
            </div>
            <div className="bg-white rounded-xl border border-orange-200 p-4">
              <div className="flex items-center gap-2 mb-1"><div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-orange-600" /></div><span className="text-xs font-medium text-gray-500">Total Outstanding</span></div>
              <p className="text-lg font-bold text-orange-600">AED {fmt(outstanding)}</p>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-1"><div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-green-600" /></div><span className="text-xs font-medium text-gray-500">Available Credit</span></div>
              <p className="text-lg font-bold text-green-600">AED {fmt(fundBalance)}</p>
            </div>
          </div>
        );
      })()}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Tax Numbers */}
        <SectionCard icon={FileText} title="Tax & Registration" accent="violet">
          <InfoRow label="TRN Number" value={customer.trn} mono />
          <FileRow
            label="TRN Document"
            value={customer.trn_file_url}
            onUpload={uploadFile('trn_file_url', setUploadingTrn)}
            uploading={uploadingTrn}
          />
          <InfoRow label="Corporate Tax No." value={customer.corporate_tax_number} mono />
          <FileRow
            label="Corporate Tax Doc."
            value={customer.corporate_tax_file_url}
            onUpload={uploadFile('corporate_tax_file_url', setUploadingCorp)}
            uploading={uploadingCorp}
          />
        </SectionCard>

        {/* Contact */}
        <SectionCard icon={User} title="Contact Details" accent="green">
          <InfoRow label="Contact Person" value={customer.contact_person} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Mobile" value={customer.mobile} />
          <InfoRow label="WhatsApp" value={customer.whatsapp_number} />
        </SectionCard>

        {/* Login Credentials */}
        <SectionCard icon={KeyRound} title="Login Credentials" accent="amber">
          <InfoRow label="Username" value={customer.login_username} />
          {customer.login_password ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 font-medium sm:w-44 sm:flex-shrink-0">Password</span>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-mono text-gray-800">
                  {showPassword ? customer.login_password : '••••••••••'}
                </span>
                <button onClick={() => setShowPassword(p => !p)} className="text-gray-400 hover:text-gray-600 p-1">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : <InfoRow label="Password" value={null} />}
          {!customer.login_username && !customer.login_password && (
            <p className="text-xs text-gray-400 py-2 italic">No credentials saved</p>
          )}
        </SectionCard>

        {/* Notes */}
        {customer.notes && (
          <SectionCard icon={Building2} title="Notes" accent="slate">
            <p className="text-sm text-gray-700 py-2 leading-relaxed">{customer.notes}</p>
          </SectionCard>
        )}
      </div>

      {/* Documents — full width */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
            <FolderOpen className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Documents</h2>
          {customer.documents?.length > 0 && (
            <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {customer.documents.length} file{customer.documents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          <CustomerDocuments customer={customer} onUpdate={load} />
        </div>
      </div>

      {/* VAT History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-5">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">VAT History</h2>
          <span className="ml-auto text-xs text-gray-400">Last {vatHistory.length} filings</span>
        </div>
        {vatHistory.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-5 py-4">No filings found for this customer.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Header */}
            <div className="grid grid-cols-4 gap-3 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div>Month</div>
              <div className="text-right">Sales</div>
              <div className="text-right">Expense</div>
              <div className="text-right">VAT Payable</div>
            </div>
            {vatHistory.map(f => (
              <div key={f.id} className="grid grid-cols-4 gap-3 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                <div className="text-sm font-medium text-gray-800">{f.filing_month}</div>
                <div className="text-sm text-right text-gray-700">AED {fmt(f.sales_amount)}</div>
                <div className="text-sm text-right text-gray-700">AED {fmt(f.expenses_amount)}</div>
                <div className="text-sm text-right font-semibold text-blue-600">AED {fmt(f.net_vat_payable)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100">
          <Link
            to={`/filings?tab=tracker&search=${encodeURIComponent(customer.name)}`}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View full history in Filing Tracker <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Statement */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-5">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Statement</h2>
          <span className="ml-auto text-xs text-gray-400">{invoices.length} transaction{invoices.length !== 1 ? 's' : ''}</span>
        </div>
        {invoices.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-5 py-4">No invoices or receipts found for this customer.</p>
        ) : (() => {
          // Sort by date ascending for running balance
          const sorted = [...invoices].sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date));
          let balance = 0;
          const rows = sorted.map(inv => {
            const isInvoice = inv.type === 'vat_invoice';
            const debit = isInvoice ? (inv.total || 0) : 0;
            const credit = !isInvoice ? (inv.total || 0) : 0;
            balance += debit - credit;
            return { inv, debit, credit, balance };
          });
          const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
          const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
          const outstanding = totalDebit - totalCredit;
          return (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Total Invoiced</div>
                  <div className="text-sm font-bold text-red-600">AED {fmt(totalDebit)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Total Collected</div>
                  <div className="text-sm font-bold text-green-600">AED {fmt(totalCredit)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Outstanding</div>
                  <div className={`text-sm font-bold ${outstanding > 0 ? 'text-orange-600' : 'text-gray-500'}`}>AED {fmt(outstanding)}</div>
                </div>
              </div>
              {/* Table header */}
              <div className="grid grid-cols-6 gap-2 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <div className="col-span-2">Description</div>
                <div className="text-center">Date</div>
                <div className="text-right text-red-500">Debit</div>
                <div className="text-right text-green-600">Credit</div>
                <div className="text-right">Balance</div>
              </div>
              <div className="divide-y divide-gray-50">
                {rows.map(({ inv, debit, credit, balance: bal }) => (
                  <div key={inv.id} className="grid grid-cols-6 gap-2 px-5 py-2.5 items-center hover:bg-gray-50/60 transition-colors">
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-gray-800">{inv.invoice_number || '—'}</div>
                      <div className="text-xs text-gray-400">{inv.type === 'vat_invoice' ? 'Invoice' : 'Receipt'} · {inv.month_key || ''}</div>
                    </div>
                    <div className="text-xs text-center text-gray-500">{inv.invoice_date || '—'}</div>
                    <div className="text-xs text-right font-medium text-red-600">{debit > 0 ? `AED ${fmt(debit)}` : '—'}</div>
                    <div className="text-xs text-right font-medium text-green-600">{credit > 0 ? `AED ${fmt(credit)}` : '—'}</div>
                    <div className={`text-xs text-right font-semibold ${bal > 0 ? 'text-orange-600' : 'text-gray-500'}`}>AED {fmt(bal)}</div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {showFundModal && (
        <CustomerFundModal customer={customer} onClose={() => setShowFundModal(false)} onSaved={() => { setShowFundModal(false); load(); }} />
      )}
      {editing && (
        <CustomerModal
          customer={customer}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </div>
  );
}