import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { LedgerService } from '../services/ledgerService.js';

export class PaymentController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id, invoice_id } = req.query;
      const where: any = {};
      if (customer_id) where.customer_id = customer_id as string;
      if (invoice_id) where.invoice_id = invoice_id as string;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoice_number: true, total: true } },
          wallet: { select: { id: true, name: true, currency: true } },
        },
        orderBy: { payment_date: 'desc' },
      });

      return successResponse(res, payments);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch payments', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        invoice_id,
        customer_id,
        amount,
        payment_date,
        payment_method = 'bank_transfer',
        wallet_id,
        reference_number,
        notes,
        from_fund = false,
      } = req.body;

      const numAmount = parseFloat(amount);
      if (!customer_id || isNaN(numAmount) || numAmount <= 0) {
        return errorResponse(res, 'Customer and a valid positive amount are required', 400);
      }

      // If from_fund is true, check customer's available fund balance
      if (from_fund) {
        const totalFunds = await prisma.customerFund.aggregate({
          where: { customer_id },
          _sum: { amount: true },
        });
        const totalFundPayments = await prisma.payment.aggregate({
          where: { customer_id, from_fund: true },
          _sum: { amount: true },
        });

        const deposited = totalFunds._sum.amount || 0;
        const utilized = totalFundPayments._sum.amount || 0;
        const availableBalance = deposited - utilized;

        if (numAmount > availableBalance) {
          return errorResponse(res, `Insufficient customer fund balance. Available: AED ${availableBalance.toFixed(2)}`, 400);
        }
      }

      const payment = await prisma.payment.create({
        data: {
          invoice_id: invoice_id || null,
          customer_id,
          amount: numAmount,
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_method: from_fund ? 'customer_fund' : payment_method,
          wallet_id: from_fund ? null : wallet_id || null,
          reference_number,
          notes,
          from_fund,
        },
      });

      // Update invoice if linked
      if (invoice_id) {
        const invoice = await prisma.invoice.findUnique({ where: { id: invoice_id } });
        if (invoice) {
          const newPaidAmount = invoice.paid_amount + numAmount;
          const newBalanceDue = Math.max(0, invoice.total - newPaidAmount);
          const newStatus = newBalanceDue <= 0.001 ? 'paid' : 'partially_paid';

          await prisma.invoice.update({
            where: { id: invoice_id },
            data: {
              paid_amount: newPaidAmount,
              balance_due: newBalanceDue,
              status: newStatus,
            },
          });
        }
      }

      // Update wallet balance if not from_fund
      if (wallet_id && !from_fund) {
        await prisma.wallet.update({
          where: { id: wallet_id },
          data: { balance: { increment: numAmount } },
        });
      }

      // Post to double-entry ledger
      await LedgerService.onPaymentReceived(payment.id);

      return successResponse(res, payment, 'Payment recorded successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to record payment', 500);
    }
  }
}
