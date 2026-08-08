import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { errorResponse } from '../utils/response.js';

export const requirePermission = (permissionKey: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthenticated', 401);
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const hasPermission = req.user.permissions?.includes(permissionKey);
    if (!hasPermission) {
      return errorResponse(res, `Forbidden: Missing permission [${permissionKey}]`, 403);
    }

    next();
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthenticated', 401);
    }

    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    return errorResponse(res, 'Forbidden: Insufficient role privilege', 403);
  };
};
