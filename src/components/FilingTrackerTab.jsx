import { React, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, Circle, Loader2, ChevronDown, Download, Eye, Share2, Pencil, Plus, X, Copy, Info } from 'lucide-react';
import InvoiceModal from '@/components/InvoiceModal';
import ReceiptModal from '@/components/ReceiptModal';
import StatusFilterPanel from '@/components/StatusFilterPanel';
import { jsPDF } from 'jspdf';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
};

const CYCLE_MONTHS = {
  'Jan-Apr-Jul-Oct': [0, 3, 6, 9],
  'Feb-May-Aug-Nov': [1, 4, 7, 10],
  'Mar-Jun-Sep-Dec': [2, 5, 8, 11],
};

function getCustomerCycleMonths(cycleStr) {
  return CYCLE_MONTHS[cycleStr] || CYCLE_MONTHS['Jan-Apr-Jul-Oct'];
}

function isCustomerFilingMonth(customer, monthIndex) {
  const cycleMonths = getCustomerCycleMonths(customer?.filing_cycle);
  return cycleMonths.includes(monthIndex);
}

function isMonthBeforeCustomerOnboarding(customer, monthIndex, year) {
  if (!customer?.created_date) return false;
  const createdDate = new Date(customer.created_date);
  if (isNaN(createdDate.getTime())) return false;

  const createdYr = createdDate.getFullYear();
  const createdMonthIdx = createdDate.getMonth();

  if (year < createdYr) return true;
  if (year === createdYr && monthIndex < createdMonthIdx) return true;

  return false;
}

// ── Professional PDF — Color Palette ─────────────────────────────────────────
const C_NAVY   = [10, 25, 60];
const C_BLUE   = [37, 99, 235];
const C_BLUE_L = [219, 234, 254];
const C_GOLD   = [202, 138, 4];
const C_SLATE  = [71, 85, 105];
const C_MUTED  = [148, 163, 184];
const C_BG     = [248, 250, 252];
const C_BORDER = [203, 213, 225];
const C_WHITE  = [255, 255, 255];
const C_GREEN  = [21, 128, 61];
const C_GREEN_L= [220, 252, 231];
const C_RED    = [185, 28, 28];
const C_RED_L  = [254, 226, 226];
const C_AMBER  = [146, 64, 14];
const C_AMBER_L= [254, 243, 199];

const W = 210; // A4 width
const ML = 14; // Margin left
const MR = 196; // Margin right

// ── Bulletproof PDF Save Helper ─────────────────────────────────────────────
function savePDF(doc, filename) {
  const cleanFilename = (filename || 'Report.pdf')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  } catch {
    doc.save(cleanFilename);
  }
}

// ── Draw full-page decorative left accent bar ─────────────────────────────────
function pdfLeftAccent(doc) {
  doc.setFillColor(...C_BLUE);
  doc.rect(0, 0, 4, 297, 'F');
}

// ── Header band with company name and document title ─────────────────────────
function richHeader(doc, company, docTitle, period, status) {
  // Navy band
  doc.setFillColor(...C_NAVY);
  doc.rect(0, 0, W, 42, 'F');
  // Gold accent stripe below header
  doc.setFillColor(...C_GOLD);
  doc.rect(0, 42, W, 1.5, 'F');

  // Company name (left, large, white)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...C_WHITE);
  doc.text(company?.company_name || 'VAT Manager', ML + 4, 15);

  // Company tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 230);
  doc.text('Professional Tax & Accounting Services', ML + 4, 21);

  // TRN
  if (company?.trn) {
    doc.setFontSize(7.5);
    doc.setTextColor(160, 185, 220);
    doc.text(`TRN: ${company.trn}`, ML + 4, 27);
  }

  // Contact row
  const contact = [company?.phone, company?.email].filter(Boolean).join('  |  ');
  if (contact) {
    doc.setFontSize(7);
    doc.setTextColor(140, 170, 210);
    doc.text(contact, ML + 4, 33);
  }

  // Document title block (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C_WHITE);
  doc.text(docTitle, MR, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 200, 230);
  doc.text(period || '-', MR, 21, { align: 'right' });

  // Status badge
  const badgeColor = status === 'filed' ? C_GREEN : status === 'draft' ? C_AMBER : C_SLATE;
  const badgeBg   = status === 'filed' ? C_GREEN_L : status === 'draft' ? C_AMBER_L : C_BG;
  const badgeText = (status || 'DRAFT').toUpperCase();
  const bx = MR - 22, by = 26, bw = 24, bh = 8;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(bx, by, bw, bh, 1.5, 1.5, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...badgeColor);
  doc.text(badgeText, bx + bw / 2, by + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return 48; // y after header
}

// ── Two-column info cards ─────────────────────────────────────────────────────
function richInfoCards(doc, y, leftFields, rightFields) {
  const cardH = Math.max(leftFields.length, rightFields.length) * 13 + 8;
  // Left card
  doc.setFillColor(...C_BG);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, 88, cardH, 2, 2, 'FD');
  // Right card
  doc.roundedRect(108, y, 88, cardH, 2, 2, 'FD');

  const drawFields = (fields, startX) => {
    fields.forEach(([label, value], i) => {
      const fy = y + 6 + i * 13;
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_MUTED);
      doc.text(label.toUpperCase(), startX + 4, fy);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_NAVY);
      const display = value || '-';
      doc.text(String(display), startX + 4, fy + 6);
    });
  };
  drawFields(leftFields, ML);
  drawFields(rightFields, 108);

  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + cardH + 6;
}

// ── Section header bar ────────────────────────────────────────────────────────
function richSection(doc, y, label) {
  doc.setFillColor(...C_BLUE);
  doc.rect(ML, y, 182, 8, 'F');
  // Left accent pip
  doc.setFillColor(...C_GOLD);
  doc.rect(ML, y, 3, 8, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_WHITE);
  doc.text(label, ML + 6, y + 5.5);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 8;
}

// ── Table header row ──────────────────────────────────────────────────────────
function richTableHeader(doc, y, cols) {
  doc.setFillColor(...C_BLUE_L);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, 182, 8, 'FD');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_NAVY);
  cols.forEach(({ text, x, align }) => doc.text(text, x, y + 5.5, { align: align || 'left' }));
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 8;
}

// ── Table body row ────────────────────────────────────────────────────────────
function richTableRow(doc, y, cells, shade = false) {
  if (shade) { doc.setFillColor(244, 247, 251); doc.rect(ML, y, 182, 8, 'F'); }
  doc.setDrawColor(...C_BORDER); doc.setLineWidth(0.2);
  doc.line(ML, y + 8, MR, y + 8);
  // Left/right vertical borders
  doc.line(ML, y, ML, y + 8);
  doc.line(MR, y, MR, y + 8);
  doc.setFontSize(8.5); doc.setTextColor(...C_NAVY);
  cells.forEach(({ text, x, align, bold }) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(text), x, y + 5.3, { align: align || 'left' });
  });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 8;
}

// ── Subtotal row ──────────────────────────────────────────────────────────────
function richSubtotal(doc, y, cells) {
  doc.setFillColor(224, 231, 245);
  doc.setDrawColor(...C_BORDER);
  doc.rect(ML, y, 182, 8, 'FD');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_NAVY);
  cells.forEach(({ text, x, align }) => doc.text(String(text), x, y + 5.3, { align: align || 'left' }));
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + 8;
}

