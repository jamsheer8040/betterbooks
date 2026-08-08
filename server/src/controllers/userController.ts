import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class UserController {
  // Users
  static async listUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        include: {
          user_type: true,
          profile: true,
          agent: true,
        },
        orderBy: { created_at: 'desc' },
      });

      const sanitized = users.map((u: any) => {
        const { password, ...rest } = u;
        return rest;
      });

      return successResponse(res, sanitized);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch users', 500);
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password, name, phone, role = 'viewer', user_type_id, permission_overrides } = req.body;
      if (!email || !password || !name) {
        return errorResponse(res, 'Email, password, and name are required', 400);
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existing) return errorResponse(res, 'User already exists with this email', 400);

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: passwordHash,
          name,
          phone,
          role,
          user_type_id: user_type_id || null,
          profile: {
            create: {
              permission_overrides: permission_overrides || {},
            },
          },
        },
        include: { user_type: true, profile: true },
      });

      const { password: _, ...sanitized } = user;
      return successResponse(res, sanitized, 'User created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create user', 500);
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, role, user_type_id, status, password, permission_overrides } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role;
      if (user_type_id !== undefined) updateData.user_type_id = user_type_id;
      if (status !== undefined) updateData.status = status;
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { user_type: true, profile: true },
      });

      if (permission_overrides !== undefined) {
        await prisma.userProfile.upsert({
          where: { user_id: id },
          update: { permission_overrides },
          create: { user_id: id, permission_overrides },
        });
      }

      const { password: _, ...sanitized } = user;
      return successResponse(res, sanitized, 'User updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update user', 500);
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return errorResponse(res, 'Cannot delete your own user account', 400);
      }
      await prisma.user.delete({ where: { id } });
      return successResponse(res, null, 'User deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete user', 500);
    }
  }

  // User Types (Roles & base permissions)
  static async listUserTypes(req: AuthenticatedRequest, res: Response) {
    try {
      const types = await prisma.userType.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { name: 'asc' },
      });
      return successResponse(res, types);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch user types', 500);
    }
  }

  static async createUserType(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description, permissions = [] } = req.body;
      if (!name) return errorResponse(res, 'Name is required', 400);

      const type = await prisma.userType.create({
        data: {
          name,
          description,
          permissions,
        },
      });

      return successResponse(res, type, 'User type created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to create user type', 500);
    }
  }

  static async updateUserType(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      const type = await prisma.userType.update({
        where: { id },
        data: {
          name,
          description,
          permissions,
        },
      });

      return successResponse(res, type, 'User type updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to update user type', 500);
    }
  }

  static async deleteUserType(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const type = await prisma.userType.findUnique({ where: { id } });
      if (type?.is_system) {
        return errorResponse(res, 'System roles cannot be deleted', 400);
      }
      await prisma.userType.delete({ where: { id } });
      return successResponse(res, null, 'User type deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to delete user type', 500);
    }
  }
}
