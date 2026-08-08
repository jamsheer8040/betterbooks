import { jsPDF } from 'jspdf';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return d; }
};

function addCompanyLogo(doc, logoUrl, x, y, width, height) {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => { try { doc.addImage(image, x, y, width, height); } catch { } resolve(); };
    image.onerror = () => resolve();
    image.src = logoUrl;
  });
}

function renderInvoiceExtras(doc, inv, company, x, y, width) {
  const display = inv.display_options || {};
  const show = (key) => display[key] !== false;
  const lines = [];
  if (show('custom_1') && company?.custom_field_1_label && inv.custom_field_1) lines.push(`${company.custom_field_1_label}: ${inv.custom_field_1}`);
  if (show('custom_2') && company?.custom_field_2_label && inv.custom_field_2) lines.push(`${company.custom_field_2_label}: ${inv.custom_field_2}`);
  if (show('bank') && (company?.bank_name || company?.bank_account_name || company?.bank_account_number || company?.bank_iban)) {
    lines.push(`Bank Details: ${[company.bank_name, company.bank_account_name, company.bank_account_number && `A/C ${company.bank_account_number}`, company.bank_iban && `IBAN ${company.bank_iban}`].filter(Boolean).join(' · ')}`);
  }
  if (show('terms') && company?.invoice_terms_conditions) lines.push(`Terms & Conditions: ${company.invoice_terms_conditions}`);
  if (!lines.length) return y;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  lines.forEach(line => { const wrapped = doc.splitTextToSize(line, width); doc.text(wrapped, x, y); y += wrapped.length * 4 + 2; });
  return y;
}

