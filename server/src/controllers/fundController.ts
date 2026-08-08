import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { LedgerService } from '../services/ledgerService.js';

export class FundController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id } = req.query;
      const where: any = {};
      if (customer_id) where.customer_id = customer_id as string;

      const funds = await prisma.customerFund.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          wallet: { select: { id: true, name: true } },
        },
        orderBy: { payment_date: 'desc' },
      });

      return successResponse(res, funds);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch customer funds', 500);
    }
  }

  static async deposit(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        customer_id,
        amount,
        payment_date,
        payment_method = 'bank_transfer',
        wallet_id,
        reference_number,
        notes,
      } = req.body;

      const numAmount = parseFloat(amount);
      if (!customer_id || isNaN(numAmount) || numAmount <= 0) {
        return errorResponse(res, 'Customer and a valid positive amount are required', 400);
      }

      const fund = await prisma.customerFund.create({
        data: {
          customer_id,
          amount: numAmount,
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_method,
          wallet_id: wallet_id || null,
          reference_number,
          notes,
          status: 'available',
        },
      });

      // Update wallet balance if specified
      if (wallet_id) {
        await prisma.wallet.update({
          where: { id: wallet_id },
          data: { balance: { increment: numAmount } },
        });
      }

      // Record in ledger
      await LedgerService.onFundDeposit(fund.id);

      return successResponse(res, fund, 'Customer fund deposit recorded successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to deposit fund', 500);
    }
  }

  static async getBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id } = req.params;

      const deposits = await prisma.customerFund.aggregate({
        where: { customer_id },
        _sum: { amount: true },
      });

      const utilized = await prisma.payment.aggregate({
        where: { customer_id, from_fund: true },
        _sum: { amount: true },
      });

      const totalDeposited = deposits._sum.amount || 0;
      const totalUtilized = utilized._sum.amount || 0;
      const available = Math.max(0, totalDeposited - totalUtilized);

      return successResponse(res, {
        customer_id,
        total_deposited: totalDeposited,
        total_utilized: totalUtilized,
        available_balance: available,
      });
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to get fund balance', 500);
    }
  }
}