// ── Prominent summary callout ─────────────────────────────────────────────────
function richSummary(doc, y, label, value, isPositive = true) {
  const h = 20;
  // Shadow effect (slightly offset darker rect)
  doc.setFillColor(180, 195, 220);
  doc.roundedRect(ML + 1, y + 1, 182, h, 3, 3, 'F');
  // Main box
  const boxColor = isPositive ? C_NAVY : C_RED;
  doc.setFillColor(...boxColor);
  doc.roundedRect(ML, y, 182, h, 3, 3, 'F');
  // Gold left pip
  doc.setFillColor(...C_GOLD);
  doc.roundedRect(ML, y, 5, h, 2, 2, 'F');
  // Label
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 200, 235);
  doc.text(label, ML + 10, y + 8);
  // Value
  doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_WHITE);
  doc.text(`AED ${value}`, MR - 2, y + 14.5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  return y + h + 2;
}

// ── Signature block ───────────────────────────────────────────────────────────
function richSignature(doc, y) {
  doc.setFillColor(...C_BG);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, 182, 22, 2, 2, 'FD');
  // Two signature lines
  doc.setDrawColor(...C_MUTED); doc.setLineWidth(0.4);
  doc.line(ML + 6, y + 16, ML + 70, y + 16);
  doc.line(MR - 70, y + 16, MR - 6, y + 16);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_MUTED);
  doc.text('Prepared By', ML + 6, y + 20);
  doc.text('Authorised Signature', MR - 6, y + 20, { align: 'right' });
  doc.text('Date: ________________', ML + 90, y + 20, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  return y + 24;
}

// ── Footer band ───────────────────────────────────────────────────────────────
function richFooter(doc, company) {
  const ph = doc.internal.pageSize.height;
  doc.setFillColor(...C_NAVY);
  doc.rect(0, ph - 14, W, 14, 'F');
  doc.setFillColor(...C_GOLD);
  doc.rect(0, ph - 14, W, 1.2, 'F');
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 185, 220);
  const companyLabel = company?.company_name ? `${company.company_name} - ` : '';
  doc.text(`${companyLabel}Confidential Financial Document`, ML + 4, ph - 6);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, MR, ph - 6, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

// ── VAT Return PDF ────────────────────────────────────────────────────────────
function downloadVAT(filing, address = '', company = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  pdfLeftAccent(doc);

  let y = richHeader(doc, company, 'VAT RETURN STATEMENT', filing.filing_month || '-', filing.status);

  // Info cards
  y = richInfoCards(doc, y,
    [
      ['Client / Company', filing.customer_name || '-'],
      ['TRN', filing.customer_trn || '-'],
      ['Address', address || filing.customer_address || '-'],
    ],
    [
      ['Filing Month', filing.filing_month || '-'],
      ['Tax Period', `${formatDate(filing.period_start)} - ${formatDate(filing.period_end)}`],
      ['Due Date', formatDate(filing.due_date)],
      ['Filing Date', formatDate(filing.filing_date)],
    ]
  );

  // Output Tax section
  y = richSection(doc, y, 'OUTPUT TAX (Sales)');
  y = richTableHeader(doc, y, [
    { text: 'Description', x: ML + 4 },
    { text: 'Base Amount (AED)', x: 125, align: 'right' },
    { text: 'VAT 5% (AED)', x: 159, align: 'right' },
    { text: 'Total (AED)', x: MR - 2, align: 'right' },
  ]);
  y = richTableRow(doc, y, [
    { text: 'Standard Rated Supplies', x: ML + 4 },
    { text: fmt(filing.sales_amount), x: 125, align: 'right' },
    { text: fmt(filing.sales_vat), x: 159, align: 'right' },
    { text: fmt((filing.sales_amount || 0) + (filing.sales_vat || 0)), x: MR - 2, align: 'right', bold: true },
  ]);
  y = richSubtotal(doc, y, [
    { text: 'TOTAL OUTPUT TAX', x: ML + 4 },
    { text: fmt(filing.sales_amount), x: 125, align: 'right' },
    { text: fmt(filing.sales_vat), x: 159, align: 'right' },
    { text: fmt((filing.sales_amount || 0) + (filing.sales_vat || 0)), x: MR - 2, align: 'right' },
  ]);
  y += 5;

  // Input Tax section
  y = richSection(doc, y, 'INPUT TAX (Purchases)');
  y = richTableHeader(doc, y, [
    { text: 'Description', x: ML + 4 },
    { text: 'Base Amount (AED)', x: 125, align: 'right' },
    { text: 'VAT 5% (AED)', x: 159, align: 'right' },
    { text: 'Total (AED)', x: MR - 2, align: 'right' },
  ]);
  y = richTableRow(doc, y, [
    { text: 'Recoverable Input Tax (Purchases)', x: ML + 4 },
    { text: fmt(filing.expenses_amount), x: 125, align: 'right' },
    { text: fmt(filing.expenses_vat), x: 159, align: 'right' },
    { text: fmt((filing.expenses_amount || 0) + (filing.expenses_vat || 0)), x: MR - 2, align: 'right', bold: true },
  ]);
  y = richSubtotal(doc, y, [
    { text: 'TOTAL INPUT TAX', x: ML + 4 },
    { text: fmt(filing.expenses_amount), x: 125, align: 'right' },
    { text: fmt(filing.expenses_vat), x: 159, align: 'right' },
    { text: fmt((filing.expenses_amount || 0) + (filing.expenses_vat || 0)), x: MR - 2, align: 'right' },
  ]);
  y += 8;

  // Net VAT callout
  const netVat = filing.net_vat_payable || 0;
  y = richSummary(doc, y,
    netVat >= 0 ? 'NET VAT PAYABLE  (Output Tax - Input Tax)' : 'NET VAT REFUNDABLE',
    fmt(Math.abs(netVat)),
    netVat >= 0
  );
  y += 6;

  // Profit Margin Scheme indicator
  doc.setFillColor(...C_BG); doc.setDrawColor(...C_BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, 182, 10, 2, 2, 'FD');
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_SLATE);
  doc.text('Profit Margin Scheme Applied:', ML + 4, y + 6.5);
  const pmColor = filing.profit_margin_scheme ? C_GREEN : C_RED;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...pmColor);
  doc.text(filing.profit_margin_scheme ? 'YES' : 'NO', MR - 4, y + 6.5, { align: 'right' });
  y += 14;

  // Notes
  if (filing.notes) {
    y = richSection(doc, y, 'NOTES & REMARKS');
    doc.setFillColor(...C_BG); doc.setDrawColor(...C_BORDER);
    const noteText = String(filing.notes);
    const noteLines = doc.splitTextToSize(noteText, 174);
    const noteH = noteLines.length * 4.5 + 8;
    doc.roundedRect(ML, y, 182, noteH, 2, 2, 'FD');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_SLATE);
    doc.text(noteLines, ML + 4, y + 7);
    y += noteH + 5;
  }

  y = richSignature(doc, y);
  richFooter(doc, company);
  savePDF(doc, `VAT_Return_${filing.customer_name || 'Client'}_${filing.filing_month || 'Month'}.pdf`);
}