// ── STANDARD TEMPLATE (matches sample design) ─────────────────────────────────
async function buildStandardDoc(inv, company) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, mL = 15, mR = 195;
  const isReceipt = inv.type === 'service_receipt';
  const vatEnabled = company?.vat_enabled === true;
  const vatRate = company?.vat_rate ?? 5;

  // Top cyan/teal accent line
  doc.setFillColor(0, 174, 199);
  doc.rect(0, 0, W, 2, 'F');

  let y = 12;
  if (inv.display_options?.logo !== false && company?.logo_url) await addCompanyLogo(doc, company.logo_url, 165, 7, 30, 18);

  // Company info (left)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(company?.company_name || 'VAT Manager', mL, y); y += 5;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  if (company?.address) { doc.text(company.address, mL, y); y += 4.5; }
  if (company?.phone)   { doc.text(company.phone, mL, y); y += 4.5; }
  if (company?.email)   { doc.text(company.email, mL, y); y += 4.5; }
  if (company?.website) { doc.text(company.website, mL, y); y += 4.5; }
  if (company?.trn)     { doc.text(`TRN ${company.trn}`, mL, y); y += 4.5; }

  // Title
  y = Math.max(y, 38) + 4;
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 174, 199);
  doc.text(isReceipt ? 'Payment Receipt' : vatEnabled ? 'Tax Invoice' : 'Invoice', mL, y);

  // Horizontal divider
  y += 5;
  doc.setDrawColor(0, 174, 199); doc.setLineWidth(0.5);
  doc.line(mL, y, mR, y);
  y += 7;

  // Bill To (left) + Invoice Meta (right)
  const billY = y;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text('BILL TO', mL, y); y += 5;
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
  doc.text(inv.customer_name || '', mL, y); y += 5;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  if (inv.customer_address) { const lines = doc.splitTextToSize(inv.customer_address, 85); doc.text(lines, mL, y); y += lines.length * 4.5; }
  if (inv.customer_trn) { doc.text(`TRN ${inv.customer_trn}`, mL, y); y += 4.5; }

  // Meta right
  const metaX = 130;
  let my = billY;
  const metaRows = [
    ['INVOICE NO.', inv.invoice_number || ''],
    ['DATE', formatDate(inv.invoice_date)],
    ['DUE DATE', formatDate(inv.due_date || inv.invoice_date)],
    ['TERMS', 'Due on receipt'],
  ];
  metaRows.forEach(([label, val]) => {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(label, metaX, my, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    doc.text(val, mR, my, { align: 'right' });
    my += 6;
  });

  // Table header
  y = Math.max(y, my) + 8;
  doc.setFillColor(0, 174, 199); doc.rect(mL, y, 180, 8, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', mL + 2, y + 5.5);
  if (vatEnabled) doc.text('VAT', 130, y + 5.5, { align: 'center' });
  doc.text('QTY', vatEnabled ? 148 : 135, y + 5.5, { align: 'center' });
  doc.text('UNIT RATE', 168, y + 5.5, { align: 'right' });
  doc.text('TOTAL', mR, y + 5.5, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
  (inv.line_items || []).forEach((item, i) => {
    const desc = doc.splitTextToSize(item.description || '', 100);
    const rowH = Math.max(9, desc.length * 5 + 4);
    if (i % 2 === 0) { doc.setFillColor(245, 252, 254); doc.rect(mL, y, 180, rowH, 'F'); }
    doc.setDrawColor(220, 240, 245); doc.line(mL, y + rowH, mR, y + rowH);
    doc.setFontSize(8.5);
    doc.text(desc, mL + 2, y + 6);
    if (vatEnabled) doc.text(`${item.tax_rate ?? vatRate}%`, 130, y + 6, { align: 'center' });
    doc.text(String(item.quantity ?? 1), vatEnabled ? 148 : 135, y + 6, { align: 'center' });
    doc.text(fmt(item.amount), 168, y + 6, { align: 'right' });
    doc.text(fmt(item.amount), mR, y + 6, { align: 'right' });
    y += rowH;
  });

  y += 8;
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
  doc.line(mL, y, mR, y);
  y += 6;

  // Totals (right side) + bank info (left side)
  const totX = 140;
  const bankY = y;
  if (company?.notes) {
    doc.setFontSize(7.5); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
    const bankLines = doc.splitTextToSize(company.notes, 100);
    doc.text(bankLines, mL, bankY + 5);
  }

  doc.setFontSize(8.5); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
  doc.text('SUBTOTAL', totX, y); doc.text(fmt(inv.subtotal || 0), mR, y, { align: 'right' }); y += 6;
  if (vatEnabled) { doc.text('VAT TOTAL', totX, y); doc.text(fmt(inv.vat_amount || 0), mR, y, { align: 'right' }); y += 6; }
  doc.text('TOTAL', totX, y); doc.text(fmt(inv.total || 0), mR, y, { align: 'right' }); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text('BALANCE DUE', totX, y);
  doc.setFontSize(13); doc.setTextColor(0, 174, 199);
  doc.text(`AED ${fmt(inv.total || 0)}`, mR, y, { align: 'right' });
  y += 12;

  if (vatEnabled) {
    doc.setFillColor(0, 174, 199); doc.rect(mL, y, 180, 7, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('VAT SUMMARY', mL + 2, y + 5);
    y += 7;
    doc.setFillColor(245, 252, 254); doc.rect(mL, y, 180, 8, 'F');
    doc.setDrawColor(200, 230, 240); doc.rect(mL, y, 180, 8, 'D');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('RATE', mL + 30, y + 5.5, { align: 'center' });
    doc.text('VAT', 130, y + 5.5, { align: 'center' });
    doc.text('NET', mR - 5, y + 5.5, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(`VAT @ ${vatRate}%`, mL + 30, y + 5.5, { align: 'center' });
    doc.text(fmt(inv.vat_amount || 0), 130, y + 5.5, { align: 'center' });
    doc.text(fmt(inv.subtotal || 0), mR - 5, y + 5.5, { align: 'right' });
  }

  y += 5;
  renderInvoiceExtras(doc, inv, company, mL, y, 180);

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(0, 174, 199); doc.rect(0, pageH - 8, W, 8, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255);
  doc.text(company?.company_name || 'VAT Manager', mL, pageH - 3);
  doc.text('Page 1', mR, pageH - 3, { align: 'right' });

  return doc;
}

export async function downloadStandardPDF(inv, company) {
  const doc = await buildStandardDoc(inv, company);
  doc.save(`${inv.type === 'service_receipt' ? 'Receipt' : 'Invoice'}_${inv.invoice_number}.pdf`);
}

// ── DETAILED TEMPLATE ─────────────────────────────────────────────────────────
async function buildDetailedDoc(inv, company) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, mL = 15, mR = 195;
  const isReceipt = inv.type === 'service_receipt';
  const vatEnabled = company?.vat_enabled === true;
  const vatRate = company?.vat_rate ?? 5;

  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(37, 99, 235); doc.rect(0, 42, W, 3, 'F');
  if (inv.display_options?.logo !== false && company?.logo_url) await addCompanyLogo(doc, company.logo_url, 166, 6, 26, 20);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24); doc.setFont('helvetica', 'bold');
  doc.text(isReceipt ? 'PAYMENT RECEIPT' : vatEnabled ? 'TAX INVOICE' : 'INVOICE', mL, 18);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`# ${inv.invoice_number || ''}`, mL, 27);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
  doc.text(`AED ${fmt(inv.total || 0)}`, mR, 22, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
  doc.text('Balance Due', mR, 30, { align: 'right' });
  doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text(`${company?.company_name || 'VAT Manager'}  ·  ${formatDate(inv.invoice_date)}`, mL, 36);
  doc.setTextColor(0, 0, 0);

  let y = 52;
  // Two column info
  doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
  doc.text('BILL TO', mL, y);
  doc.text('INVOICE DETAILS', 110, y);
  y += 5;
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(inv.customer_name || '', mL, y);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  if (inv.customer_trn) { doc.text(`TRN: ${inv.customer_trn}`, mL, y + 6); }
  if (inv.customer_address) { const lines = doc.splitTextToSize(inv.customer_address, 80); doc.text(lines, mL, y + 12); }

  const detailRows = [
    ['Invoice No.', inv.invoice_number || ''],
    ['Invoice Date', formatDate(inv.invoice_date)],
    ['Due Date', formatDate(inv.due_date || inv.invoice_date)],
    ['Month', inv.month_key || ''],
  ];
  let dy = y;
  detailRows.forEach(([lbl, val]) => {
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text(lbl, 110, dy);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
    doc.text(val, mR, dy, { align: 'right' });
    dy += 6;
  });

  y += 30;
  doc.setFillColor(15, 23, 42); doc.rect(mL, y, 180, 8, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('#', mL + 2, y + 5.5);
  doc.text('DESCRIPTION', mL + 10, y + 5.5);
  doc.text('AMOUNT (AED)', mR, y + 5.5, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
  (inv.line_items || []).forEach((item, i) => {
    const desc = doc.splitTextToSize(item.description || '', 140);
    const rowH = Math.max(9, desc.length * 5 + 4);
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(mL, y, 180, rowH, 'F'); }
    doc.setDrawColor(226, 232, 240); doc.line(mL, y + rowH, mR, y + rowH);
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); doc.text(String(i + 1), mL + 2, y + 6);
    doc.setTextColor(15, 23, 42); doc.text(desc, mL + 10, y + 6);
    doc.setFont('helvetica', 'bold'); doc.text(`AED ${fmt(item.amount)}`, mR, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowH;
  });

  y += 6;
  const totRows = [
    ['Subtotal', fmt(inv.subtotal || 0), false],
    ...(vatEnabled ? [[`VAT (${vatRate}%)`, fmt(inv.vat_amount || 0), false]] : []),
    ['TOTAL', `AED ${fmt(inv.total || 0)}`, true],
  ];
  totRows.forEach(([lbl, val, bold]) => {
    if (bold) { doc.setFillColor(37, 99, 235); doc.roundedRect(mL, y, 180, 9, 1, 1, 'F'); doc.setTextColor(255, 255, 255); }
    else { doc.setTextColor(71, 85, 105); }
    doc.setFontSize(bold ? 10 : 8.5); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(lbl, mL + 3, y + 6);
    doc.text(val, mR - 2, y + 6, { align: 'right' });
    y += 10;
  });

  renderInvoiceExtras(doc, inv, company, mL, y + 4, 180);

  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(248, 250, 252); doc.rect(0, pageH - 12, W, 12, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
  doc.text(company?.company_name || 'VAT Manager', mL, pageH - 4);
  if (company?.trn) doc.text(`TRN: ${company.trn}`, W / 2, pageH - 4, { align: 'center' });
  doc.text('Page 1', mR, pageH - 4, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  return doc;
}

export async function downloadDetailedPDF(inv, company) {
  const doc = await buildDetailedDoc(inv, company);
  doc.save(`${inv.type === 'service_receipt' ? 'Receipt' : 'Invoice'}_${inv.invoice_number}.pdf`);
}

// ── MODERN TEMPLATE ───────────────────────────────────────────────────────────
async function buildModernDoc(inv, company) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, mL = 18, mR = 192;
  const isReceipt = inv.type === 'service_receipt';
  const vatEnabled = company?.vat_enabled === true;
  const vatRate = company?.vat_rate ?? 5;

  // Gradient-style two-tone header
  doc.setFillColor(16, 185, 129); doc.rect(0, 0, W / 2, 50, 'F');
  doc.setFillColor(5, 150, 105); doc.rect(W / 2, 0, W / 2, 50, 'F');
  if (inv.display_options?.logo !== false && company?.logo_url) await addCompanyLogo(doc, company.logo_url, 166, 30, 24, 15);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text(isReceipt ? 'Receipt' : 'Invoice', mL, 22);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(inv.invoice_number || '', mL, 32);
  doc.setFontSize(9); doc.text(company?.company_name || 'VAT Manager', mL, 43);

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Date', mR - 40, 18, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.text(formatDate(inv.invoice_date), mR, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.text('Due', mR - 40, 27, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.text(formatDate(inv.due_date || inv.invoice_date), mR, 27, { align: 'right' });
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(`AED ${fmt(inv.total || 0)}`, mR, 42, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  let y = 62;
  // Bill to box
  doc.setFillColor(240, 253, 244); doc.roundedRect(mL, y, 80, 28, 2, 2, 'F');
  doc.setFontSize(7); doc.setTextColor(21, 128, 61); doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO', mL + 4, y + 6);
  doc.setFontSize(9.5); doc.setTextColor(15, 23, 42);
  doc.text(inv.customer_name || '', mL + 4, y + 13);
  doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
  if (inv.customer_trn) doc.text(`TRN: ${inv.customer_trn}`, mL + 4, y + 20);

  y += 36;
  // Items table
  doc.setFillColor(16, 185, 129); doc.roundedRect(mL, y, 174, 8, 1, 1, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('ITEM', mL + 4, y + 5.5);
  doc.text('AMOUNT', mR, y + 5.5, { align: 'right' });
  y += 8;
  (inv.line_items || []).forEach((item, i) => {
    const desc = doc.splitTextToSize(item.description || '', 140);
    const rowH = Math.max(9, desc.length * 5 + 4);
    if (i % 2 === 0) { doc.setFillColor(240, 253, 244); doc.rect(mL, y, 174, rowH, 'F'); }
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(desc, mL + 4, y + 6);
    doc.setFont('helvetica', 'bold'); doc.text(`AED ${fmt(item.amount)}`, mR, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowH;
  });

  y += 8;
  // Totals
  doc.setFillColor(240, 253, 244); doc.roundedRect(mL + 80, y, 94, 30, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Subtotal', mL + 84, y + 8); doc.text(`AED ${fmt(inv.subtotal || 0)}`, mR, y + 8, { align: 'right' });
  if (vatEnabled) doc.text(`VAT (${vatRate}%)`, mL + 84, y + 16); if (vatEnabled) doc.text(`AED ${fmt(inv.vat_amount || 0)}`, mR, y + 16, { align: 'right' });
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
  doc.text('TOTAL', mL + 84, y + (vatEnabled ? 26 : 18)); doc.text(`AED ${fmt(inv.total || 0)}`, mR, y + (vatEnabled ? 26 : 18), { align: 'right' });

  renderInvoiceExtras(doc, inv, company, mL, y + 38, 174);

  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(16, 185, 129); doc.rect(0, pageH - 8, W, 8, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255);
  doc.text(company?.company_name || 'VAT Manager', mL, pageH - 3);
  doc.text('Page 1', mR, pageH - 3, { align: 'right' });

  return doc;
}

export async function downloadModernPDF(inv, company) {
  const doc = await buildModernDoc(inv, company);
  doc.save(`${inv.type === 'service_receipt' ? 'Receipt' : 'Invoice'}_${inv.invoice_number}.pdf`);
}

export async function downloadInvoicePDF(inv, company, template = 'standard') {
  if (template === 'detailed') return downloadDetailedPDF(inv, company);
  if (template === 'modern') return downloadModernPDF(inv, company);
  return downloadStandardPDF(inv, company);
}

async function buildInvoiceDoc(inv, company, template = 'standard') {
  if (template === 'detailed') return buildDetailedDoc(inv, company);
  if (template === 'modern') return buildModernDoc(inv, company);
  return buildStandardDoc(inv, company);
}

// Returns a blob URL for previewing the invoice PDF inline (e.g. in an <iframe>)
export async function getInvoicePDFPreviewUrl(inv, company, template = 'standard') {
  const doc = await buildInvoiceDoc(inv, company, template);
  return doc.output('bloburl');
}