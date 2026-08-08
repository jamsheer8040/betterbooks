import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};
