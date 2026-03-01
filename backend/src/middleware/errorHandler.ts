import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.name, err.message, err.stack?.split('\n').slice(0, 3).join('\n'));

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.issues,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle common Prisma error codes
    switch (err.code) {
      case 'P2002':
        res.status(409).json({ error: 'A record with this value already exists' });
        return;
      case 'P2025':
        res.status(404).json({ error: 'Record not found' });
        return;
      case 'P2003':
        res.status(400).json({ error: 'Related record not found' });
        return;
      default:
        res.status(400).json({ error: `Database error: ${err.code}` });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Invalid data provided' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
