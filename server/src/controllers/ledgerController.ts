import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class LedgerController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id, account, start_date, end_date } = req.query;

      const where: any = {};
      if (customer_id) where.customer_id = customer_id as string;
      if (account) {
        where.OR = [
          { debit_account: account as string },
          { credit_account: account as string },
        ];
      }
      if (start_date || end_date) {
        where.date = {};
        if (start_date) where.date.gte = new Date(start_date as string);
        if (end_date) where.date.lte = new Date(end_date as string);
      }

      const entries = await prisma.ledgerEntry.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, company_name: true } },
        },
        orderBy: { date: 'desc' },
      });

      return successResponse(res, entries);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch ledger entries', 500);
    }
  }

  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id } = req.query;
      const where: any = {};
      if (customer_id) where.customer_id = customer_id as string;

      const entries = await prisma.ledgerEntry.findMany({ where });

      const accounts: Record<string, { debit: number; credit: number; balance: number }> = {};

      for (const e of entries) {
        if (!accounts[e.debit_account]) accounts[e.debit_account] = { debit: 0, credit: 0, balance: 0 };
        if (!accounts[e.credit_account]) accounts[e.credit_account] = { debit: 0, credit: 0, balance: 0 };

        accounts[e.debit_account].debit += e.debit_amount;
        accounts[e.credit_account].credit += e.credit_amount;
      }

      for (const acc of Object.keys(accounts)) {
        accounts[acc].balance = accounts[acc].debit - accounts[acc].credit;
      }

      return successResponse(res, accounts);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to get ledger summary', 500);
    }
  }
}