// ── Profit & Loss PDF ─────────────────────────────────────────────────────────
function downloadPL(filing, address = '', company = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  pdfLeftAccent(doc);

  const otherTotal = (filing.other_expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = (filing.expenses_amount || 0) + otherTotal;
  const netProfit = filing.net_profit || ((filing.sales_amount || 0) - totalExpenses);

  let y = richHeader(doc, company, 'PROFIT & LOSS STATEMENT', filing.filing_month || '-', filing.status);

  y = richInfoCards(doc, y,
    [
      ['Client / Company', filing.customer_name || '-'],
      ['TRN', filing.customer_trn || '-'],
      ['Address', address || filing.customer_address || '-'],
    ],
    [
      ['Filing Month', filing.filing_month || '-'],
      ['Tax Period', `${formatDate(filing.period_start)} - ${formatDate(filing.period_end)}`],
      ['Filing Date', formatDate(filing.filing_date)],
    ]
  );

  // Revenue
  y = richSection(doc, y, 'REVENUE');
  y = richTableHeader(doc, y, [
    { text: 'Description', x: ML + 4 },
    { text: 'Amount (AED)', x: MR - 2, align: 'right' },
  ]);
  y = richTableRow(doc, y, [
    { text: 'Gross Sales / Turnover', x: ML + 4 },
    { text: fmt(filing.sales_amount), x: MR - 2, align: 'right', bold: true },
  ]);
  y = richSubtotal(doc, y, [
    { text: 'TOTAL REVENUE', x: ML + 4 },
    { text: fmt(filing.sales_amount), x: MR - 2, align: 'right' },
  ]);
  y += 5;

  // Expenses
  y = richSection(doc, y, 'EXPENSES');
  y = richTableHeader(doc, y, [
    { text: 'Description', x: ML + 4 },
    { text: 'Amount (AED)', x: MR - 2, align: 'right' },
  ]);
  y = richTableRow(doc, y, [
    { text: 'Direct Purchases / Cost of Sales', x: ML + 4 },
    { text: fmt(filing.expenses_amount), x: MR - 2, align: 'right' },
  ], false);
  (filing.other_expenses || []).forEach((exp, i) => {
    y = richTableRow(doc, y, [
      { text: exp.label || 'Other Expense', x: ML + 4 },
      { text: fmt(exp.amount), x: MR - 2, align: 'right' },
    ], i % 2 === 0);
  });
  y = richSubtotal(doc, y, [
    { text: 'TOTAL EXPENSES', x: ML + 4 },
    { text: fmt(totalExpenses), x: MR - 2, align: 'right' },
  ]);
  y += 8;

  // Net Profit callout
  y = richSummary(doc, y,
    netProfit >= 0 ? 'NET OPERATING PROFIT  (Revenue - Expenses)' : 'NET OPERATING LOSS',
    fmt(Math.abs(netProfit)),
    netProfit >= 0
  );
  y += 6;

  // VAT Snapshot
  y = richSection(doc, y, 'VAT SNAPSHOT');
  y = richTableHeader(doc, y, [
    { text: 'Description', x: ML + 4 },
    { text: 'Amount (AED)', x: MR - 2, align: 'right' },
  ]);
  y = richTableRow(doc, y, [
    { text: 'Output VAT on Sales (5%)', x: ML + 4 },
    { text: fmt(filing.sales_vat), x: MR - 2, align: 'right' },
  ]);
  y = richTableRow(doc, y, [
    { text: 'Input VAT on Purchases (5%)', x: ML + 4 },
    { text: fmt(filing.expenses_vat), x: MR - 2, align: 'right' },
  ], true);
  y = richSubtotal(doc, y, [
    { text: (filing.net_vat_payable || 0) >= 0 ? 'Net VAT Payable' : 'Net VAT Refundable', x: ML + 4 },
    { text: fmt(Math.abs(filing.net_vat_payable || 0)), x: MR - 2, align: 'right' },
  ]);
  y += 8;

  // Notes
  if (filing.notes) {
    y = richSection(doc, y, 'NOTES & REMARKS');
    doc.setFillColor(...C_BG); doc.setDrawColor(...C_BORDER);
    const noteText = String(filing.notes);
    const noteLines = doc.splitTextToSize(noteText, 174);
    const noteH = noteLines.length * 4.5 + 8;
    doc.roundedRect(ML, y, 182, noteH, 2, 2, 'FD');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_SLATE);
    doc.text(noteLines, ML + 4, y + 7);
    y += noteH + 5;
  }

  y = richSignature(doc, y);
  richFooter(doc, company);
  savePDF(doc, `PL_Statement_${filing.customer_name || 'Client'}_${filing.filing_month || 'Month'}.pdf`);
}





// ── Milestone Button ──────────────────────────────────────────────────────────
function MilestoneBtn({ done, label, color, onClick, loading, disabled }) {
  const colors = {
    blue: 'border-blue-500 bg-blue-500 text-blue-700',
    green: 'border-green-500 bg-green-500 text-green-700',
    purple: 'border-purple-500 bg-purple-500 text-purple-700',
    amber: 'border-amber-500 bg-amber-500 text-amber-700',
  };
  const isDisabled = loading || disabled;
  const active = colors[color];
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={done}
      title={disabled && !done ? 'Submission must be done first' : undefined}
      className={`group flex min-w-[122px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${done ? 'border-gray-200 bg-gray-50 text-gray-900 shadow-sm' : isDisabled && !loading ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${done ? active : isDisabled && !loading ? 'border-gray-200 bg-white' : `${active.split(' ')[0]} bg-white`}`}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" /> : done ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <span className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-gray-300" />}
      </span>
      <span>{label}</span>
    </button>
  );
}

