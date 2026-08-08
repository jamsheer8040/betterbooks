import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import InvoicePresentationOptions from '@/components/InvoicePresentationOptions';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
}

async function downloadInvoicePDF(inv, company) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, mL = 15, mR = 195;

  // ── Top accent bar ──────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 3, 'F');

  if (inv.display_options?.logo !== false && company?.logo_url) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise(resolve => { image.onload = resolve; image.onerror = resolve; image.src = company.logo_url; });
    if (image.complete && image.naturalWidth) { try { doc.addImage(image, 165, 7, 30, 18); } catch { } }
  }

  // ── Company name (top-left) ─────────────────────────────────────────────────
  let y = 16;
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(company?.company_name || 'VAT Manager', mL, y);
  y += 6;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  if (company?.address) { doc.text(company.address, mL, y); y += 5; }
  if (company?.phone)   { doc.text(`Tel: ${company.phone}`, mL, y); y += 5; }
  if (company?.email)   { doc.text(company.email, mL, y); y += 5; }
  if (company?.trn)     { doc.text(`TRN: ${company.trn}`, mL, y); y += 5; }

  // ── TAX INVOICE title (top-right) ────────────────────────────────────────────
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', mR, 18, { align: 'right' });
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(`# ${inv.invoice_number || ''}`, mR, 26, { align: 'right' });

  // Balance Due box (top-right)
  const bdy = 30;
  doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, bdy, 65, 18, 2, 2, 'FD');
  doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
  doc.text('Balance Due', 163, bdy + 6, { align: 'center' });
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
  doc.text(`AED ${fmt(inv.total)}`, 163, bdy + 14, { align: 'center' });

  // ── Horizontal divider ───────────────────────────────────────────────────────
  y = Math.max(y, 52) + 4;
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
  doc.line(mL, y, mR, y);
  y += 8;

  // ── Bill To (left) + Invoice meta (right) ────────────────────────────────────
  const metaStartY = y;
  doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
  doc.text('BILL TO', mL, y);
  y += 5;
  doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  const billName = doc.splitTextToSize(inv.customer_name || '', 85);
  doc.text(billName, mL, y); y += billName.length * 5 + 1;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  if (inv.customer_trn)     { doc.text(`TRN: ${inv.customer_trn}`, mL, y); y += 5; }
  if (inv.customer_address) {
    const addrLines = doc.splitTextToSize(inv.customer_address, 85);
    doc.text(addrLines, mL, y); y += addrLines.length * 5;
  }

  // Invoice meta — right column
  const metaX1 = 120, metaX2 = mR;
  let my = metaStartY + 5;
  const metaRows = [
    ['Invoice Date :', inv.invoice_date || '—'],
    ['Terms :', 'Due on Receipt'],
    ['Due Date :', inv.due_date || '—'],
  ];
  metaRows.forEach(([label, val]) => {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text(label, metaX1, my, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(val, metaX2, my, { align: 'right' });
    my += 7;
  });

  // ── Line items table ─────────────────────────────────────────────────────────
  y = Math.max(y, my) + 8;
  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(mL, y, 180, 9, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('#', mL + 3, y + 6.2);
  doc.text('Item & Description', mL + 12, y + 6.2);
  doc.text('Amount (AED)', mR, y + 6.2, { align: 'right' });
  y += 9;

  (inv.line_items || []).forEach((item, i) => {
    const desc = doc.splitTextToSize(item.description || '', 140);
    const rowH = Math.max(9, desc.length * 5 + 4);
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(mL, y, 180, rowH, 'F'); }
    doc.setDrawColor(226, 232, 240); doc.line(mL, y + rowH, mR, y + rowH);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    doc.text(String(i + 1), mL + 3, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.text(desc, mL + 12, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`AED ${fmt(item.amount)}`, mR, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowH;
  });

  // ── Totals ───────────────────────────────────────────────────────────────────
  y += 6;
  const totX = 140;
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);

  // Sub Total row
  doc.setFillColor(248, 250, 252); doc.rect(totX, y, 55, 8, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Sub Total', totX + 3, y + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(`AED ${fmt(inv.subtotal)}`, mR, y + 5.5, { align: 'right' });
  y += 8;

  // VAT row
  if (inv.vat_amount > 0) {
    doc.setFillColor(255, 255, 255); doc.rect(totX, y, 55, 8, 'F');
    doc.line(totX, y, mR, y);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    doc.text('Standard Rate (5%)', totX + 3, y + 5.5);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(`AED ${fmt(inv.vat_amount)}`, mR, y + 5.5, { align: 'right' });
    y += 8;
  }

  // Total row
  doc.line(totX, y, mR, y);
  doc.setFillColor(248, 250, 252); doc.rect(totX, y, 55, 9, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text('Total', totX + 3, y + 6.2);
  doc.text(`AED ${fmt(inv.total)}`, mR, y + 6.2, { align: 'right' });
  y += 9;

  // Balance Due row (highlighted)
  doc.setFillColor(37, 99, 235); doc.rect(totX, y, 55, 10, 'F');
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('Balance Due', totX + 3, y + 7);
  doc.text(`AED ${fmt(inv.total)}`, mR, y + 7, { align: 'right' });
  y += 16;

  const display = inv.display_options || {};
  if (display.custom_1 !== false && company?.custom_field_1_label && inv.custom_field_1) { doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(`${company.custom_field_1_label}: ${inv.custom_field_1}`, mL, y); y += 6; }
  if (display.custom_2 !== false && company?.custom_field_2_label && inv.custom_field_2) { doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(`${company.custom_field_2_label}: ${inv.custom_field_2}`, mL, y); y += 6; }
  if (display.bank !== false && (company?.bank_name || company?.bank_account_name || company?.bank_account_number || company?.bank_iban)) { doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(doc.splitTextToSize(`Bank Details: ${[company.bank_name, company.bank_account_name, company.bank_account_number && `A/C ${company.bank_account_number}`, company.bank_iban && `IBAN ${company.bank_iban}`].filter(Boolean).join(' · ')}`, 170), mL, y); y += 10; }
  if (display.terms !== false && company?.invoice_terms_conditions) { doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(doc.splitTextToSize(`Terms & Conditions: ${company.invoice_terms_conditions}`, 170), mL, y); y += 10; }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (inv.notes) {
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'bold');
    doc.text('NOTES', mL, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(inv.notes, 170), mL, y);
    y += 10;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(248, 250, 252); doc.rect(0, pageH - 16, W, 16, 'F');
  doc.setDrawColor(226, 232, 240); doc.line(0, pageH - 16, W, pageH - 16);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
  doc.text(company?.company_name || 'VAT Manager', mL, pageH - 6);
  if (company?.trn) doc.text(`TRN: ${company.trn}`, W / 2, pageH - 6, { align: 'center' });
  doc.text(`Page 1`, mR, pageH - 6, { align: 'right' });

  doc.save(`Invoice_${inv.invoice_number}.pdf`);
}

export default function InvoiceModal({ customer, filing, monthKey, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(list => {
      const settings = list?.[0] || { vat_enabled: false, vat_rate: 5 };
      setCompany(settings);
      setIncludeVat(settings.vat_enabled === true);
    });
  }, []);

  const [form, setForm] = useState({
    invoice_number: generateInvoiceNumber(),
    invoice_date: today,
    due_date: dueDate.toISOString().split('T')[0],
    customer_name: customer?.name || '',
    customer_trn: customer?.trn || '',
    customer_address: customer?.address || '',
    custom_field_1: '',
    custom_field_2: '',
    display_options: { logo: true, bank: true, terms: true, custom_1: true, custom_2: true },
    notes: '',
    line_items: [{ description: 'VAT Filing Service Fee', amount: 0 }],
  });

  const [includeVat, setIncludeVat] = useState(false);
  const vatEnabled = company?.vat_enabled === true;
  const vatRate = company?.vat_rate ?? 5;

  const subtotal = form.line_items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const vat_amount = vatEnabled && includeVat ? parseFloat((subtotal * (vatRate / 100)).toFixed(2)) : 0;
  const total = parseFloat((subtotal + vat_amount).toFixed(2));
  const invalidAmount = total <= 0;

  const setItem = (idx, field, val) => {
    setForm(f => ({
      ...f,
      line_items: f.line_items.map((item, i) => i === idx ? { ...item, [field]: val } : item)
    }));
  };

  const addItem = () => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', amount: 0 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, line_items: f.line_items.filter((_,i) => i !== idx) }));

  const handleSave = async () => {
    if (invalidAmount) return;
    setSaving(true);
    const inv = await base44.entities.Invoice.create({
      ...form,
      type: 'vat_invoice',
      customer_id: customer.id,
      filing_id: filing?.id || '',
      month_key: monthKey,
      subtotal,
      tax_total: vat_amount,
      vat_amount,
      total,
      line_items: form.line_items.map(item => ({
        item_name: item.description,
        description: item.description,
        quantity: 1,
        unit_price: parseFloat(item.amount) || 0,
        discount: 0,
        tax_rate: vatEnabled && includeVat ? vatRate : 0,
        amount: parseFloat((parseFloat(item.amount || 0) * (vatEnabled && includeVat ? 1 + vatRate / 100 : 1)).toFixed(2)),
      })),
    });
    onSaved(inv);
  };

  const handleSaveAndDownload = async () => {
    setSaving(true);
    const inv = await base44.entities.Invoice.create({
      ...form,
      type: 'vat_invoice',
      customer_id: customer.id,
      filing_id: filing?.id || '',
      month_key: monthKey,
      subtotal,
      tax_total: vat_amount,
      vat_amount,
      total,
      line_items: form.line_items.map(item => ({
        item_name: item.description,
        description: item.description,
        quantity: 1,
        unit_price: parseFloat(item.amount) || 0,
        discount: 0,
        tax_rate: vatEnabled && includeVat ? vatRate : 0,
        amount: parseFloat((parseFloat(item.amount || 0) * (vatEnabled && includeVat ? 1 + vatRate / 100 : 1)).toFixed(2)),
      })),
    });
    await downloadInvoicePDF({ ...inv, ...form, subtotal, vat_amount, total }, company);
    onSaved(inv);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Generate Invoice</h2>
            <p className="text-xs text-gray-500 mt-0.5">{customer?.name} · {monthKey}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Invoice info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice #</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.invoice_number} onChange={e => setForm(f => ({...f, invoice_number: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.invoice_date} onChange={e => setForm(f => ({...f, invoice_date: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} />
            </div>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_name} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">TRN</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_trn} onChange={e => setForm(f => ({...f, customer_trn: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.customer_address} onChange={e => setForm(f => ({...f, customer_address: e.target.value}))} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">Line Items</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {form.line_items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Description"
                    value={item.description}
                    onChange={e => setItem(idx, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right"
                    placeholder="0.00"
                    value={item.amount}
                    onChange={e => setItem(idx, 'amount', e.target.value)}
                  />
                  {form.line_items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <InvoicePresentationOptions form={form} setForm={setForm} company={company} />

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {vatEnabled && <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">VAT Settings</span>
              <button
                type="button"
                onClick={() => setIncludeVat(v => !v)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${includeVat ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
              >
                <span className={`w-2 h-2 rounded-full ${includeVat ? 'bg-blue-600' : 'bg-gray-400'}`} />
                VAT {vatRate}% {includeVat ? 'Included' : 'Excluded'}
              </button>
            </div>}
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>AED {fmt(subtotal)}</span></div>
            {vatEnabled && includeVat && <div className="flex justify-between text-sm text-gray-600"><span>VAT ({vatRate}%)</span><span>AED {fmt(vat_amount)}</span></div>}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="text-blue-600">AED {fmt(total)}</span></div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
          </div>

          {invalidAmount && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              ⚠️ An invoice cannot be created with a zero amount. Total must be greater than AED 0.00.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || invalidAmount} className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 font-medium disabled:opacity-50 cursor-pointer">
            Save
          </button>
          <button onClick={handleSaveAndDownload} disabled={saving || invalidAmount} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
            <Download className="w-4 h-4" /> Save & Download
          </button>
        </div>
      </div>
    </div>
  );
}