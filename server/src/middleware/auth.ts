import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';
import { prisma } from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
    user_type_id?: string | null;
    permissions?: string[];
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authorization token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded: TokenPayload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        user_type: true,
        profile: true,
      },
    });

    if (!user || user.status !== 'active') {
      return errorResponse(res, 'User not found or account is deactivated', 401);
    }

    // Calculate effective permissions
    const basePermissions = (user.user_type?.permissions as string[]) || [];
    const overrides = (user.profile?.permission_overrides as Record<string, boolean>) || {};
    
    const permissionSet = new Set<string>(basePermissions);
    for (const [key, enabled] of Object.entries(overrides)) {
      if (enabled) permissionSet.add(key);
      else permissionSet.delete(key);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      user_type_id: user.user_type_id,
      permissions: Array.from(permissionSet),
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};
