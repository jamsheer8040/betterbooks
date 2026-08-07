import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Download, Pencil, Trash2, Building2, Hash, Calendar, Clock } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function FilingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filing, setFiling] = useState(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Filing.filter({ id }).then(async (data) => {
      const f = data[0] || null;
      setFiling(f);
      if (f?.customer_id) {
        const custs = await base44.entities.Customer.filter({ id: f.customer_id });
        setCustomerAddress(custs[0]?.address || '');
      }
      setLoading(false);
    });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this filing?')) return;
    await base44.entities.Filing.delete(id);
    navigate('/filings');
  };

  const handleStatusChange = async (status) => {
    const updated = await base44.entities.Filing.update(id, { status });
    setFiling(updated);
  };

  const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!filing) return <div className="text-center py-20 text-gray-400">Filing not found</div>;

  const otherTotal = (filing.other_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  // ── PDF helpers ──────────────────────────────────────────────────────────────
  const pdfHeader = (doc, title, subtitle) => {
    // Dark header bar
    doc.setFillColor(15, 23, 42);        // slate-900
    doc.rect(0, 0, 210, 38, 'F');
    // Accent stripe
    doc.setFillColor(37, 99, 235);       // blue-600
    doc.rect(0, 38, 210, 4, 'F');
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 20, 28);
    // Generated date (right-aligned)
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 190, 28, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const pdfInfoGrid = (doc, startY, fields) => {
    const rowH = 16;
    const cols = 2;
    const colW = 90;
    const rows = Math.ceil(fields.length / cols);
    const boxH = rows * rowH + 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, startY, 180, boxH, 3, 3, 'FD');
    fields.forEach(([label, value], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * colW;
      const y = startY + 10 + row * rowH;
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(label.toUpperCase(), x, y);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(value || '—', x, y + 7);
    });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    return startY + boxH + 8;
  };

  const pdfSectionTitle = (doc, y, label, color = [37, 99, 235]) => {
    doc.setFillColor(...color);
    doc.rect(15, y, 4, 13, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(label, 22, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    return y + 18;
  };

  const pdfTableHeader = (doc, y, cols) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 180, 9, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    cols.forEach(({ text, x, align }) => doc.text(text, x, y + 6.5, { align: align || 'left' }));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    return y + 9;
  };

  const pdfTableRow = (doc, y, cells, shade = false) => {
    if (shade) { doc.setFillColor(248, 250, 252); doc.rect(15, y, 180, 9, 'F'); }
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 9, 195, y + 9);
    doc.setFontSize(9.5);
    cells.forEach(({ text, x, align, bold }) => {
      if (bold) doc.setFont('helvetica', 'bold');
      doc.text(text, x, y + 6.5, { align: align || 'left' });
      if (bold) doc.setFont('helvetica', 'normal');
    });
    return y + 9;
  };

  const pdfHighlightBox = (doc, y, label, sublabel, value, r, g, b) => {
    doc.setFillColor(r, g, b);
    doc.roundedRect(15, y, 180, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 22, y + 8);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(sublabel, 22, y + 14);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`AED ${value}`, 188, y + 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    return y + 24;
  };

  const pdfFooter = (doc) => {
    const pageH = doc.internal.pageSize.height;
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 14, 210, 14, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('VAT Manager — Confidential', 15, pageH - 5);
    doc.text(`Page 1`, 195, pageH - 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  // ── VAT Details PDF ──────────────────────────────────────────────────────────
  const downloadVAT = () => {
    const doc = new jsPDF();
    const f = fmt;

    pdfHeader(doc, 'VAT Return Details', `${filing.customer_name}  ·  ${filing.filing_month}`);

    let y = 50;
    y = pdfInfoGrid(doc, y, [
      ['Company', filing.customer_name],
      ['TRN', filing.customer_trn || '—'],
      ['Address', customerAddress || '—'],
      ['Period', `${formatDate(filing.period_start)} – ${formatDate(filing.period_end)}`],
      ['Due Date', formatDate(filing.due_date)],
      ['Filing Date', formatDate(filing.filing_date)],
      ['Status', (filing.status || '').toUpperCase()],
    ]);

    y = pdfSectionTitle(doc, y, 'VAT Calculation');

    // Sales block
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(15, y, 180, 10, 2, 2, 'FD');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(21, 128, 61);
    doc.text('SALES (Output Tax)', 20, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0,0,0);
    y += 10;

    y = pdfTableHeader(doc, y, [
      { text: 'Description', x: 20 },
      { text: 'Base Amount', x: 120, align: 'right' },
      { text: 'VAT (5%)', x: 150, align: 'right' },
      { text: 'Total', x: 188, align: 'right' },
    ]);
    y = pdfTableRow(doc, y, [
      { text: 'Total Value of Due Tax', x: 20 },
      { text: `AED ${f(filing.sales_amount)}`, x: 120, align: 'right' },
      { text: `AED ${f(filing.sales_vat)}`, x: 150, align: 'right' },
      { text: `AED ${f((filing.sales_amount||0)+(filing.sales_vat||0))}`, x: 188, align: 'right', bold: true },
    ], true);
    y += 6;

    // Expenses block
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(254, 215, 170);
    doc.roundedRect(15, y, 180, 10, 2, 2, 'FD');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(194, 65, 12);
    doc.text('RECOVERABLE TAX (Input Tax)', 20, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0,0,0);
    y += 10;

    y = pdfTableHeader(doc, y, [
      { text: 'Description', x: 20 },
      { text: 'Base Amount', x: 120, align: 'right' },
      { text: 'VAT (5%)', x: 150, align: 'right' },
      { text: 'Total', x: 188, align: 'right' },
    ]);
    y = pdfTableRow(doc, y, [
      { text: 'Total Value of Recoverable Tax', x: 20 },
      { text: `AED ${f(filing.expenses_amount)}`, x: 120, align: 'right' },
      { text: `AED ${f(filing.expenses_vat)}`, x: 150, align: 'right' },
      { text: `AED ${f((filing.expenses_amount||0)+(filing.expenses_vat||0))}`, x: 188, align: 'right', bold: true },
    ], true);
    y += 8;

    y = pdfHighlightBox(doc, y, filing.net_vat_payable >= 0 ? 'Net VAT Payable' : 'Net VAT Refundable', 'Output Tax − Input Tax', f(Math.abs(filing.net_vat_payable)), filing.net_vat_payable >= 0 ? 37 : 22, filing.net_vat_payable >= 0 ? 99 : 163, filing.net_vat_payable >= 0 ? 235 : 74);

    // Profit margin
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 14, 2, 2, 'FD');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('Profit Margin Scheme Applied:', 20, y + 9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(filing.profit_margin_scheme ? 37 : 100, filing.profit_margin_scheme ? 99 : 116, filing.profit_margin_scheme ? 235 : 139);
    doc.text(filing.profit_margin_scheme ? 'YES' : 'NO', 188, y + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0,0,0);
    y += 20;

    if (filing.notes) {
      y = pdfSectionTitle(doc, y, 'Notes', [71, 85, 105]);
      doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(filing.notes, 170);
      doc.text(lines, 20, y);
    }

    pdfFooter(doc);
    doc.save(`VAT_${filing.customer_name}_${filing.filing_month}.pdf`);
  };

  // ── P&L Report PDF ───────────────────────────────────────────────────────────
  const downloadPL = () => {
    const doc = new jsPDF();
    const f = fmt;

    pdfHeader(doc, 'Profit & Loss Report', `${filing.customer_name}  ·  ${filing.filing_month}`);

    let y = 50;
    y = pdfInfoGrid(doc, y, [
      ['Company', filing.customer_name],
      ['TRN', filing.customer_trn || '—'],
      ['Address', customerAddress || '—'],
      ['Period', `${formatDate(filing.period_start)} – ${formatDate(filing.period_end)}`],
      ['Filing Date', formatDate(filing.filing_date)],
      ['Filing Month', filing.filing_month],
    ]);

    // Revenue
    y = pdfSectionTitle(doc, y, 'Revenue', [21, 128, 61]);
    y = pdfTableHeader(doc, y, [
      { text: 'Description', x: 20 },
      { text: 'Amount (AED)', x: 188, align: 'right' },
    ]);
    y = pdfTableRow(doc, y, [
      { text: 'Total Sales', x: 20 },
      { text: `AED ${f(filing.sales_amount)}`, x: 188, align: 'right' },
    ], false);
    y = pdfTableRow(doc, y, [
      { text: 'TOTAL REVENUE', x: 20, bold: true },
      { text: `AED ${f(filing.sales_amount)}`, x: 188, align: 'right', bold: true },
    ], true);
    y += 8;

    // Expenses
    y = pdfSectionTitle(doc, y, 'Expenses', [194, 65, 12]);
    y = pdfTableHeader(doc, y, [
      { text: 'Description', x: 20 },
      { text: 'Amount (AED)', x: 188, align: 'right' },
    ]);
    y = pdfTableRow(doc, y, [
      { text: 'Total Purchases', x: 20 },
      { text: `AED ${f(filing.expenses_amount)}`, x: 188, align: 'right' },
    ], false);

    (filing.other_expenses || []).forEach((exp, i) => {
      y = pdfTableRow(doc, y, [
        { text: exp.label || 'Other', x: 20 },
        { text: `AED ${f(exp.amount)}`, x: 188, align: 'right' },
      ], i % 2 === 0);
    });

    const totalExp = (filing.expenses_amount || 0) + otherTotal;
    y = pdfTableRow(doc, y, [
      { text: 'TOTAL EXPENSES', x: 20, bold: true },
      { text: `AED ${f(totalExp)}`, x: 188, align: 'right', bold: true },
    ], true);
    y += 8;

    y = pdfHighlightBox(doc, y, 'Net Profit', 'Revenue − Total Expenses', f(filing.net_profit), 22, 163, 74);

    // VAT snapshot
    y += 4;
    y = pdfSectionTitle(doc, y, 'VAT Snapshot', [71, 85, 105]);
    y = pdfTableHeader(doc, y, [
      { text: 'Description', x: 20 },
      { text: 'Amount (AED)', x: 188, align: 'right' },
    ]);
    y = pdfTableRow(doc, y, [{ text: 'Output VAT (Sales)', x: 20 }, { text: `AED ${f(filing.sales_vat)}`, x: 188, align: 'right' }], false);
    y = pdfTableRow(doc, y, [{ text: 'Input VAT (Purchases)', x: 20 }, { text: `AED ${f(filing.expenses_vat)}`, x: 188, align: 'right' }], true);
    y = pdfTableRow(doc, y, [{ text: filing.net_vat_payable >= 0 ? 'Net VAT Payable' : 'Net VAT Refundable', x: 20, bold: true }, { text: `AED ${f(Math.abs(filing.net_vat_payable))}`, x: 188, align: 'right', bold: true }], false);
    y += 8;

    if (filing.notes) {
      y = pdfSectionTitle(doc, y, 'Notes', [71, 85, 105]);
      doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(filing.notes, 170);
      doc.text(lines, 20, y);
    }

    pdfFooter(doc);
    doc.save(`PL_${filing.customer_name}_${filing.filing_month}.pdf`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <Link to="/filings" className="text-gray-400 hover:text-gray-600 mt-1"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{filing.customer_name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Filed: {filing.filing_month} · Covers: {formatDate(filing.period_start)} – {formatDate(filing.period_end)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadVAT} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> VAT Details
          </button>
          <button onClick={downloadPL} className="flex items-center gap-1.5 px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50 transition-colors">
            <Download className="w-4 h-4" /> P&L Report
          </button>
          <Link to={`/filings/${id}/edit`} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Pencil className="w-4 h-4" /> Edit
          </Link>
          <button onClick={handleDelete} className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Building2 className="w-3 h-3" /> Company</p>
            <p className="text-sm font-semibold">{filing.customer_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Hash className="w-3 h-3" /> TRN</p>
            <p className="text-sm font-semibold">{filing.customer_trn || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Period Covered</p>
            <p className="text-sm font-semibold">{formatDate(filing.period_start)} – {formatDate(filing.period_end)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Due Date</p>
            <p className="text-sm font-semibold">{formatDate(filing.due_date)}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <select
            value={filing.status}
            onChange={e => handleStatusChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="filed">Filed</option>
          </select>
        </div>
      </div>

      {/* VAT Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-semibold mb-4">VAT Summary</h2>
        <div className="bg-green-50 rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">↑</div>
            <span className="text-sm font-medium text-gray-700">Sales</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-right">
            <div><p className="text-xs text-gray-400 mb-1">Base</p><p className="text-sm font-semibold">AED {fmt(filing.sales_amount)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">VAT</p><p className="text-sm font-semibold">AED {fmt(filing.sales_vat)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Total</p><p className="text-sm font-bold text-green-700">AED {fmt((filing.sales_amount || 0) + (filing.sales_vat || 0))}</p></div>
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">↓</div>
            <span className="text-sm font-medium text-gray-700">Expenses</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-right">
            <div><p className="text-xs text-gray-400 mb-1">Base</p><p className="text-sm font-semibold">AED {fmt(filing.expenses_amount)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">VAT</p><p className="text-sm font-semibold">AED {fmt(filing.expenses_vat)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Total</p><p className="text-sm font-bold text-orange-700">AED {fmt((filing.expenses_amount || 0) + (filing.expenses_vat || 0))}</p></div>
          </div>
        </div>
        <div className={`${filing.net_vat_payable >= 0 ? 'bg-blue-600' : 'bg-green-600'} rounded-lg p-4 flex items-center justify-between`}>
          <div>
            <p className="text-white font-medium text-sm">{filing.net_vat_payable >= 0 ? 'Net VAT Payable' : 'Net VAT Refundable'}</p>
            <p className="text-blue-200 text-xs">Sales VAT − Expense VAT</p>
          </div>
          <span className="text-white text-xl font-bold">AED {fmt(Math.abs(filing.net_vat_payable))}</span>
        </div>
      </div>

      {/* Other Expenses */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-semibold mb-4">Other Expenses</h2>
        <div className="divide-y divide-gray-100">
          {(filing.other_expenses || []).map((exp, i) => (
            <div key={i} className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-700">{exp.label}</span>
              <span className="font-medium">AED {fmt(exp.amount)}</span>
            </div>
          ))}
        </div>
        <div className="bg-green-600 rounded-lg p-4 flex items-center justify-between mt-4">
          <div>
            <p className="text-white font-medium text-sm">Net Profit</p>
            <p className="text-green-200 text-xs">Sales − Purchases − Other Expenses</p>
          </div>
          <span className="text-white text-xl font-bold">AED {fmt(filing.net_profit)}</span>
        </div>
      </div>

      {/* Profit Margin Scheme */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <p className="text-sm font-semibold text-gray-800 mb-1">Profit Margin Scheme — هامش الربح</p>
        <p className="text-xs text-gray-500 mb-1">Did you apply the profit margin scheme in respect of any supplies made during the tax period?</p>
        <p className="text-xs text-gray-400 mb-3 text-right" dir="rtl">هل قمت بتطبيق نظام هامش الربح فيما يتعلق بأي توريدات تم إجراؤها خلال الفترة الضريبية؟</p>
        <span className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${filing.profit_margin_scheme ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600'}`}>
          {filing.profit_margin_scheme ? 'Yes' : 'No'}
        </span>
      </div>

      {filing.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
          <p className="text-sm text-gray-600">{filing.notes}</p>
        </div>
      )}
    </div>
  );
}