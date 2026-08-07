import { base44 } from '@/api/base44Client';

export async function createLedgerEntry(entry) {
  return base44.entities.LedgerEntry.create(entry);
}

export async function recordInvoiceCreated(invoice) {
  return createLedgerEntry({
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    transaction_type: 'invoice_created',
    debit_account: 'Customer Receivable',
    credit_account: 'Sales Revenue',
    debit_amount: invoice.total || 0,
    credit_amount: invoice.total || 0,
    reference_id: invoice.id,
    reference_type: 'invoice',
    description: `Invoice ${invoice.invoice_number} created`,
    date: invoice.invoice_date || new Date().toISOString().split('T')[0],
  });
}

export async function recordPayment(payment, invoice) {
  return createLedgerEntry({
    customer_id: payment.customer_id,
    customer_name: payment.customer_name,
    transaction_type: 'payment_received',
    debit_account: payment.from_fund ? 'Customer Fund Liability' : 'Bank Wallet',
    credit_account: 'Customer Receivable',
    debit_amount: payment.amount || 0,
    credit_amount: payment.amount || 0,
    reference_id: payment.id,
    reference_type: 'payment',
    description: `Payment for ${invoice?.invoice_number || ''}`,
    date: payment.payment_date,
  });
}

export async function recordFundDeposit(fund) {
  return createLedgerEntry({
    customer_id: fund.customer_id,
    customer_name: fund.customer_name,
    transaction_type: 'fund_deposit',
    debit_account: 'Bank Wallet',
    credit_account: 'Customer Fund Liability',
    debit_amount: fund.amount || 0,
    credit_amount: fund.amount || 0,
    reference_id: fund.id,
    reference_type: 'customer_fund',
    description: `Fund deposit from ${fund.customer_name}`,
    date: fund.payment_date,
  });
}

export async function recordFundAdjustment(customerId, customerName, invoice, amount) {
  return createLedgerEntry({
    customer_id: customerId,
    customer_name: customerName,
    transaction_type: 'fund_adjustment',
    debit_account: 'Customer Fund Liability',
    credit_account: 'Customer Receivable',
    debit_amount: amount,
    credit_amount: amount,
    reference_id: invoice?.id || '',
    reference_type: 'fund_adjustment',
    description: `Fund adjusted to invoice ${invoice?.invoice_number || ''}`,
    date: new Date().toISOString().split('T')[0],
  });
}

export async function recordInvoiceCancelled(invoice) {
  return createLedgerEntry({
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    transaction_type: 'invoice_cancelled',
    debit_account: 'Sales Revenue',
    credit_account: 'Customer Receivable',
    debit_amount: invoice.total || 0,
    credit_amount: invoice.total || 0,
    reference_id: invoice.id,
    reference_type: 'invoice',
    description: `Invoice ${invoice.invoice_number} cancelled`,
    date: new Date().toISOString().split('T')[0],
  });
}