// ── Expanded Detail Row ───────────────────────────────────────────────────────
function DetailRow({ filing, address = '', companySettings = null }) {
  if (!filing) {
    return (
      <tr className="bg-slate-50">
        <td colSpan={5} className="px-6 py-3 text-xs text-gray-400 italic">No filing found for this month</td>
      </tr>
    );
  }
  const otherTotal = (filing.other_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const allowEdit = companySettings?.allow_edit_filed_filings !== false || filing?.status !== 'filed';

  return (
    <tr className="border-b border-gray-100">
      <td colSpan={5} className="px-6 py-4 bg-slate-50">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Financials grid */}
          <div className="flex items-stretch gap-3 flex-1 flex-wrap min-w-0">
            {/* VAT Sales Amount */}
            <div className="flex flex-col bg-white rounded-md border border-gray-200 px-3 py-2">
              <span className="text-[10px] text-gray-400 leading-tight">Vat Sales Amount</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5">AED {fmt(filing.sales_amount)}</span>
            </div>
            {/* VAT Expense Amount */}
            <div className="flex flex-col bg-white rounded-md border border-gray-200 px-3 py-2">
              <span className="text-[10px] text-gray-400 leading-tight">Vat Expense Amount</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5">AED {fmt(filing.expenses_amount)}</span>
            </div>
            {/* Other Expense */}
            <div className="flex flex-col bg-white rounded-md border border-gray-200 px-3 py-2">
              <span className="text-[10px] text-gray-400 leading-tight">Other Expense</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5">AED {fmt(otherTotal)}</span>
            </div>
            {/* Net Profit */}
            <div className="flex flex-col bg-white rounded-md border border-gray-200 px-3 py-2">
              <span className="text-[10px] text-gray-400 leading-tight">Net Profit</span>
              <span className={`text-xs font-bold mt-0.5 ${(filing.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>AED {fmt(filing.net_profit)}</span>
            </div>
            {/* VAT Payable / Refundable */}
            <div className={`flex flex-col rounded-md border px-3 py-2 ${(filing.net_vat_payable || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
              <span className={`text-[10px] leading-tight ${(filing.net_vat_payable || 0) >= 0 ? 'text-blue-500' : 'text-green-500'}`}>{(filing.net_vat_payable || 0) >= 0 ? 'VAT Payable' : 'VAT Refundable'}</span>
              <span className={`text-xs font-bold mt-0.5 ${(filing.net_vat_payable || 0) >= 0 ? 'text-blue-700' : 'text-green-700'}`}>AED {fmt(Math.abs(filing.net_vat_payable))}</span>
            </div>
          </div>
          {/* Report action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0 self-center">
            {/* Edit */}
            {allowEdit ? (
              <Link to={`/filings/${filing.id}/edit`} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-xs font-medium self-end">
                <Pencil className="w-3 h-3" /> Edit
              </Link>
            ) : (
              <button disabled title="Editing locked for Filed returns in Filing Settings" className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed text-xs font-medium self-end opacity-60">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            {/* VAT Report */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-16">VAT Report</span>
              <button onClick={() => downloadVAT(filing, address)} title="View" className="p-1.5 border border-gray-200 text-gray-500 rounded hover:bg-gray-50 transition-colors"><Eye className="w-3 h-3" /></button>
              <button onClick={() => downloadVAT(filing, address)} title="Download" className="p-1.5 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition-colors"><Download className="w-3 h-3" /></button>
              <button onClick={() => { const text = `VAT Report — ${filing.customer_name} · ${filing.filing_month}%0ASales: AED ${fmt(filing.sales_amount)}%0AExpenses: AED ${fmt(filing.expenses_amount)}%0AVAT Payable: AED ${fmt(filing.net_vat_payable)}`; window.open(`https://wa.me/?text=${text}`, '_blank'); }} title="Share on WhatsApp" className="p-1.5 border border-green-200 text-green-600 rounded hover:bg-green-50 transition-colors"><Share2 className="w-3 h-3" /></button>
            </div>
            {/* P&L Report */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-16">P&L Report</span>
              <button onClick={() => downloadPL(filing, address)} title="View" className="p-1.5 border border-gray-200 text-gray-500 rounded hover:bg-gray-50 transition-colors"><Eye className="w-3 h-3" /></button>
              <button onClick={() => downloadPL(filing, address)} title="Download" className="p-1.5 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition-colors"><Download className="w-3 h-3" /></button>
              <button onClick={() => { const otherTotal = (filing.other_expenses || []).reduce((s, e) => s + (e.amount || 0), 0); const text = `P%26L Report — ${filing.customer_name} · ${filing.filing_month}%0ASales: AED ${fmt(filing.sales_amount)}%0AExpenses: AED ${fmt((filing.expenses_amount||0) + otherTotal)}%0ANet Profit: AED ${fmt(filing.net_profit)}`; window.open(`https://wa.me/?text=${text}`, '_blank'); }} title="Share on WhatsApp" className="p-1.5 border border-green-200 text-green-600 rounded hover:bg-green-50 transition-colors"><Share2 className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FilingTrackerTab() {
  const [customers, setCustomers] = useState([]);
  const [filings, setFilings] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [busyKey, setBusyKey] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { customer, type: 'submission'|'service' }
  const [viewMode, setViewMode] = useState('simple'); // 'simple' | 'detailed'
  const [statusFilters, setStatusFilters] = useState(() => {
    try {
      const saved = sessionStorage.getItem('filing_tracker_status_filters');
      return saved ? JSON.parse(saved) : { submission: null, payment: null, service: null };
    } catch {
      return { submission: null, payment: null, service: null };
    }
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [reportModal, setReportModal] = useState(null); // { type: 'vat'|'pnl', customer, filing }
  const [shareModal, setShareModal] = useState(null); // { type: 'vat'|'pnl', customer, filing, shareUrl, period }
  const [companySettings, setCompanySettings] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownloadReport = (type, customer, filing) => {
    if (!filing) { showToast('No filing found - cannot download report.'); return; }
    const address = customer?.address || '';
    if (type === 'vat') {
      downloadVAT(filing, address, companySettings);
    } else {
      downloadPL(filing, address, companySettings);
    }
    showToast(`${type === 'vat' ? 'VAT Return' : 'P&L'} Report downloaded as PDF!`);
  };

  const handleShareReport = (type, customer, filing) => {
    if (!filing) { showToast('No filing found — cannot share report.'); return; }
    const period = filing.filing_month || `${FULL_MONTHS[selectedMonth]} ${selectedYear}`;
    const otherExp = (filing.other_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    let summary = '';
    if (type === 'vat') {
      summary = `VAT Return — ${customer.name}\nPeriod: ${period}\nSales: AED ${fmt(filing.sales_amount)}\nExpenses: AED ${fmt(filing.expenses_amount)}\nVAT Payable: AED ${fmt(filing.net_vat_payable)}`;
    } else {
      summary = `P&L Statement — ${customer.name}\nPeriod: ${period}\nSales: AED ${fmt(filing.sales_amount)}\nExpenses: AED ${fmt((filing.expenses_amount || 0) + otherExp)}\nNet Profit: AED ${fmt(filing.net_profit)}`;
    }
    setShareModal({ type, customer, filing, shareUrl: summary, period });
  };



  const load = () => {
    Promise.all([
      base44.entities.Customer.filter({ status: 'active' }),
      base44.entities.Filing.list('-created_date', 500),
      base44.entities.FilingMilestone.list('-created_date', 500),
      base44.entities.Wallet.filter({ status: 'active' }),
      base44.entities.Invoice.list('-created_date', 1000),
      base44.entities.CompanySettings.list(),
    ]).then(([c, f, m, w, inv, cs]) => {
      setCustomers(c); setFilings(f); setMilestones(m); setWallets(w); setInvoices(inv);
      if (cs && cs.length > 0) setCompanySettings(cs[0]);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading filing data:', err);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const monthKey = `${MONTHS[selectedMonth]}-${selectedYear}`;

  const filteredCustomers = useMemo(() =>
    customers.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const getMilestone = (customerId) => milestones.find(m => m.customer_id === customerId && m.month_key === monthKey);

  const getFilingForMonth = (customerId) => {
    const expectedMonth = `${FULL_MONTHS[selectedMonth]} ${selectedYear}`; // e.g. "April 2026"
    return filings.find(f => f.customer_id === customerId && f.filing_month === expectedMonth);
  };

  const getOverdueMonths = (customer) => {
    const overdue = [];
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYr = now.getFullYear();

    // Check past months (up to 12 months back)
    for (let i = 1; i <= 12; i++) {
      let mIdx = selectedMonth - i;
      let yr = selectedYear;
      while (mIdx < 0) {
        mIdx += 12;
        yr -= 1;
      }
      // Stop checking if the month is in the future
      if (yr > currentYr || (yr === currentYr && mIdx > currentMonthIdx)) continue;

      // Only check months matching customer's filing cycle
      if (!isCustomerFilingMonth(customer, mIdx)) continue;

      // Ignore months prior to customer onboarding/creation date
      if (isMonthBeforeCustomerOnboarding(customer, mIdx, yr)) continue;

      const mKey = `${MONTHS[mIdx]}-${yr}`;
      const fullMonthName = `${FULL_MONTHS[mIdx]} ${yr}`;

      const m = milestones.find(x => x.customer_id === customer.id && x.month_key === mKey);
      const f = filings.find(x => x.customer_id === customer.id && x.filing_month === fullMonthName);

      if (!m?.submission_done && !f) {
        overdue.push({ monthIndex: mIdx, year: yr, label: `${MONTHS[mIdx]} ${yr}` });
      }
      // Limit to most recent 2 pending months to keep UI clean
      if (overdue.length >= 2) break;
    }
    return overdue;
  };

  const visibleCustomerEntries = useMemo(() => {
    const currentCycleList = [];
    const carriedOverdueList = [];

    filteredCustomers.forEach(customer => {
      const isCurrentCycle = isCustomerFilingMonth(customer, selectedMonth);
      const overdueMonths = getOverdueMonths(customer);

      const milestone = getMilestone(customer.id);
      const matchesFilter = (statusFilters.submission === null || !!milestone?.submission_done === statusFilters.submission) &&
        (statusFilters.payment === null || !!milestone?.payment_done === statusFilters.payment) &&
        (statusFilters.service === null || !!milestone?.service_charge_done === statusFilters.service);

      if (!matchesFilter) return;

      if (isCurrentCycle) {
        currentCycleList.push({
          customer,
          isCarriedOverdue: false,
          overdueMonths,
        });
      } else if (overdueMonths.length > 0) {
        carriedOverdueList.push({
          customer,
          isCarriedOverdue: true,
          overdueMonths,
          targetMonth: overdueMonths[0],
        });
      }
    });

    return { currentCycleList, carriedOverdueList };
  }, [filteredCustomers, milestones, statusFilters, selectedMonth, selectedYear]);

  const ensureMilestone = async (customerId, customerName) => {
    let m = getMilestone(customerId);
    if (!m) {
      m = await base44.entities.FilingMilestone.create({ customer_id: customerId, customer_name: customerName, month_key: monthKey });
      setMilestones(prev => [...prev, m]);
    }
    return m;
  };

  const markSubmissionDone = async (customer) => {
    setBusyKey(`${customer.id}-sub`); setConfirmDialog(null);
    const m = await ensureMilestone(customer.id, customer.name);
    const updated = await base44.entities.FilingMilestone.update(m.id, { submission_done: true, submission_date: new Date().toISOString().split('T')[0] });
    setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x));

    // Check CompanySettings for vice-versa filing sync setting
    const settingsList = await base44.entities.CompanySettings.list();
    const autoSyncEnabled = settingsList.length > 0 ? settingsList[0].auto_sync_tracker_to_filing !== false : true;

    if (autoSyncEnabled) {
      const filing = getFilingForMonth(customer.id);
      if (filing && filing.status !== 'filed') {
        const updatedF = await base44.entities.Filing.update(filing.id, { status: 'filed' });
        setFilings(prev => prev.map(x => x.id === updatedF.id ? updatedF : x));
      }
    }
    showToast(`Filing for ${customer.name} marked as FILED on FTA portal.`, 'success');
    setBusyKey(null);
  };

  const revertSubmission = async (customer) => {
    if (companySettings?.allow_edit_filed_filings === false) {
      showToast('Reverting filed returns back to Draft is disabled in Company Filing Settings.', 'warning');
      return;
    }
    setBusyKey(`${customer.id}-sub`); setConfirmDialog(null);
    const m = await ensureMilestone(customer.id, customer.name);
    const updated = await base44.entities.FilingMilestone.update(m.id, {
      submission_done: false,
      submission_date: null
    });
    setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x));

    const filing = getFilingForMonth(customer.id);
    if (filing && filing.status === 'filed') {
      const updatedF = await base44.entities.Filing.update(filing.id, { status: 'draft' });
      setFilings(prev => prev.map(x => x.id === updatedF.id ? updatedF : x));
    }
    showToast(`Status for ${customer.name} reverted to Draft.`, 'info');
    setBusyKey(null);
  };

  const handleSubmission = async (customer) => {
    const m = getMilestone(customer.id);
    const filing = getFilingForMonth(customer.id);
    const isInitiated = !!m?.is_initiated || !!filing;
    const isSubmissionDone = !!m?.submission_done || filing?.status === 'filed';

    if (!isInitiated) {
      showToast('Filing must be created before marking submission.', 'warning');
      return;
    }

    if (isSubmissionDone) {
      if (companySettings?.allow_edit_filed_filings === false) {
        showToast('Reverting filed returns back to Draft is disabled in Company Filing Settings.', 'warning');
        return;
      }
      setConfirmDialog({ customer, type: 'revert_submission' });
      return;
    }

    const autoSyncEnabled = companySettings?.auto_sync_tracker_to_filing !== false;
    if (!autoSyncEnabled) {
      if (filing) {
        showToast('Direct tracker confirmation disabled in Filing Settings. Redirecting to Filing Edit to change status to Filed...', 'warning');
        setTimeout(() => {
          window.location.href = `/filings/${filing.id}/edit`;
        }, 1200);
      } else {
        showToast('Direct tracker confirmation disabled in Filing Settings. Please edit filing and change status to Filed after FTA submission.', 'warning');
      }
      return;
    }
    setConfirmDialog({ customer, type: 'submission' });
  };

  const handlePayment = async (customer) => {
    const m = getMilestone(customer.id);
    if (!m?.submission_done && !m?.payment_done) {
      alert('Payment cannot be marked before VAT submission is done.');
      return;
    }
    setBusyKey(`${customer.id}-pay`);
    const milestone = await ensureMilestone(customer.id, customer.name);
    const updated = await base44.entities.FilingMilestone.update(milestone.id, {
      payment_done: !milestone.payment_done,
      payment_date: !milestone.payment_done ? new Date().toISOString().split('T')[0] : null,
    });
    setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x)); setBusyKey(null);
  };

  const markServiceChargeDone = async (customer) => {
    setBusyKey(`${customer.id}-svc`); setConfirmDialog(null);
    const m = await ensureMilestone(customer.id, customer.name);
    const updated = await base44.entities.FilingMilestone.update(m.id, { service_charge_done: true, service_charge_date: new Date().toISOString().split('T')[0] });
    setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x)); setBusyKey(null);
  };

  const handleServiceCharge = async (customer) => {
    const m = getMilestone(customer.id);
    if (m?.service_charge_done) {
      setBusyKey(`${customer.id}-svc`);
      const updated = await base44.entities.FilingMilestone.update(m.id, { service_charge_done: false, service_charge_date: null });
      setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x)); setBusyKey(null);
    } else {
      setConfirmDialog({ customer, type: 'service' });
    }
  };

  // Returns the single vat_invoice for this customer+monthKey (if any)
  const getInvoiceForMonth = (customerId) =>
    invoices.find(inv => inv.customer_id === customerId && inv.month_key === monthKey && inv.type === 'vat_invoice');

  // Returns all service_receipts for this customer+monthKey
  const getReceiptsForMonth = (customerId) =>
    invoices.filter(inv => inv.customer_id === customerId && inv.month_key === monthKey && inv.type === 'service_receipt');

  const onInvoiceSaved = async (invoice, customer) => {
    const m = await ensureMilestone(customer.id, customer.name);
    const updated = await base44.entities.FilingMilestone.update(m.id, { invoice_id: invoice.id });
    setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x));
    setInvoiceModal(null); load();
  };

  const onReceiptSaved = async (receipt, customer) => {
    const m = await ensureMilestone(customer.id, customer.name);
    const updated = await base44.entities.FilingMilestone.update(m.id, { receipt_id: receipt.id });
    setMilestones(prev => prev.map(x => x.id === updated.id ? updated : x));
    setReceiptModal(null); load();
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); } else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); } else setSelectedMonth(m => m + 1);
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('simple')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'simple' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >Simple</button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'detailed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >Detailed</button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusFilterPanel
            filters={statusFilters}
            onChange={(key, value) => {
              const next = { ...statusFilters, [key]: value };
              setStatusFilters(next);
              try { sessionStorage.setItem('filing_tracker_status_filters', JSON.stringify(next)); } catch {}
            }}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-gray-900 w-28 text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-3 w-8"></th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Customer</th>
                <th className="text-center px-4 py-3 font-semibold text-blue-700">
                  <div>Submission</div><div className="text-xs text-gray-400 font-normal">VAT Filed</div>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-green-700">
                  <div>Payment Made</div><div className="text-xs text-gray-400 font-normal">VAT Paid</div>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-purple-700">
                  <div>Service Charge</div><div className="text-xs text-gray-400 font-normal">Our Fee Collected</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomerEntries.currentCycleList.map(({ customer, overdueMonths }, idx) => {
                const m = getMilestone(customer.id);
                const filing = getFilingForMonth(customer.id);
                const isInitiated = !!m?.is_initiated || !!filing;
                const isExpanded = expandedRows.has(customer.id) || viewMode === 'detailed';
                const isEven = idx % 2 === 0;

                return (
                  <div key={customer.id} className="contents">
                    <tr className={`transition-colors border-b ${
                      isEven
                        ? 'bg-slate-50/80 hover:bg-slate-100/90 border-l-4 border-l-purple-500 border-b-slate-200'
                        : 'bg-white hover:bg-blue-50/40 border-l-4 border-l-blue-500 border-b-gray-200'
                    }`}>
                      <td className="px-3 py-3.5 text-center">
                        <button onClick={() => toggleRow(customer.id)} className="text-gray-400 hover:text-gray-700 transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          {overdueMonths.map(ov => (
                            <button
                              key={ov.label}
                              onClick={() => { setSelectedMonth(ov.monthIndex); setSelectedYear(ov.year); }}
                              title={`Click to switch view to ${ov.label}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all cursor-pointer shadow-xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              Filing Pending - {MONTHS[ov.monthIndex]}
                            </button>
                          ))}
                        </div>
                        {customer.trn && <p className="text-xs text-gray-400 mt-0.5">{customer.trn}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-2">
                            {(() => {
                              const isSubmissionDone = !!m?.submission_done || filing?.status === 'filed';
                              return (
                                <MilestoneBtn
                                  done={isSubmissionDone}
                                  label={isSubmissionDone ? 'Submitted' : isInitiated ? 'Confirm Done' : 'Not Initiated'}
                                  color={isSubmissionDone ? 'green' : isInitiated ? 'amber' : 'blue'}
                                  loading={busyKey === `${customer.id}-sub`}
                                  disabled={!isInitiated}
                                  onClick={() => handleSubmission(customer)}
                                />
                              );
                            })()}
                            {(() => {
                              const existingInvoice = getInvoiceForMonth(customer.id);
                              const canCreate = m?.submission_done && !existingInvoice;
                              return (
                                <button
                                  disabled={!canCreate}
                                  onClick={() => setInvoiceModal({ customer, filing: getFilingForMonth(customer.id) })}
                                  title={existingInvoice ? 'Invoice already created' : !m?.submission_done ? 'Submit first' : 'Create invoice'}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${canCreate ? 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50 cursor-pointer shadow-xs' : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'}`}
                                >
                                  {existingInvoice ? '✓ Invoiced' : 'Invoice'}
                                </button>
                              );
                            })()}
                          </div>
                          <div className="text-[11px] text-gray-400 h-4 leading-4">{m?.submission_date || ''}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <MilestoneBtn
                            done={!!m?.payment_done}
                            label={m?.payment_done ? 'Paid' : 'Mark Paid'}
                            color="green"
                            loading={busyKey === `${customer.id}-pay`}
                            onClick={() => handlePayment(customer)}
                            disabled={!m?.submission_done && !m?.payment_done}
                          />
                          <div className="text-[11px] text-gray-400 h-4 leading-4">{m?.payment_date || ''}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-2">
                            <MilestoneBtn done={!!m?.service_charge_done} label={m?.service_charge_done ? 'Collected' : 'Mark Done'} color="purple"
                              loading={busyKey === `${customer.id}-svc`} onClick={() => handleServiceCharge(customer)} />
                            {(() => {
                              const receipts = getReceiptsForMonth(customer.id);
                              const inv = getInvoiceForMonth(customer.id);
                              const receiptsTotal = receipts.reduce((s, r) => s + (r.total || 0), 0);
                              const invTotal = inv ? (inv.total || 0) : (customer.service_fee || 300);
                              const isFullyPaid = (inv && inv.status === 'paid') || (receiptsTotal >= invTotal - 0.01 && receiptsTotal > 0);
                              const canCreate = !!m?.service_charge_done;

                              if (isFullyPaid) {
                                return (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-xl" title="Invoice is fully paid">
                                    ✓ Receipts ({receipts.length})
                                  </span>
                                );
                              }

                              return (
                                <button
                                  disabled={!canCreate}
                                  onClick={() => setReceiptModal({ customer, filing: getFilingForMonth(customer.id) })}
                                  title={!canCreate ? 'Mark service charge done first' : 'Create receipt'}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${canCreate ? 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50 cursor-pointer shadow-xs' : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'}`}
                                >
                                  {receipts.length > 0 ? `Receipt (${receipts.length})` : 'Receipt'}
                                </button>
                              );
                            })()}
                          </div>
                          <div className="text-[11px] text-gray-400 h-4 leading-4">{m?.service_charge_date || ''}</div>
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Expanded Sub-Row */}
                    {isExpanded && (
                      <tr className={`transition-colors border-b-2 ${
                        isEven
                          ? 'bg-slate-100/70 border-l-4 border-l-purple-500 border-b-purple-200/80 border-t border-t-slate-200/80'
                          : 'bg-blue-50/30 border-l-4 border-l-blue-500 border-b-blue-200/80 border-t border-t-blue-100/80'
                      }`}>
                        <td colSpan={5} className="px-6 py-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            {/* 5 Financial Data Cards */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 shadow-xs min-w-[130px]">
                                <p className="text-[11px] font-medium text-gray-400">Vat Sales Amount</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">AED {filing ? fmt(filing.sales_amount) : '0.00'}</p>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 shadow-xs min-w-[130px]">
                                <p className="text-[11px] font-medium text-gray-400">Vat Expense Amount</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">AED {filing ? fmt(filing.expenses_amount) : '0.00'}</p>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 shadow-xs min-w-[130px]">
                                <p className="text-[11px] font-medium text-gray-400">Other Expense</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">AED {filing && filing.other_expenses ? fmt(filing.other_expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)) : '0.00'}</p>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 shadow-xs min-w-[130px]">
                                <p className="text-[11px] font-medium text-gray-400">Net Profit</p>
                                <p className="text-sm font-bold text-emerald-600 mt-0.5">AED {filing ? fmt(filing.net_profit) : '0.00'}</p>
                              </div>
                              <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-3.5 py-2 shadow-xs min-w-[130px]">
                                <p className="text-[11px] font-semibold text-blue-600">VAT Payable</p>
                                <p className="text-sm font-bold text-blue-700 mt-0.5">AED {filing ? fmt(filing.net_vat_payable) : '0.00'}</p>
                              </div>
                            </div>

                            {/* Action Bar: Edit + 2 Vertically Stacked Report Sets */}
                            <div className="flex items-center gap-3 shrink-0 ml-auto bg-white/90 border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
                              {filing ? (
                                companySettings?.allow_edit_filed_filings === false && filing.status === 'filed' ? (
                                  <button
                                    disabled
                                    title="Editing locked for Filed returns in Filing Settings"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-400 cursor-not-allowed opacity-60"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Edit</span>
                                  </button>
                                ) : (
                                  <Link
                                    to={`/filings/${filing.id}/edit`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Edit</span>
                                  </Link>
                                )
                              ) : (
                                <Link
                                  to={`/filings/new?customerId=${customer.id}&filingMonth=${FULL_MONTHS[selectedMonth]} ${selectedYear}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                                  <span>+ Create</span>
                                </Link>
                              )}

                              <div className="w-px h-9 bg-gray-200" />

                              {/* 2 Vertically Stacked Report Sets */}
                              <div className="flex flex-col gap-1 text-xs">
                                {/* Set 1: VAT Report */}
                                <div className="flex items-center gap-1.5">
                                  <span className="w-8 text-right font-semibold text-gray-500 text-[11px]">VAT:</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setReportModal({ type: 'vat', customer, filing })}
                                      title="View VAT Report"
                                      className="p-1 rounded-md border border-gray-200 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => filing ? handleDownloadReport('vat', customer, filing) : null}
                                      disabled={!filing}
                                      title={filing ? 'Download VAT Report' : 'Filing not created'}
                                      className={`p-1 rounded-md border transition-colors ${
                                        filing
                                          ? 'border-gray-200 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 cursor-pointer'
                                          : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                      }`}
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => filing ? handleShareReport('vat', customer, filing) : null}
                                      disabled={!filing}
                                      title={filing ? 'Share VAT Report' : 'Filing not created'}
                                      className={`p-1 rounded-md border transition-colors ${
                                        filing
                                          ? 'border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 cursor-pointer'
                                          : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                      }`}
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Set 2: P&L Report */}
                                <div className="flex items-center gap-1.5">
                                  <span className="w-8 text-right font-semibold text-gray-500 text-[11px]">P&L:</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setReportModal({ type: 'pnl', customer, filing })}
                                      title="View P&L Report"
                                      className="p-1 rounded-md border border-gray-200 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => filing ? handleDownloadReport('pnl', customer, filing) : null}
                                      disabled={!filing}
                                      title={filing ? 'Download P&L Report' : 'Filing not created'}
                                      className={`p-1 rounded-md border transition-colors ${
                                        filing
                                          ? 'border-gray-200 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 cursor-pointer'
                                          : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                      }`}
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => filing ? handleShareReport('pnl', customer, filing) : null}
                                      disabled={!filing}
                                      title={filing ? 'Share P&L Report' : 'Filing not created'}
                                      className={`p-1 rounded-md border transition-colors ${
                                        filing
                                          ? 'border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 cursor-pointer'
                                          : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                      }`}
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </div>
                );
              })}

              {/* Carried-forward section: Customers from previous unfiled cycle months */}
              {visibleCustomerEntries.carriedOverdueList.length > 0 && (
                <tr className="bg-red-50/70 border-y border-red-200">
                  <td colSpan={5} className="px-4 py-2.5 text-xs font-bold text-red-800 uppercase tracking-wider">
                    Carried-Forward Pending Filings (Previous Months)
                  </td>
                </tr>
              )}

              {visibleCustomerEntries.carriedOverdueList.map(({ customer, targetMonth }) => {
                const isExpanded = expandedRows.has(customer.id) || viewMode === 'detailed';

                return (
                  <tr key={`carried-${customer.id}`} className="bg-red-50/20 hover:bg-red-50/40 transition-colors border-b border-red-100">
                    <td className="px-3 py-3.5 text-center">
                      <button onClick={() => toggleRow(customer.id)} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <button
                          onClick={() => { setSelectedMonth(targetMonth.monthIndex); setSelectedYear(targetMonth.year); }}
                          title={`Click to jump to ${targetMonth.label}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-all cursor-pointer shadow-xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Filing Pending - {FULL_MONTHS[targetMonth.monthIndex]}
                        </button>
                      </div>
                      {customer.trn && <p className="text-xs text-gray-400 mt-0.5">{customer.trn}</p>}
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-center text-xs text-gray-500">
                      <button
                        onClick={() => { setSelectedMonth(targetMonth.monthIndex); setSelectedYear(targetMonth.year); }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline bg-white border border-blue-200 px-3 py-1.5 rounded-lg"
                      >
                        Switch view to {FULL_MONTHS[targetMonth.monthIndex]} {targetMonth.year} to file &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}

              {visibleCustomerEntries.currentCycleList.length === 0 && visibleCustomerEntries.carriedOverdueList.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No customers match the selected filters for {MONTHS[selectedMonth]} {selectedYear}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Are you sure?</h2>
            <p className="text-sm text-gray-500 mb-5">
              {confirmDialog.type === 'submission'
                ? 'This will mark the VAT submission as done.'
                : 'This will mark the service charge as collected.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >Cancel</button>
              <button
                onClick={() => confirmDialog.type === 'submission'
                  ? markSubmissionDone(confirmDialog.customer)
                  : markServiceChargeDone(confirmDialog.customer)
                }
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >OK</button>
            </div>
          </div>
        </div>
      )}

      {invoiceModal && (
        <InvoiceModal customer={invoiceModal.customer} filing={invoiceModal.filing} monthKey={monthKey}
          onSaved={(inv) => onInvoiceSaved(inv, invoiceModal.customer)} onClose={() => setInvoiceModal(null)} />
      )}
      {receiptModal && (
        <ReceiptModal customer={receiptModal.customer} filing={receiptModal.filing} monthKey={monthKey}
          onSaved={(rcp) => onReceiptSaved(rcp, receiptModal.customer)} onClose={() => setReceiptModal(null)} />
      )}

      {/* Report View Modal */}
      {reportModal && (() => {
        const f = reportModal.filing;
        const hasData = f && (
          (parseFloat(f.sales_amount) || 0) > 0 ||
          (parseFloat(f.expenses_amount) || 0) > 0 ||
          (parseFloat(f.net_profit) || 0) > 0 ||
          (parseFloat(f.net_vat_payable) || 0) > 0
        );
        const sales = parseFloat(f?.sales_amount) || 0;
        const salesVat = parseFloat(f?.sales_vat) || sales * 0.05;
        const expenses = parseFloat(f?.expenses_amount) || 0;
        const expensesVat = parseFloat(f?.expenses_vat) || expenses * 0.05;
        const otherExp = f?.other_expenses ? f.other_expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0) : 0;
        const netVat = parseFloat(f?.net_vat_payable) || (salesVat - expensesVat);
        const netProfit = parseFloat(f?.net_profit) || (sales - expenses - otherExp);

        return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {reportModal.type === 'vat' ? 'VAT Return Report' : 'Profit & Loss Statement'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customer: <strong>{reportModal.customer.name}</strong> • Period: <strong>{FULL_MONTHS[selectedMonth]} {selectedYear}</strong>
                </p>
                <div className="mt-1.5">
                  {!f ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      Filing Not Created
                    </span>
                  ) : f.status === 'filed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Filed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Draft
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setReportModal(null)} className="text-gray-400 hover:text-gray-600 text-lg font-semibold cursor-pointer">✕</button>
            </div>

            {/* No filing at all */}
            {!f && (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                  <Info className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">No Filing Found</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    No filing record exists for <strong>{reportModal.customer.name}</strong> in <strong>{FULL_MONTHS[selectedMonth]} {selectedYear}</strong>. Create a filing to generate this report.
                  </p>
                </div>
                <Link
                  to={`/filings/new?customerId=${reportModal.customer.id}&filingMonth=${FULL_MONTHS[selectedMonth]} ${selectedYear}`}
                  onClick={() => setReportModal(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Filing for {FULL_MONTHS[selectedMonth]} {selectedYear}
                </Link>
              </div>
            )}

            {/* Filing exists but no financial data entered */}
            {f && !hasData && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-800">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Financial amounts not entered yet</p>
                  <p className="text-blue-700 mt-0.5">This filing exists (status: <strong>{f.status || 'draft'}</strong>) but sales and expense amounts are zero. Edit the filing to add VAT data.</p>
                  <Link
                    to={`/filings/${f.id}/edit`}
                    onClick={() => setReportModal(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline mt-2"
                  >
                    ✏️ Edit Filing to Add Financial Data →
                  </Link>
                </div>
              </div>
            )}

            {/* Data section: only show when filing exists */}
            {f && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3 text-sm mb-6">
              <div className="flex justify-between items-center text-xs text-gray-500 border-b border-gray-200 pb-2">
                <span>TRN: {reportModal.customer.trn || 'N/A'}</span>
                <span>Filing Month: {FULL_MONTHS[selectedMonth]} {selectedYear}</span>
              </div>

              {reportModal.type === 'vat' ? (
                <>
                  <div className="flex justify-between font-medium text-gray-700">
                    <span>VAT Sales Amount:</span>
                    <span className={`font-bold ${sales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(sales)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700">
                    <span>Sales VAT (5%):</span>
                    <span className={`font-bold ${salesVat > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(salesVat)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700 border-t border-gray-200 pt-2">
                    <span>VAT Expense Amount:</span>
                    <span className={`font-bold ${expenses > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(expenses)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700">
                    <span>Expense VAT (5%):</span>
                    <span className={`font-bold ${expensesVat > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(expensesVat)}</span>
                  </div>
                  <div className={`flex justify-between items-center rounded-lg p-3 mt-3 ${netVat > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100 border border-gray-200'}`}>
                    <span className={`font-semibold ${netVat > 0 ? 'text-blue-700' : 'text-gray-500'}`}>Net VAT Payable:</span>
                    <span className={`font-extrabold text-base ${netVat > 0 ? 'text-blue-700' : 'text-gray-400'}`}>AED {fmt(netVat)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-medium text-gray-700">
                    <span>Gross Sales:</span>
                    <span className={`font-bold ${sales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(sales)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700">
                    <span>Direct Expenses:</span>
                    <span className={`font-bold ${expenses > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(expenses)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700 border-t border-gray-200 pt-2">
                    <span>Other Expenses:</span>
                    <span className={`font-bold ${otherExp > 0 ? 'text-gray-900' : 'text-gray-400'}`}>AED {fmt(otherExp)}</span>
                  </div>
                  <div className={`flex justify-between items-center rounded-lg p-3 mt-3 ${netProfit > 0 ? 'bg-emerald-50 border border-emerald-200' : netProfit < 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-100 border border-gray-200'}`}>
                    <span className={`font-semibold ${netProfit > 0 ? 'text-emerald-700' : netProfit < 0 ? 'text-red-700' : 'text-gray-500'}`}>Net Operating Profit:</span>
                    <span className={`font-extrabold text-base ${netProfit > 0 ? 'text-emerald-700' : netProfit < 0 ? 'text-red-700' : 'text-gray-400'}`}>AED {fmt(netProfit)}</span>
                  </div>
                </>
              )}
            </div>
            )}

            {f && (
            <div className="flex justify-end gap-2 flex-wrap">
              <button
                onClick={() => handleShareReport(reportModal.type, reportModal.customer, f)}
                className="px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button
                onClick={() => handleDownloadReport(reportModal.type, reportModal.customer, f)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            )}
            <div className="flex justify-end mt-3">
              <button onClick={() => setReportModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium cursor-pointer">Close</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" /> Share {shareModal.type.toUpperCase()} Report
              </h3>
              <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-gray-600 text-base font-semibold cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-gray-500 mb-3">Share report for <strong>{shareModal.customer.name}</strong> ({shareModal.period})</p>

            <div className="space-y-2 mb-5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareModal.shareUrl);
                  showToast('Share link copied to clipboard!');
                  setShareModal(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer"
              >
                <span className="flex items-center gap-2"><Copy className="w-4 h-4 text-blue-500" /> Copy Shareable Link</span>
                <span className="text-xs text-blue-600 font-semibold">Copy</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`VAT Manager Report (${shareModal.type.toUpperCase()}) for ${shareModal.customer.name} [${shareModal.period}]: ${shareModal.shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-sm font-medium text-emerald-800 cursor-pointer"
              >
                <span className="flex items-center gap-2">📱 Send via WhatsApp</span>
                <span className="text-xs text-emerald-600 font-semibold">Share</span>
              </a>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShareModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
      {receiptModal && (
        <ReceiptModal
          customer={receiptModal.customer}
          filing={receiptModal.filing}
          monthKey={monthKey}
          wallets={wallets}
          invoiceTotal={getInvoiceForMonth(receiptModal.customer.id)?.total ?? null}
          alreadyReceiptedTotal={getReceiptsForMonth(receiptModal.customer.id).reduce((s, r) => s + (r.total || 0), 0)}
          onSaved={(rec) => onReceiptSaved(rec, receiptModal.customer)}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </div>
  );
}