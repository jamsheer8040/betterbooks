import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Download, Pencil, Share2, Settings, Plus, Trash2, CheckCircle2, CreditCard, XCircle, Copy, Receipt, Coins } from 'lucide-react';
import { downloadInvoicePDF } from '@/utils/invoiceTemplates';
import PaymentModal from '@/components/PaymentModal';
import { recordInvoiceCancelled } from '@/utils/ledger';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };

const TEMPLATES = [
  { key: 'standard', label: 'Standard', desc: 'Clean professional with VAT summary' },
  { key: 'detailed', label: 'Detailed', desc: 'Dark header with full breakdown' },
  { key: 'modern', label: 'Modern', desc: 'Fresh green accent style' },
];

const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  credit: { label: 'Credit', cls: 'bg-blue-100 text-blue-700' },
  partially_paid: { label: 'Partially Paid', cls: 'bg-orange-100 text-orange-700' },
  paid: { label: 'Paid', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  sent: { label: 'Credit', cls: 'bg-blue-100 text-blue-700' },
};

function computeLineTotal(item, taxEnabled = true) {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unit_price) || 0;
  const discount = parseFloat(item.discount) || 0;
  const taxRate = taxEnabled ? (parseFloat(item.tax_rate) || 0) : 0;
  const net = qty * price - discount;
  return parseFloat((net * (1 + taxRate / 100)).toFixed(2));
}

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState('add');
  const [template, setTemplate] = useState(() => localStorage.getItem('invoiceTemplate') || 'standard');
  const [showTemplates, setShowTemplates] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const load = async () => {
    const [inv, comp, pays, legacy] = await Promise.all([
      base44.entities.Invoice.filter({ id }),
      base44.entities.CompanySettings.list(),
      base44.entities.Payment.filter({ invoice_id: id }),
      base44.entities.Invoice.filter({ linked_invoice_id: id }),
    ]);
    setInvoice(inv[0] || null);
    setCompany(comp?.[0] || null);
    setPayments([...pays, ...legacy.map(r => ({ id: r.id, _legacy: true, amount: r.total, payment_date: r.invoice_date, payment_method: '—', wallet_name: r.wallet_name, reference_number: r.invoice_number, from_fund: false }))]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const isReceipt = invoice?.type === 'service_receipt';
  const taxEnabled = company?.vat_enabled === true;
  const vatRate = company?.vat_rate ?? 5;
  const isCancelled = invoice?.status === 'cancelled';
  const statusKey = invoice?.status === 'sent' ? 'credit' : invoice?.status;
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = Math.max(0, (invoice?.total || 0) - totalPaid);
  const fullyPaid = totalPaid >= (invoice?.total || 0) - 0.01;

  const canCancel = invoice && !isCancelled && !isReceipt;
  const canEdit = invoice && !isCancelled;

  const startEdit = () => {
    setForm({
      ...invoice,
      line_items: (invoice.line_items || []).map(i => ({
        item_name: i.item_name || i.description || '',
        description: i.description || i.item_name || '',
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price ?? i.amount ?? 0,
        discount: i.discount ?? 0,
        tax_rate: taxEnabled ? (i.tax_rate ?? 0) : 0,
        amount: i.amount ?? 0,
      })),
    });
    setEditing(true);
  };

  const setItem = (idx, field, val) => setForm(f => ({
    ...f,
    line_items: f.line_items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      if (field === 'item_name') updated.description = val;
      if (!taxEnabled) updated.tax_rate = 0;
      updated.amount = computeLineTotal(updated, taxEnabled);
      return updated;
    }),
  }));

  const editSubtotal = form ? form.line_items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0) : 0;
  const editDiscount = form ? form.line_items.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0) : 0;
  const editTax = taxEnabled && form ? form.line_items.reduce((s, i) => {
    const net = (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0) - (parseFloat(i.discount) || 0);
    return s + net * (parseFloat(i.tax_rate) || 0) / 100;
  }, 0) : 0;
  const editTotal = parseFloat((editSubtotal - editDiscount + editTax).toFixed(2));

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.Invoice.update(invoice.id, {
      ...form,
      subtotal: parseFloat(editSubtotal.toFixed(2)),
      discount_total: parseFloat(editDiscount.toFixed(2)),
      tax_total: parseFloat(editTax.toFixed(2)),
      vat_amount: parseFloat(editTax.toFixed(2)),
      total: editTotal,
      line_items: form.line_items.map(i => ({ ...i, tax_rate: taxEnabled ? i.tax_rate : 0, amount: computeLineTotal(i, taxEnabled) })), 
    });
    setInvoice(updated);
    setEditing(false);
    setSaving(false);
  };

  const selectTemplate = (key) => { setTemplate(key); localStorage.setItem('invoiceTemplate', key); setShowTemplates(false); };
  const handleDownload = () => downloadInvoicePDF(invoice, company, template);
  const handleShare = () => {
    const text = `${isReceipt ? 'Receipt' : 'Invoice'} ${invoice.invoice_number}%0A${invoice.customer_name}%0ATotal: AED ${fmt(invoice.total)}`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCancel = async () => {
    setCancelling(true);
    await base44.entities.Invoice.update(invoice.id, { status: 'cancelled', cancellation_reason: cancelReason || 'No reason provided' });
    await recordInvoiceCancelled({ ...invoice, status: 'cancelled' });
    setCancelling(false);
    setCancelDialog(false);
    load();
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    const dup = await base44.entities.Invoice.create({
      invoice_number: generateInvoiceNumber(),
      type: invoice.type,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      customer_trn: invoice.customer_trn || '',
      customer_address: invoice.customer_address || '',
      customer_reference: invoice.customer_reference || '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      line_items: invoice.line_items || [],
      subtotal: invoice.subtotal || 0,
      discount_total: invoice.discount_total || 0,
      tax_total: invoice.tax_total || 0,
      vat_amount: invoice.vat_amount || 0,
      total: invoice.total || 0,
      notes: invoice.notes || '',
      status: 'draft',
    });
    setDuplicating(false);
    navigate(`/invoices/${dup.id}`);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!invoice) return <div className="text-center py-20 text-gray-400">Invoice not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link to="/invoices" className="hover:text-blue-600 transition-colors flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Invoices</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium font-mono text-xs">{invoice.invoice_number}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{isReceipt ? 'Payment Receipt' : taxEnabled ? 'Tax Invoice' : 'Invoice'}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${invoice.type === 'service_receipt' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{isReceipt ? 'Receipt' : 'Invoice'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>{statusCfg.label}</span>
            </div>
            <p className="text-sm text-gray-500">{invoice.customer_name} · {invoice.month_key || formatDate(invoice.invoice_date)}</p>
            {isCancelled && invoice.cancellation_reason && (
              <p className="text-xs text-red-500 mt-1">Cancelled: {invoice.cancellation_reason}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button onClick={() => setShowTemplates(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                <Settings className="w-3.5 h-3.5" />{TEMPLATES.find(t => t.key === template)?.label || 'Standard'}
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-10">
                  <div className="px-3 py-2 border-b border-gray-100"><p className="text-xs font-semibold text-gray-700">Invoice Template</p></div>
                  {TEMPLATES.map(t => (
                    <button key={t.key} onClick={() => selectTemplate(t.key)} className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${template === t.key ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center justify-between"><span className={`text-sm font-medium ${template === t.key ? 'text-blue-700' : 'text-gray-800'}`}>{t.label}</span>{template === t.key && <span className="text-xs text-blue-500">✓</span>}</div>
                      <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-600 rounded-lg text-xs hover:bg-green-50 font-medium transition-colors"><Share2 className="w-3.5 h-3.5" /> Share</button>
            {canEdit && !editing && <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 font-medium transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"><Download className="w-3.5 h-3.5" /> Download</button>
          </div>
        </div>

        {/* Payment section for invoices */}
        {!isReceipt && !isCancelled && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {fullyPaid ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium"><CheckCircle2 className="w-4 h-4" /> Fully paid</div>
                <div className="text-sm text-gray-500">Paid: <span className="font-semibold text-green-600">AED {fmt(totalPaid)}</span></div>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-gray-600">
                  {totalPaid > 0 ? (<>Partially paid: <span className="font-semibold text-green-600">AED {fmt(totalPaid)}</span> of <span className="font-semibold text-gray-900">AED {fmt(invoice.total)}</span></>) : (<>Outstanding: <span className="font-semibold text-gray-900">AED {fmt(invoice.total)}</span></>)}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPaymentMode('add'); setShowPayment(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"><CreditCard className="w-4 h-4" /> Add Payment</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel / Duplicate actions */}
        {!isReceipt && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {canCancel && <button onClick={() => setCancelDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 font-medium transition-colors"><XCircle className="w-3.5 h-3.5" /> Cancel Invoice</button>}
            <button onClick={handleDuplicate} disabled={duplicating} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {!editing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Customer</p>
                <p className="font-semibold text-gray-900">{invoice.customer_name}</p>
                {invoice.customer_trn && <p className="text-xs text-gray-500">TRN: {invoice.customer_trn}</p>}
                {invoice.customer_address && <p className="text-xs text-gray-500">{invoice.customer_address}</p>}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-xs text-gray-400">Invoice #</span><span className="text-xs font-mono text-gray-700">{invoice.invoice_number}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Date</span><span className="text-xs text-gray-700">{formatDate(invoice.invoice_date)}</span></div>
                {invoice.due_date && <div className="flex justify-between"><span className="text-xs text-gray-400">Due Date</span><span className="text-xs text-gray-700">{formatDate(invoice.due_date)}</span></div>}
                {invoice.customer_reference && <div className="flex justify-between"><span className="text-xs text-gray-400">Customer Ref</span><span className="text-xs text-gray-700">{invoice.customer_reference}</span></div>}
                {invoice.wallet_name && <div className="flex justify-between"><span className="text-xs text-gray-400">Wallet</span><span className="text-xs text-gray-700">{invoice.wallet_name}</span></div>}
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex bg-gray-50 px-3 py-2 rounded-t-lg border border-gray-200 text-xs font-semibold text-gray-500">
                <span className="flex-1">Description</span>
                <span className="w-16 text-center">Qty</span>
                <span className="w-24 text-right">Unit Price</span>
                <span className="w-20 text-right">Discount</span>
                {taxEnabled && <span className="w-16 text-right">VAT%</span>}
                <span className="w-28 text-right">Total</span>
              </div>
              <div className="border border-t-0 border-gray-200 rounded-b-lg divide-y divide-gray-100 overflow-x-auto">
                {(invoice.line_items || []).map((item, i) => (
                  <div key={i} className="flex items-center px-3 py-2.5 text-sm min-w-[600px]">
                    <span className="flex-1 text-gray-800">{item.item_name || item.description}</span>
                    <span className="w-16 text-center text-gray-600">{item.quantity ?? 1}</span>
                    <span className="w-24 text-right text-gray-600">{fmt(item.unit_price ?? item.amount)}</span>
                    <span className="w-20 text-right text-gray-600">{fmt(item.discount || 0)}</span>
                    {taxEnabled && <span className="w-16 text-right text-gray-600">{item.tax_rate || 0}%</span>}
                    <span className="w-28 text-right font-medium text-gray-900">AED {fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>AED {fmt(invoice.subtotal)}</span></div>
              {(invoice.discount_total > 0) && <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span className="text-red-500">- AED {fmt(invoice.discount_total)}</span></div>}
              {taxEnabled && (invoice.tax_total > 0 || invoice.vat_amount > 0) && <div className="flex justify-between text-sm text-gray-600"><span>VAT</span><span>AED {fmt(invoice.tax_total || invoice.vat_amount)}</span></div>}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="text-blue-600">AED {fmt(invoice.total)}</span></div>
              {!isReceipt && totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600"><span>Paid</span><span>AED {fmt(totalPaid)}</span></div>
                  <div className="flex justify-between text-sm font-semibold text-orange-600"><span>Balance Due</span><span>AED {fmt(remaining)}</span></div>
                </>
              )}
            </div>

            {invoice.notes && <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600"><span className="font-medium">Notes: </span>{invoice.notes}</div>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Invoice #</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.invoice_number || ''} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label><input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.invoice_date || ''} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label><input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_name || ''} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">TRN</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_trn || ''} onChange={e => setForm(f => ({ ...f, customer_trn: e.target.value }))} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Address</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_address || ''} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Customer Reference</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_reference || ''} onChange={e => setForm(f => ({ ...f, customer_reference: e.target.value }))} /></div>
            </div>

            {/* Line items editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">Line Items</label>
                <button onClick={() => setForm(f => ({ ...f, line_items: [...(f.line_items || []), { item_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: taxEnabled ? vatRate : 0, amount: 0 }] }))} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-3.5 h-3.5" /> Add Item</button>
              </div>
              <div className="space-y-2">
                {(form.line_items || []).map((item, idx) => (
                  <div key={idx} className="flex gap-1.5 items-center flex-wrap">
                    <input className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="Item name" value={item.item_name} onChange={e => setItem(idx, 'item_name', e.target.value)} />
                    <input type="number" className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right" placeholder="Qty" value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} />
                    <input type="number" className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right" placeholder="Price" value={item.unit_price} onChange={e => setItem(idx, 'unit_price', e.target.value)} />
                    <input type="number" className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right" placeholder="Disc" value={item.discount} onChange={e => setItem(idx, 'discount', e.target.value)} />
                    {taxEnabled && <select className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right bg-white" value={item.tax_rate} onChange={e => setItem(idx, 'tax_rate', e.target.value)}><option value={vatRate}>VAT {vatRate}%</option><option value="0">0%</option></select>}
                    <span className="w-24 text-right text-sm font-semibold text-gray-900">{fmt(computeLineTotal(item, taxEnabled))}</span>
                    {(form.line_items || []).length > 1 && <button onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>AED {fmt(editSubtotal)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span className="text-red-500">- AED {fmt(editDiscount)}</span></div>
              {taxEnabled && <div className="flex justify-between text-sm text-gray-600"><span>VAT</span><span>AED {fmt(editTax)}</span></div>}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="text-blue-600">AED {fmt(editTotal)}</span></div>
            </div>

            <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      {!isReceipt && payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-800">Payment History</h2>
            <span className="ml-auto text-xs text-gray-400">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {p.from_fund ? <Coins className="w-4 h-4 text-amber-600" /> : <CreditCard className="w-4 h-4 text-green-600" />}
                  <div>
                    <div className="text-sm font-medium text-gray-800">AED {fmt(p.amount)}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(p.payment_date)} · {p.from_fund ? 'From Fund' : p.payment_method?.replace('_', ' ') || '—'}
                      {p.wallet_name && ` · ${p.wallet_name}`}
                      {p.reference_number && ` · Ref: ${p.reference_number}`}
                    </div>
                  </div>
                </div>
                {p._legacy && <Link to={`/invoices/${p.id}`} className="text-xs text-blue-600 hover:underline">View Receipt</Link>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      {cancelDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><XCircle className="w-4.5 h-4.5 text-red-600" /></div>
              <h2 className="text-base font-semibold text-gray-900">Cancel Invoice</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">This invoice will be marked as cancelled. It will remain visible in history with all payment records preserved.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Cancellation reason..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-red-400" />
            <div className="flex gap-2">
              <button onClick={() => { setCancelDialog(false); setCancelReason(''); }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{cancelling ? 'Cancelling…' : 'Confirm Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentModal invoice={invoice} mode={paymentMode} onPaid={() => { setShowPayment(false); load(); }} onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
}