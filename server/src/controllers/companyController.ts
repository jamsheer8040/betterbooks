import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class CompanyController {
  static async getSettings(req: Request, res: Response) {
    try {
      let settings = await prisma.companySettings.findFirst();
      if (!settings) {
        settings = await prisma.companySettings.create({
          data: {
            company_name: 'Better Books Tax Consultancy LLC',
            address: 'Office 402, Business Bay, Dubai, UAE',
            trn: '100234567800003',
            vat_enabled: true,
            vat_rate: 5.0,
          },
        });
      }
      return successResponse(res, settings);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch company settings', 500);
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const data = { ...req.body };
      if (data.vat_rate !== undefined) data.vat_rate = parseFloat(data.vat_rate) || 5.0;

      let settings = await prisma.companySettings.findFirst();
      if (!settings) {
        settings = await prisma.companySettings.create({ data });
      } else {
        settings = await prisma.companySettings.update({
          where: { id: settings.id },
          data,
        });
      }

      return successResponse(res, settings, 'Company settings updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update company settings', 500);
    }
  }
}
