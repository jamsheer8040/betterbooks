import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AgentController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const agents = await prisma.agent.findMany({
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
          _count: { select: { customers: true, commissions: true } },
        },
        orderBy: { name: 'asc' },
      });

      // Augment with commission totals
      const agentStats = await Promise.all(
        agents.map(async (agent: any) => {
          const commissions = await prisma.commission.findMany({ where: { agent_id: agent.id } });
          const totalEarned = commissions.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
          const pendingApproval = commissions.filter((c: any) => c.status === 'pending_approval').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
          const approved = commissions.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
          const released = commissions.filter((c: any) => c.status === 'released').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

          return {
            ...agent,
            stats: { totalEarned, pendingApproval, approved, released },
          };
        })
      );

      return successResponse(res, agentStats);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch agents', 500);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          user: true,
          customers: {
            include: {
              filings: { orderBy: { period_start: 'desc' }, take: 1 },
              invoices: { orderBy: { invoice_date: 'desc' }, take: 3 },
            },
          },
          commissions: {
            include: { customer: true, invoice: true },
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!agent) return errorResponse(res, 'Agent not found', 404);
      return successResponse(res, agent);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch agent', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, phone, commission_type = 'percentage', commission_rate = 10, notes, status = 'active', user_id } = req.body;
      if (!name) return errorResponse(res, 'Agent name is required', 400);

      const agent = await prisma.agent.create({
        data: {
          name,
          email,
          phone,
          commission_type,
          commission_rate: parseFloat(commission_rate) || 0,
          notes,
          status,
          user_id: user_id || null,
        },
      });

      return successResponse(res, agent, 'Agent created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create agent', 500);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      if (data.commission_rate !== undefined) data.commission_rate = parseFloat(data.commission_rate) || 0;

      const agent = await prisma.agent.update({
        where: { id },
        data,
      });

      return successResponse(res, agent, 'Agent updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update agent', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.agent.delete({ where: { id } });
      return successResponse(res, null, 'Agent deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete agent', 500);
    }
  }

  // Current logged in agent portal data
  static async getPortalData(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return errorResponse(res, 'Unauthenticated', 401);

      const agent = await prisma.agent.findFirst({
        where: {
          OR: [
            { user_id: req.user.id },
            { email: req.user.email },
          ],
        },
        include: {
          customers: {
            include: {
              filings: { orderBy: { period_start: 'desc' }, take: 1 },
              documents: true,
              invoices: { orderBy: { invoice_date: 'desc' }, take: 5 },
            },
          },
          commissions: {
            include: { customer: true, invoice: true },
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!agent) {
        return errorResponse(res, 'No agent profile associated with this user account', 404);
      }

      const totalEarned = agent.commissions.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      const pendingApproval = agent.commissions.filter((c: any) => c.status === 'pending_approval').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      const approved = agent.commissions.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      const released = agent.commissions.filter((c: any) => c.status === 'released').reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

      return successResponse(res, {
        agent,
        stats: {
          totalEarned,
          pendingApproval,
          approved,
          released,
          totalCustomers: agent.customers.length,
        },
      });
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch portal data', 500);
    }
  }
}
