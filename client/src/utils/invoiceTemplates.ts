import jsPDF from 'jspdf';
import { Invoice, CompanySettings } from '@/types';

export const INVOICE_TEMPLATES = [
  { id: 'standard', name: 'Standard Professional', preview: 'Clean modern layout with full VAT breakdown' },
  { id: 'classic', name: 'Classic Corporate', preview: 'Traditional corporate header with prominent bank details' },
  { id: 'minimal', name: 'Minimalist Clean', preview: 'Simple monochrome layout with crisp lines' },
];

export async function generateInvoicePDF(invoice: Invoice, company?: CompanySettings | null, templateId: string = 'standard') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  let y = 20;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.company_name || 'Better Books Tax Consultancy LLC', 15, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`TRN: ${company?.trn || '100234567800003'} | Email: ${company?.email || 'info@betterbooks.ae'}`, 15, 22);

  // Invoice Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  y = 42;
  doc.text('TAX INVOICE', 15, y);

  // Meta details (Right aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 15, y - 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-GB')}`, pageWidth - 15, y + 2, { align: 'right' });
  if (invoice.due_date) {
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-GB')}`, pageWidth - 15, y + 8, { align: 'right' });
  }

  // Bill To Box
  y = 56;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 90, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 90, 28, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', 19, y + 6);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.customer?.company_name || invoice.customer?.name || 'Customer', 19, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (invoice.customer?.trn) {
    doc.text(`TRN: ${invoice.customer.trn}`, 19, y + 18);
  }
  if (invoice.customer?.mobile || invoice.customer?.email) {
    doc.text(`${invoice.customer?.mobile || invoice.customer?.email}`, 19, y + 24);
  }

  // Items Table Header
  y = 92;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  doc.text('#', 18, y + 5.5);
  doc.text('Description', 28, y + 5.5);
  doc.text('Qty', 115, y + 5.5, { align: 'right' });
  doc.text('Unit Price', 140, y + 5.5, { align: 'right' });
  doc.text('VAT (5%)', 165, y + 5.5, { align: 'right' });
  doc.text('Total (AED)', pageWidth - 18, y + 5.5, { align: 'right' });

  // Items Rows
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const items = invoice.items || [];
  items.forEach((item, idx) => {
    doc.text(String(idx + 1), 18, y);
    doc.text(item.description || 'Service', 28, y);
    doc.text(String(item.quantity), 115, y, { align: 'right' });
    doc.text(item.unit_price.toFixed(2), 140, y, { align: 'right' });
    doc.text(item.vat_amount.toFixed(2), 165, y, { align: 'right' });
    doc.text(item.total.toFixed(2), pageWidth - 18, y, { align: 'right' });

    y += 8;
  });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // Summary Totals (Right Aligned)
  const rightX = pageWidth - 18;
  const labelX = pageWidth - 65;

  doc.setFontSize(9);
  doc.text('Subtotal:', labelX, y);
  doc.text(`AED ${invoice.subtotal.toFixed(2)}`, rightX, y, { align: 'right' });
  y += 6;

  const vatAmount = invoice.vat_amount ?? ((invoice.vat_total) ?? 0);
  doc.text('VAT Amount (5%):', labelX, y);
  doc.text(`AED ${vatAmount.toFixed(2)}`, rightX, y, { align: 'right' });
  y += 6;

  const discountAmount = invoice.discount_amount ?? 0;
  if (discountAmount > 0) {
    doc.text('Discount:', labelX, y);
    doc.text(`- AED ${discountAmount.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 6;
  }

  // Grand Total Box
  doc.setFillColor(241, 245, 249);
  doc.rect(labelX - 4, y, pageWidth - 15 - (labelX - 4), 9, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Due:', labelX, y + 6.5);
  doc.text(`AED ${invoice.total.toFixed(2)}`, rightX, y + 6.5, { align: 'right' });

  // Bank Info Footer
  y = 235;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, pageWidth - 30, 26, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('BANK TRANSFER DETAILS:', 19, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank: ${company?.bank_name || 'Emirates NBD'} | Account: ${company?.bank_account_number || '1012345678901'}`, 19, y + 12);
  doc.text(`Account Name: ${company?.bank_account_name || company?.company_name || 'Better Books Tax Consultancy'}`, 19, y + 17);
  doc.text(`IBAN: ${company?.bank_iban || 'AE1202600001012345678901'}`, 19, y + 22);

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(company?.invoice_footer_notes || 'Thank you for your business!', pageWidth / 2, 275, { align: 'center' });

  doc.save(`${invoice.invoice_number}.pdf`);
}
