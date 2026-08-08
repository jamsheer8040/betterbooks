import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          user_type: true,
          profile: true,
          agent: true,
        },
      });

      if (!user) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      if (user.status !== 'active') {
        return errorResponse(res, 'Account has been deactivated. Please contact administrator.', 403);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      // Calculate permissions
      const basePermissions = (user.user_type?.permissions as string[]) || [];
      const overrides = (user.profile?.permission_overrides as Record<string, boolean>) || {};
      const permissionSet = new Set<string>(basePermissions);
      for (const [key, enabled] of Object.entries(overrides)) {
        if (enabled) permissionSet.add(key);
        else permissionSet.delete(key);
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return successResponse(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          user_type: user.user_type,
          permissions: Array.from(permissionSet),
          agent: user.agent,
        },
      }, 'Login successful');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Login failed', 500);
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, phone, role = 'viewer' } = req.body;
      if (!email || !password || !name) {
        return errorResponse(res, 'Email, password, and name are required', 400);
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        return errorResponse(res, 'User with this email already exists', 400);
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Find matching default user type
      const userType = await prisma.userType.findFirst({
        where: { name: { equals: role } },
      });

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: passwordHash,
          name,
          phone,
          role,
          user_type_id: userType?.id || null,
          profile: {
            create: {
              permission_overrides: {},
            },
          },
        },
        include: {
          user_type: true,
          profile: true,
        },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return successResponse(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          user_type: user.user_type,
          permissions: (user.user_type?.permissions as string[]) || [],
        },
      }, 'User registered successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message || 'Registration failed', 500);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return errorResponse(res, 'Unauthenticated', 401);

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          user_type: true,
          profile: true,
          agent: true,
        },
      });

      if (!user) return errorResponse(res, 'User not found', 404);

      const basePermissions = (user.user_type?.permissions as string[]) || [];
      const overrides = (user.profile?.permission_overrides as Record<string, boolean>) || {};
      const permissionSet = new Set<string>(basePermissions);
      for (const [key, enabled] of Object.entries(overrides)) {
        if (enabled) permissionSet.add(key);
        else permissionSet.delete(key);
      }

      return successResponse(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        status: user.status,
        user_type: user.user_type,
        permissions: Array.from(permissionSet),
        agent: user.agent,
      });
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to fetch user', 500);
    }
  }
}
