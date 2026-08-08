import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class FilingController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id, status, year } = req.query;

      const where: any = {};
      if (customer_id) where.customer_id = customer_id as string;
      if (status) where.status = status as string;

      // If user is agent, restrict
      if (req.user?.role === 'agent') {
        const agentRecord = await prisma.agent.findFirst({ where: { user_id: req.user.id } });
        if (agentRecord) {
          where.customer = { agent_id: agentRecord.id };
        }
      }

      const filings = await prisma.filing.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, trn: true, filing_cycle: true } },
        },
        orderBy: { period_start: 'desc' },
      });

      return successResponse(res, filings);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch filings', 500);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const filing = await prisma.filing.findUnique({
        where: { id },
        include: { customer: true },
      });

      if (!filing) return errorResponse(res, 'Filing not found', 404);
      return successResponse(res, filing);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch filing', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        customer_id,
        filing_month,
        period_start,
        period_end,
        filing_date,
        due_date,
        sales_amount = 0,
        sales_vat = 0,
        expenses_amount = 0,
        expenses_vat = 0,
        other_expenses,
        net_vat_payable,
        vat_inclusive = false,
        status = 'draft',
        notes,
        file_url,
      } = req.body;

      if (!customer_id || !filing_month || !period_start || !period_end) {
        return errorResponse(res, 'Customer, filing month, and period dates are required', 400);
      }

      // Auto-calculate VAT if not provided
      const calcSalesVat = sales_vat || (vat_inclusive ? (sales_amount * 5) / 105 : (sales_amount * 5) / 100);
      const calcExpensesVat = expenses_vat || (vat_inclusive ? (expenses_amount * 5) / 105 : (expenses_amount * 5) / 100);
      const calcNetVat = net_vat_payable !== undefined ? net_vat_payable : calcSalesVat - calcExpensesVat;

      const filing = await prisma.filing.create({
        data: {
          customer_id,
          filing_month,
          period_start: new Date(period_start),
          period_end: new Date(period_end),
          filing_date: filing_date ? new Date(filing_date) : null,
          due_date: due_date ? new Date(due_date) : null,
          sales_amount: parseFloat(sales_amount) || 0,
          sales_vat: calcSalesVat,
          expenses_amount: parseFloat(expenses_amount) || 0,
          expenses_vat: calcExpensesVat,
          other_expenses: other_expenses || null,
          net_vat_payable: calcNetVat,
          vat_inclusive,
          status,
          notes,
          file_url,
        },
        include: { customer: true },
      });

      // Update milestone if filing status is filed
      if (status === 'filed') {
        const monthKey = new Date(period_end).toISOString().substring(0, 7);
        await prisma.filingMilestone.upsert({
          where: {
            customer_id_month_key: { customer_id, month_key: monthKey },
          },
          update: {
            status: 'filed',
            filed_date: filing_date ? new Date(filing_date) : new Date(),
          },
          create: {
            customer_id,
            month_key: monthKey,
            year: new Date(period_end).getFullYear(),
            status: 'filed',
            filed_date: filing_date ? new Date(filing_date) : new Date(),
          },
        });
      }

      return successResponse(res, filing, 'Filing created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create filing', 500);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };

      if (data.period_start) data.period_start = new Date(data.period_start);
      if (data.period_end) data.period_end = new Date(data.period_end);
      if (data.filing_date) data.filing_date = new Date(data.filing_date);
      if (data.due_date) data.due_date = new Date(data.due_date);

      const filing = await prisma.filing.update({
        where: { id },
        data,
        include: { customer: true },
      });

      return successResponse(res, filing, 'Filing updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update filing', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.filing.delete({ where: { id } });
      return successResponse(res, null, 'Filing deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete filing', 500);
    }
  }

  // Milestones & Tracker Matrix
  static async getTrackerMatrix(req: AuthenticatedRequest, res: Response) {
    try {
      const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);
      
      const customers = await prisma.customer.findMany({
        where: { status: 'active' },
        include: {
          agent: true,
          milestones: {
            where: { year },
          },
        },
        orderBy: { name: 'asc' },
      });

      return successResponse(res, { year, customers });
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to get tracker matrix', 500);
    }
  }

  static async updateMilestone(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id, month_key, status, filed_date, notes } = req.body;
      if (!customer_id || !month_key || !status) {
        return errorResponse(res, 'customer_id, month_key, and status are required', 400);
      }

      const year = parseInt(month_key.split('-')[0], 10);

      const milestone = await prisma.filingMilestone.upsert({
        where: {
          customer_id_month_key: { customer_id, month_key },
        },
        update: {
          status,
          filed_date: filed_date ? new Date(filed_date) : (status === 'filed' ? new Date() : null),
          notes,
        },
        create: {
          customer_id,
          month_key,
          year,
          status,
          filed_date: filed_date ? new Date(filed_date) : (status === 'filed' ? new Date() : null),
          notes,
        },
      });

      return successResponse(res, milestone, 'Milestone updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update milestone', 500);
    }
  }
}
