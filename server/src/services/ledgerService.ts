import { prisma } from '../config/db.js';

export interface LedgerEntryInput {
  customerId?: string | null;
  transactionType: string;
  debitAccount: string;
  creditAccount: string;
  debitAmount: number;
  creditAmount: number;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string;
  date?: Date | string;
}

export class LedgerService {
  static async recordEntry(input: LedgerEntryInput) {
    return prisma.ledgerEntry.create({
      data: {
        customer_id: input.customerId || null,
        transaction_type: input.transactionType,
        debit_account: input.debitAccount,
        credit_account: input.creditAccount,
        debit_amount: input.debitAmount,
        credit_amount: input.creditAmount,
        reference_id: input.referenceId || null,
        reference_type: input.referenceType || null,
        description: input.description || null,
        date: input.date ? new Date(input.date) : new Date(),
      },
    });
  }

  static async onInvoiceCreated(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });
    if (!invoice) return;

    return this.recordEntry({
      customerId: invoice.customer_id,
      transactionType: 'invoice_created',
      debitAccount: 'Customer Receivable',
      creditAccount: 'Sales Revenue',
      debitAmount: invoice.total,
      creditAmount: invoice.total,
      referenceId: invoice.id,
      referenceType: 'invoice',
      description: `Invoice ${invoice.invoice_number} created for ${invoice.customer?.name || 'Customer'}`,
      date: invoice.invoice_date,
    });
  }

  static async onPaymentReceived(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, customer: true },
    });
    if (!payment) return;

    const debitAcc = payment.from_fund ? 'Customer Fund Liability' : 'Bank Wallet';

    return this.recordEntry({
      customerId: payment.customer_id,
      transactionType: 'payment_received',
      debitAccount: debitAcc,
      creditAccount: 'Customer Receivable',
      debitAmount: payment.amount,
      creditAmount: payment.amount,
      referenceId: payment.id,
      referenceType: 'payment',
      description: `Payment for ${payment.invoice?.invoice_number || 'Invoice'}`,
      date: payment.payment_date,
    });
  }

  static async onFundDeposit(fundId: string) {
    const fund = await prisma.customerFund.findUnique({
      where: { id: fundId },
      include: { customer: true },
    });
    if (!fund) return;

    return this.recordEntry({
      customerId: fund.customer_id,
      transactionType: 'fund_deposit',
      debitAccount: 'Bank Wallet',
      creditAccount: 'Customer Fund Liability',
      debitAmount: fund.amount,
      creditAmount: fund.amount,
      referenceId: fund.id,
      referenceType: 'customer_fund',
      description: `Fund deposit from ${fund.customer?.name || 'Customer'}`,
      date: fund.payment_date,
    });
  }

  static async onFundAdjustment(customerId: string, invoiceId: string, amount: number) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

    return this.recordEntry({
      customerId,
      transactionType: 'fund_adjustment',
      debitAccount: 'Customer Fund Liability',
      creditAccount: 'Customer Receivable',
      debitAmount: amount,
      creditAmount: amount,
      referenceId: invoiceId,
      referenceType: 'fund_adjustment',
      description: `Fund adjusted to invoice ${invoice?.invoice_number || ''}`,
      date: new Date(),
    });
  }

  static async onInvoiceCancelled(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return;

    return this.recordEntry({
      customerId: invoice.customer_id,
      transactionType: 'invoice_cancelled',
      debitAccount: 'Sales Revenue',
      creditAccount: 'Customer Receivable',
      debitAmount: invoice.total,
      creditAmount: invoice.total,
      referenceId: invoice.id,
      referenceType: 'invoice',
      description: `Invoice ${invoice.invoice_number} cancelled`,
      date: new Date(),
    });
  }
}
