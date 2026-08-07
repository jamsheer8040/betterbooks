import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, FileText, Download, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import FilingTrackerTab from '@/components/FilingTrackerTab';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
};

// ── PDF helpers (shared) ──────────────────────────────────────────────────────
function pdfHeader(doc, title, subtitle) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 38, 210, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 18);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 20, 28);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 190, 28, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function pdfInfoGrid(doc, startY, fields) {
  const rowH = 16, cols = 2, colW = 90;
  const rows = Math.ceil(fields.length / cols);
  const boxH = rows * rowH + 6;
  doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, startY, 180, boxH, 3, 3, 'FD');
  fields.forEach(([label, value], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 20 + col * colW, y = startY + 10 + row * rowH;
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
    doc.text(value || '—', x, y + 7);
  });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return startY + boxH + 8;
}

function pdfSectionTitle(doc, y, label, color = [37, 99, 235]) {
  doc.setFillColor(...color); doc.rect(15, y, 4, 13, 'F');
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color);
  doc.text(label, 22, y + 9);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 18;
}

function pdfTableHeader(doc, y, cols) {
  doc.setFillColor(241, 245, 249); doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 180, 9, 'FD');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
  cols.forEach(({ text, x, align }) => doc.text(text, x, y + 6.5, { align: align || 'left' }));
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 9;
}

function pdfTableRow(doc, y, cells, shade = false) {
  if (shade) { doc.setFillColor(248, 250, 252); doc.rect(15, y, 180, 9, 'F'); }
  doc.setDrawColor(226, 232, 240); doc.line(15, y + 9, 195, y + 9);
  doc.setFontSize(9.5);
  cells.forEach(({ text, x, align, bold }) => {
    if (bold) doc.setFont('helvetica', 'bold');
    doc.text(text, x, y + 6.5, { align: align || 'left' });
    if (bold) doc.setFont('helvetica', 'normal');
  });
  return y + 9;
}

