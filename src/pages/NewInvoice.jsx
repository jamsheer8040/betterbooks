import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Trash2, Save, FileText, CreditCard, Loader2 } from 'lucide-react';
import PaymentModal from '@/components/PaymentModal';
import InvoicePresentationOptions from '@/components/InvoicePresentationOptions';
import { recordInvoiceCreated } from '@/utils/ledger';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function computeLineTotal(item, taxEnabled = true) {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unit_price) || 0;
  const discount = parseFloat(item.discount) || 0;
  const taxRate = taxEnabled ? (parseFloat(item.tax_rate) || 0) : 0;
  const net = qty * price - discount;
  return parseFloat((net * (1 + taxRate / 100)).toFixed(2));
}

const EMPTY_ITEM = { item_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 5, amount: 0 };

export default function NewInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);

  const [form, setForm] = useState({
    invoice_number: generateInvoiceNumber(),
    invoice_date: today,
    due_date: dueDate.toISOString().split('T')[0],
    customer_id: '',
    customer_reference: '',
    custom_field_1: '',
    custom_field_2: '',
    display_options: { logo: true, bank: true, terms: true, custom_1: true, custom_2: true },
    notes: '',
    line_items: [{ ...EMPTY_ITEM }],
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Customer.filter({ status: 'active' }),
      base44.entities.ProductService.filter({ status: 'active' }),
      base44.entities.CompanySettings.list(),
    ]).then(([c, p, settings]) => {
      const companySettings = settings[0] || { vat_enabled: false, vat_rate: 5 };
      setCustomers(c); setProducts(p); setCompany(companySettings);
      setForm(f => ({ ...f, line_items: f.line_items.map(item => ({ ...item, tax_rate: companySettings.vat_enabled ? (companySettings.vat_rate || 5) : 0 })) }));
      setLoading(false);
    });
  }, []);

  const vatEnabled = company?.vat_enabled === true;
  const vatRate = company?.vat_rate ?? 5;

  const selectProduct = (idx, productId) => {
    const p = products.find(p => p.id === productId);
    setForm(f => ({
      ...f,
      line_items: f.line_items.map((item, i) => {
        if (i !== idx) return item;
        if (!p) return { ...item, product_id: '' };
        const updated = {
          ...item,
          product_id: p.id,
          item_name: p.name,
          description: p.description || p.name,
          unit_price: p.default_price || 0,
          tax_rate: vatEnabled ? (p.tax_rate ?? vatRate) : 0,
        };
        updated.amount = computeLineTotal(updated, vatEnabled);
        return updated;
      }),
    }));
  };

  const setItem = (idx, field, val) => {
    setForm(f => ({
      ...f,
      line_items: f.line_items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        if (field === 'item_name') updated.description = val;
        if (!vatEnabled) updated.tax_rate = 0;
        updated.amount = computeLineTotal(updated, vatEnabled);
        return updated;
      }),
    }));
  };

  const addItem = () => setForm(f => ({ ...f, line_items: [...f.line_items, { ...EMPTY_ITEM, tax_rate: vatEnabled ? vatRate : 0 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));

  const subtotal = form.line_items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const discountTotal = form.line_items.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0);
  const taxTotal = vatEnabled ? form.line_items.reduce((s, i) => {
    const net = (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0) - (parseFloat(i.discount) || 0);
    return s + net * (parseFloat(i.tax_rate) || 0) / 100;
  }, 0) : 0;
  const grandTotal = parseFloat((subtotal - discountTotal + taxTotal).toFixed(2));

  const handleCustomerChange = (id) => {
    const c = customers.find(c => c.id === id);
    setForm(f => ({ ...f, customer_id: id, customer_name: c?.name || '', customer_trn: c?.trn || '', customer_address: c?.address || '' }));
  };

  const buildInvoiceData = (status) => ({
    ...form,
    type: 'vat_invoice',
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount_total: parseFloat(discountTotal.toFixed(2)),
    tax_total: parseFloat(taxTotal.toFixed(2)),
    vat_amount: parseFloat(taxTotal.toFixed(2)),
    total: grandTotal,
    status,
    line_items: form.line_items.map(i => ({ ...i, tax_rate: vatEnabled ? i.tax_rate : 0, amount: computeLineTotal(i, vatEnabled) })), 
  });

  const saveInvoice = async (status) => {
    if (!form.customer_id) { alert('Please select a customer'); return null; }
    if (form.line_items.length === 0 || form.line_items.every(i => !i.item_name)) { alert('Please add at least one item'); return null; }
    if (grandTotal <= 0) { alert('An invoice cannot be created with a zero amount. Total must be greater than AED 0.00.'); return null; }
    setSaving(true);
    const inv = await base44.entities.Invoice.create(buildInvoiceData(status));
    if (status === 'credit') await recordInvoiceCreated(inv);
    setSaving(false);
    return inv;
  };

  const handleSaveDraft = async () => { const inv = await saveInvoice('draft'); if (inv) navigate(`/invoices/${inv.id}`); };
  const handleSaveCredit = async () => { const inv = await saveInvoice('credit'); if (inv) navigate(`/invoices/${inv.id}`); };
  const handleMarkAsPaid = async () => {
    const inv = await saveInvoice('credit');
    if (inv) { setSavedInvoice(inv); setShowPayment(true); }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link to="/invoices" className="hover:text-blue-600 transition-colors flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Invoices</Link>
        <span>/</span><span className="text-gray-700 font-medium">New Invoice</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Create Invoice</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)}>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Ref (optional)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_reference} onChange={e => setForm(f => ({ ...f, customer_reference: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Items</h2>
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-3.5 h-3.5" /> Add Item</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 w-44">Product / Service</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500">Item</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-16">Qty</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-24">Unit Price</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-20">Discount</th>
                {vatEnabled && <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-16">VAT%</th>}
                <th className="text-right px-2 py-2 text-xs font-semibold text-gray-500 w-24">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {form.line_items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="px-2 py-1.5">
                    <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)}>
                      <option value="">Select / custom...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.primary_type ? ` (${p.primary_type})` : ''}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Item name" value={item.item_name} onChange={e => setItem(idx, 'item_name', e.target.value)} /></td>
                  <td className="px-2 py-1.5"><input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Description" value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} /></td>
                  <td className="px-2 py-1.5"><input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} /></td>
                  <td className="px-2 py-1.5"><input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" value={item.unit_price} onChange={e => setItem(idx, 'unit_price', e.target.value)} /></td>
                  <td className="px-2 py-1.5"><input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" value={item.discount} onChange={e => setItem(idx, 'discount', e.target.value)} /></td>
                  {vatEnabled && <td className="px-2 py-1.5"><select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right bg-white" value={item.tax_rate} onChange={e => setItem(idx, 'tax_rate', e.target.value)}><option value={vatRate}>VAT {vatRate}%</option><option value="0">0%</option></select></td>}
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-900 text-sm">{fmt(computeLineTotal(item, vatEnabled))}</td>
                  <td className="px-2 py-1.5">{form.line_items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mt-4">
          <div className="w-full sm:w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>AED {fmt(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span className="text-red-500">- AED {fmt(discountTotal)}</span></div>
            {vatEnabled && <div className="flex justify-between text-sm text-gray-600"><span>VAT</span><span>AED {fmt(taxTotal)}</span></div>}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Grand Total</span><span className="text-blue-600">AED {fmt(grandTotal)}</span></div>
          </div>
        </div>
      </div>

      <InvoicePresentationOptions form={form} setForm={setForm} company={company} />

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Link to="/invoices" className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</Link>
        <button onClick={handleSaveDraft} disabled={saving} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save as Draft
        </button>
        <button onClick={handleSaveCredit} disabled={saving} className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Save as Credit
        </button>
        <button onClick={handleMarkAsPaid} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Mark as Paid
        </button>
      </div>

      {showPayment && savedInvoice && (
        <PaymentModal invoice={savedInvoice} mode="quick" onPaid={() => navigate(`/invoices/${savedInvoice.id}`)} onClose={() => navigate(`/invoices/${savedInvoice.id}`)} />
      )}
    </div>
  );
}