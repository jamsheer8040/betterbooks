import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class WalletController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const wallets = await prisma.wallet.findMany({
        include: {
          _count: { select: { payments: true, funds: true } },
        },
        orderBy: { created_at: 'asc' },
      });
      return successResponse(res, wallets);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch wallets', 500);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const wallet = await prisma.wallet.findUnique({
        where: { id },
        include: {
          payments: { include: { customer: true, invoice: true }, take: 20, orderBy: { payment_date: 'desc' } },
          funds: { include: { customer: true }, take: 20, orderBy: { payment_date: 'desc' } },
        },
      });

      if (!wallet) return errorResponse(res, 'Wallet not found', 404);
      return successResponse(res, wallet);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch wallet', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, bank_name, currency = 'AED', account_number, iban, balance = 0, notes, status = 'active' } = req.body;
      if (!name) return errorResponse(res, 'Wallet name is required', 400);

      const wallet = await prisma.wallet.create({
        data: {
          name,
          bank_name,
          currency,
          account_number,
          iban,
          balance: parseFloat(balance) || 0,
          notes,
          status,
        },
      });

      return successResponse(res, wallet, 'Wallet created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create wallet', 500);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      if (data.balance !== undefined) data.balance = parseFloat(data.balance) || 0;

      const wallet = await prisma.wallet.update({
        where: { id },
        data,
      });

      return successResponse(res, wallet, 'Wallet updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update wallet', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.wallet.delete({ where: { id } });
      return successResponse(res, null, 'Wallet deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete wallet', 500);
    }
  }
}
