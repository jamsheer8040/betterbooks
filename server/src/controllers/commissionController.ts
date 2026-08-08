import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class CommissionController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { agent_id, customer_id, status } = req.query;

      const where: any = {};
      if (agent_id) where.agent_id = agent_id as string;
      if (customer_id) where.customer_id = customer_id as string;
      if (status) where.status = status as string;

      if (req.user?.role === 'agent') {
        const agentRecord = await prisma.agent.findFirst({ where: { user_id: req.user.id } });
        if (agentRecord) where.agent_id = agentRecord.id;
      }

      const commissions = await prisma.commission.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, email: true } },
          customer: { select: { id: true, name: true, company_name: true } },
          invoice: { select: { id: true, invoice_number: true, total: true } },
        },
        orderBy: { date: 'desc' },
      });

      return successResponse(res, commissions);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch commissions', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { agent_id, customer_id, invoice_id, amount, status = 'pending_approval', date, is_advance = false, notes } = req.body;
      const numAmount = parseFloat(amount);

      if (!agent_id || isNaN(numAmount) || numAmount <= 0) {
        return errorResponse(res, 'Agent and a valid positive amount are required', 400);
      }

      const commission = await prisma.commission.create({
        data: {
          agent_id,
          customer_id: customer_id || null,
          invoice_id: invoice_id || null,
          amount: numAmount,
          status,
          date: date ? new Date(date) : new Date(),
          is_advance,
          notes,
          approved_at: status === 'approved' || status === 'released' ? new Date() : null,
          released_at: status === 'released' ? new Date() : null,
        },
        include: { agent: true, customer: true, invoice: true },
      });

      return successResponse(res, commission, 'Commission created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create commission', 500);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['pending_approval', 'approved', 'released'].includes(status)) {
        return errorResponse(res, 'Invalid commission status', 400);
      }

      const updateData: any = { status };
      if (notes !== undefined) updateData.notes = notes;

      if (status === 'approved') {
        updateData.approved_at = new Date();
      } else if (status === 'released') {
        updateData.released_at = new Date();
        updateData.approved_at = new Date(); // automatically also mark approved
      }

      const commission = await prisma.commission.update({
        where: { id },
        data: updateData,
        include: { agent: true, customer: true },
      });

      return successResponse(res, commission, `Commission status updated to ${status}`);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update commission status', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.commission.delete({ where: { id } });
      return successResponse(res, null, 'Commission deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete commission', 500);
    }
  }
}
