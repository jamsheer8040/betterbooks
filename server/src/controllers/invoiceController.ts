import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { LedgerService } from '../services/ledgerService.js';

export class InvoiceController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id, status, type, start_date, end_date } = req.query;

      const where: any = {};
      if (customer_id) where.customer_id = customer_id as string;
      if (status) where.status = status as string;
      if (type) where.type = type as string;

      if (req.user?.role === 'agent') {
        const agentRecord = await prisma.agent.findFirst({ where: { user_id: req.user.id } });
        if (agentRecord) {
          where.customer = { agent_id: agentRecord.id };
        }
      }

      if (start_date || end_date) {
        where.invoice_date = {};
        if (start_date) where.invoice_date.gte = new Date(start_date as string);
        if (end_date) where.invoice_date.lte = new Date(end_date as string);
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, company_name: true, trn: true, email: true, mobile: true } },
          items: true,
          payments: true,
        },
        orderBy: { invoice_date: 'desc' },
      });

      return successResponse(res, invoices);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch invoices', 500);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          customer: {
            include: { agent: true },
          },
          items: {
            include: { product_service: true },
          },
          payments: {
            include: { wallet: true },
            orderBy: { payment_date: 'desc' },
          },
        },
      });

      if (!invoice) return errorResponse(res, 'Invoice not found', 404);
      return successResponse(res, invoice);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch invoice', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        customer_id,
        invoice_number,
        invoice_date,
        due_date,
        items = [],
        status = 'credit',
        type = 'standard',
        currency = 'AED',
        discount_amount = 0,
        notes,
        terms_and_conditions,
      } = req.body;

      if (!customer_id || !items.length) {
        return errorResponse(res, 'Customer and at least one item are required', 400);
      }

      // Generate invoice number if not passed
      let finalInvoiceNumber = invoice_number;
      if (!finalInvoiceNumber) {
        const settings = await prisma.companySettings.findFirst();
        const prefix = settings?.invoice_prefix || 'INV';
        const count = await prisma.invoice.count();
        const currentYear = new Date().getFullYear();
        finalInvoiceNumber = `${prefix}-${currentYear}-${String(count + 1).padStart(4, '0')}`;
      }

      // Calculate totals
      let subtotal = 0;
      let totalVat = 0;

      const processedItems = items.map((item: any) => {
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.unit_price) || 0;
        const discount = parseFloat(item.discount) || 0;
        const vatRate = item.vat_rate !== undefined ? parseFloat(item.vat_rate) : 5.0;

        const lineSubtotal = qty * price - discount;
        const lineVat = (lineSubtotal * vatRate) / 100;
        const lineTotal = lineSubtotal + lineVat;

        subtotal += lineSubtotal;
        totalVat += lineVat;

        return {
          product_service_id: item.product_service_id || null,
          description: item.description || '',
          quantity: qty,
          unit_price: price,
          discount,
          vat_rate: vatRate,
          vat_amount: lineVat,
          total: lineTotal,
        };
      });

      const total = subtotal + totalVat - (parseFloat(discount_amount) || 0);

      const invoice = await prisma.invoice.create({
        data: {
          invoice_number: finalInvoiceNumber,
          customer_id,
          invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
          due_date: due_date ? new Date(due_date) : null,
          status,
          type,
          currency,
          subtotal,
          vat_rate: 5.0,
          vat_amount: totalVat,
          discount_amount: parseFloat(discount_amount) || 0,
          total,
          paid_amount: 0,
          balance_due: total,
          notes,
          terms_and_conditions,
          items: {
            create: processedItems,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      // Automatically post to double-entry ledger
      await LedgerService.onInvoiceCreated(invoice.id);

      return successResponse(res, invoice, 'Invoice created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create invoice', 500);
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { cancellation_reason } = req.body;

      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return errorResponse(res, 'Invoice not found', 404);

      if (invoice.status === 'cancelled') {
        return errorResponse(res, 'Invoice is already cancelled', 400);
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancellation_reason: cancellation_reason || 'Cancelled by user',
          balance_due: 0,
        },
      });

      await LedgerService.onInvoiceCancelled(id);

      return successResponse(res, updated, 'Invoice cancelled successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to cancel invoice', 500);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { notes, terms_and_conditions, due_date, status } = req.body;

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          notes,
          terms_and_conditions,
          due_date: due_date ? new Date(due_date) : undefined,
          status,
        },
        include: { items: true, customer: true },
      });

      return successResponse(res, updated, 'Invoice updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update invoice', 500);
    }
  }
}
