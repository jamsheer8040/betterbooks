import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class CustomerController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, agent_id, status } = req.query;

      // If user is an agent, restrict to their assigned customers
      let filterAgentId = agent_id as string | undefined;
      if (req.user?.role === 'agent') {
        const agentRecord = await prisma.agent.findFirst({ where: { user_id: req.user.id } });
        if (agentRecord) filterAgentId = agentRecord.id;
      }

      const where: any = {};
      if (filterAgentId) where.agent_id = filterAgentId;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { company_name: { contains: search as string } },
          { trn: { contains: search as string } },
          { email: { contains: search as string } },
          { mobile: { contains: search as string } },
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, email: true } },
          documents: true,
          filings: { orderBy: { period_start: 'desc' }, take: 1 },
          funds: true,
          _count: { select: { filings: true, invoices: true, documents: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      return successResponse(res, customers);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch customers', 500);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          agent: true,
          documents: { orderBy: { created_at: 'desc' } },
          filings: { orderBy: { period_start: 'desc' } },
          milestones: { orderBy: { month_key: 'asc' } },
          invoices: {
            include: { items: true, payments: true },
            orderBy: { invoice_date: 'desc' },
          },
          payments: {
            include: { wallet: true },
            orderBy: { payment_date: 'desc' },
          },
          funds: {
            include: { wallet: true },
            orderBy: { payment_date: 'desc' },
          },
          commissions: {
            include: { agent: true },
            orderBy: { date: 'desc' },
          },
          ledger_entries: {
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!customer) return errorResponse(res, 'Customer not found', 404);

      // Check agent permission
      if (req.user?.role === 'agent') {
        const agentRecord = await prisma.agent.findFirst({ where: { user_id: req.user.id } });
        if (agentRecord && customer.agent_id !== agentRecord.id) {
          return errorResponse(res, 'Forbidden: Customer not assigned to you', 403);
        }
      }

      // Calculate fund balance
      const totalFundsDeposited = customer.funds.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
      const totalFundPayments = customer.payments.filter((p: any) => p.from_fund).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const availableFundBalance = Math.max(0, totalFundsDeposited - totalFundPayments);

      return successResponse(res, {
        ...customer,
        available_fund_balance: availableFundBalance,
      });
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to get customer', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        name,
        company_name,
        trn,
        email,
        mobile,
        phone,
        address,
        city,
        country,
        contact_person,
        filing_cycle,
        agent_id,
        trade_license_number,
        trade_license_expiry,
        trade_license_url,
        portal_username,
        portal_password,
        status = 'active',
      } = req.body;

      if (!name) return errorResponse(res, 'Customer name is required', 400);

      const customer = await prisma.customer.create({
        data: {
          name,
          company_name: company_name || name,
          trn,
          email,
          mobile,
          phone,
          address,
          city,
          country: country || 'United Arab Emirates',
          contact_person,
          filing_cycle: filing_cycle || 'Jan-Apr-Jul-Oct',
          agent_id: agent_id || null,
          trade_license_number,
          trade_license_expiry: trade_license_expiry ? new Date(trade_license_expiry) : null,
          trade_license_url,
          portal_username,
          portal_password,
          status,
        },
        include: { agent: true },
      });

      // Auto-generate 12-month milestones for current year
      const currentYear = new Date().getFullYear();
      const milestonePromises = [];
      for (let m = 1; m <= 12; m++) {
        const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`;
        milestonePromises.push(
          prisma.filingMilestone.create({
            data: {
              customer_id: customer.id,
              month_key: monthKey,
              year: currentYear,
              status: 'pending',
            },
          })
        );
      }
      await Promise.all(milestonePromises);

      return successResponse(res, customer, 'Customer created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create customer', 500);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };

      if (data.trade_license_expiry) {
        data.trade_license_expiry = new Date(data.trade_license_expiry);
      }

      const updated = await prisma.customer.update({
        where: { id },
        data,
        include: { agent: true },
      });

      return successResponse(res, updated, 'Customer updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update customer', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.customer.delete({ where: { id } });
      return successResponse(res, null, 'Customer deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete customer', 500);
    }
  }

  // Documents
  static async addDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { label, document_type, owner_name, file_url, expiry_date, issue_date, document_number, notes } = req.body;

      if (!label || !file_url) {
        return errorResponse(res, 'Label and file_url are required', 400);
      }

      const doc = await prisma.customerDocument.create({
        data: {
          customer_id: id,
          label,
          document_type,
          owner_name,
          file_url,
          expiry_date: expiry_date ? new Date(expiry_date) : null,
          issue_date: issue_date ? new Date(issue_date) : null,
          document_number,
          notes,
        },
      });

      return successResponse(res, doc, 'Document added successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to add document', 500);
    }
  }

  static async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { docId } = req.params;
      await prisma.customerDocument.delete({ where: { id: docId } });
      return successResponse(res, null, 'Document deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete document', 500);
    }
  }
}
