import { Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class ProductController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const products = await prisma.productService.findMany({
        orderBy: { name: 'asc' },
      });
      return successResponse(res, products);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch products', 500);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, code, type = 'service', price = 0, vat_rate = 5.0, description, status = 'active' } = req.body;
      if (!name) return errorResponse(res, 'Name is required', 400);

      const product = await prisma.productService.create({
        data: {
          name,
          code: code || null,
          type,
          price: parseFloat(price) || 0,
          vat_rate: parseFloat(vat_rate) || 5.0,
          description,
          status,
        },
      });

      return successResponse(res, product, 'Product/Service created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create product', 500);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      if (data.price !== undefined) data.price = parseFloat(data.price) || 0;
      if (data.vat_rate !== undefined) data.vat_rate = parseFloat(data.vat_rate) || 5.0;

      const product = await prisma.productService.update({
        where: { id },
        data,
      });

      return successResponse(res, product, 'Product/Service updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update product', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.productService.delete({ where: { id } });
      return successResponse(res, null, 'Product/Service deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete product', 500);
    }
  }
}