function pdfHighlightBox(doc, y, label, sublabel, value, r, g, b) {
  doc.setFillColor(r, g, b); doc.roundedRect(15, y, 180, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(label, 22, y + 8);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.text(sublabel, 22, y + 14);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`AED ${value}`, 188, y + 11, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 24;
}

function pdfFooter(doc) {
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(248, 250, 252); doc.rect(0, pageH - 14, 210, 14, 'F');
  doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
  doc.text('VAT Manager — Confidential', 15, pageH - 5);
  doc.text('Page 1', 195, pageH - 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function downloadVAT(filing) {
  const doc = new jsPDF();
  pdfHeader(doc, 'VAT Return Details', `${filing.customer_name}  ·  ${filing.filing_month}`);
  let y = 50;
  y = pdfInfoGrid(doc, y, [
    ['Company', filing.customer_name],
    ['TRN', filing.customer_trn || '—'],
    ['Period', `${formatDate(filing.period_start)} – ${formatDate(filing.period_end)}`],
    ['Due Date', formatDate(filing.due_date)],
    ['Filing Date', formatDate(filing.filing_date)],
    ['Status', (filing.status || '').toUpperCase()],
  ]);
  y = pdfSectionTitle(doc, y, 'VAT Calculation');
  doc.setFillColor(240, 253, 244); doc.setDrawColor(187, 247, 208);
  doc.roundedRect(15, y, 180, 10, 2, 2, 'FD');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(21, 128, 61);
  doc.text('SALES (Output Tax)', 20, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); y += 10;
  y = pdfTableHeader(doc, y, [
    { text: 'Description', x: 20 }, { text: 'Base Amount', x: 120, align: 'right' },
    { text: 'VAT (5%)', x: 150, align: 'right' }, { text: 'Total', x: 188, align: 'right' },
  ]);
  y = pdfTableRow(doc, y, [
    { text: 'Total Value of Due Tax', x: 20 },
    { text: `AED ${fmt(filing.sales_amount)}`, x: 120, align: 'right' },
    { text: `AED ${fmt(filing.sales_vat)}`, x: 150, align: 'right' },
    { text: `AED ${fmt((filing.sales_amount || 0) + (filing.sales_vat || 0))}`, x: 188, align: 'right', bold: true },
  ], true); y += 6;
  doc.setFillColor(255, 247, 237); doc.setDrawColor(254, 215, 170);
  doc.roundedRect(15, y, 180, 10, 2, 2, 'FD');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(194, 65, 12);
  doc.text('RECOVERABLE TAX (Input Tax)', 20, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); y += 10;
  y = pdfTableHeader(doc, y, [
    { text: 'Description', x: 20 }, { text: 'Base Amount', x: 120, align: 'right' },
    { text: 'VAT (5%)', x: 150, align: 'right' }, { text: 'Total', x: 188, align: 'right' },
  ]);
  y = pdfTableRow(doc, y, [
    { text: 'Total Value of Recoverable Tax', x: 20 },
    { text: `AED ${fmt(filing.expenses_amount)}`, x: 120, align: 'right' },
    { text: `AED ${fmt(filing.expenses_vat)}`, x: 150, align: 'right' },
    { text: `AED ${fmt((filing.expenses_amount || 0) + (filing.expenses_vat || 0))}`, x: 188, align: 'right', bold: true },
  ], true); y += 8;
  y = pdfHighlightBox(doc, y, 'Net VAT Payable', 'Output Tax − Input Tax', fmt(filing.net_vat_payable), 37, 99, 235);
  if (filing.notes) {
    y = pdfSectionTitle(doc, y, 'Notes', [71, 85, 105]);
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(filing.notes, 170), 20, y);
  }
  pdfFooter(doc);
  doc.save(`VAT_${filing.customer_name}_${filing.filing_month}.pdf`);
}

function downloadPL(filing) {
  const doc = new jsPDF();
  const otherTotal = (filing.other_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  pdfHeader(doc, 'Profit & Loss Report', `${filing.customer_name}  ·  ${filing.filing_month}`);
  let y = 50;
  y = pdfInfoGrid(doc, y, [
    ['Company', filing.customer_name], ['TRN', filing.customer_trn || '—'],
    ['Period', `${formatDate(filing.period_start)} – ${formatDate(filing.period_end)}`],
    ['Filing Date', formatDate(filing.filing_date)],
    ['Filing Month', filing.filing_month],
  ]);
  y = pdfSectionTitle(doc, y, 'Revenue', [21, 128, 61]);
  y = pdfTableHeader(doc, y, [{ text: 'Description', x: 20 }, { text: 'Amount (AED)', x: 188, align: 'right' }]);
  y = pdfTableRow(doc, y, [{ text: 'Total Sales', x: 20 }, { text: `AED ${fmt(filing.sales_amount)}`, x: 188, align: 'right' }], false);
  y = pdfTableRow(doc, y, [{ text: 'TOTAL REVENUE', x: 20, bold: true }, { text: `AED ${fmt(filing.sales_amount)}`, x: 188, align: 'right', bold: true }], true);
  y += 8;
  y = pdfSectionTitle(doc, y, 'Expenses', [194, 65, 12]);
  y = pdfTableHeader(doc, y, [{ text: 'Description', x: 20 }, { text: 'Amount (AED)', x: 188, align: 'right' }]);
  y = pdfTableRow(doc, y, [{ text: 'Total Purchases', x: 20 }, { text: `AED ${fmt(filing.expenses_amount)}`, x: 188, align: 'right' }], false);
  (filing.other_expenses || []).forEach((exp, i) => {
    y = pdfTableRow(doc, y, [{ text: exp.label || 'Other', x: 20 }, { text: `AED ${fmt(exp.amount)}`, x: 188, align: 'right' }], i % 2 === 0);
  });
  y = pdfTableRow(doc, y, [{ text: 'TOTAL EXPENSES', x: 20, bold: true }, { text: `AED ${fmt((filing.expenses_amount || 0) + otherTotal)}`, x: 188, align: 'right', bold: true }], true);
  y += 8;
  y = pdfHighlightBox(doc, y, 'Net Profit', 'Revenue − Total Expenses', fmt(filing.net_profit), 22, 163, 74);
  y += 4;
  y = pdfSectionTitle(doc, y, 'VAT Snapshot', [71, 85, 105]);
  y = pdfTableHeader(doc, y, [{ text: 'Description', x: 20 }, { text: 'Amount (AED)', x: 188, align: 'right' }]);
  y = pdfTableRow(doc, y, [{ text: 'Output VAT (Sales)', x: 20 }, { text: `AED ${fmt(filing.sales_vat)}`, x: 188, align: 'right' }], false);
  y = pdfTableRow(doc, y, [{ text: 'Input VAT (Purchases)', x: 20 }, { text: `AED ${fmt(filing.expenses_vat)}`, x: 188, align: 'right' }], true);
  y = pdfTableRow(doc, y, [{ text: 'Net VAT Payable', x: 20, bold: true }, { text: `AED ${fmt(filing.net_vat_payable)}`, x: 188, align: 'right', bold: true }], false);
  if (filing.notes) {
    y += 8; y = pdfSectionTitle(doc, y, 'Notes', [71, 85, 105]);
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(filing.notes, 170), 20, y);
  }
  pdfFooter(doc);
  doc.save(`PL_${filing.customer_name}_${filing.filing_month}.pdf`);
}

// ── Upcoming Filing Card ──────────────────────────────────────────────────────
function UpcomingCard({ customer, quarterLabel, dueDate, daysLeft, periodStarted }) {
  const urgent = daysLeft <= 7;
  const soon = daysLeft <= 30;
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${urgent ? 'border-red-200' : soon ? 'border-orange-200' : 'border-gray-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${urgent ? 'bg-red-100 text-red-600' : soon ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
        {customer.name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{quarterLabel} · Due: {formatDate(dueDate)}</p>
      </div>
      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${urgent ? 'bg-red-100 text-red-700' : soon ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
        {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
      </span>
      {periodStarted ? (
        <Link to={`/filings/new?customerId=${customer.id}&filingMonth=${encodeURIComponent(new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }))}`} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          File Now
        </Link>
      ) : (
        <button disabled className="text-xs bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg font-medium cursor-not-allowed" title="Filing period hasn't started yet">
          Not Started
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AllFilings() {
  const [filings, setFilings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    Promise.all([
      base44.entities.Filing.list('-created_date', 200),
      base44.entities.Customer.filter({ status: 'active' }),
    ]).then(([f, c]) => {
      setFilings(f);
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filings.length} total filings</p>
        </div>
        <Link to="/filings/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <FileText className="w-4 h-4" /> New Filing
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <FilingTrackerTab />
      )}
    </div>
  );
}