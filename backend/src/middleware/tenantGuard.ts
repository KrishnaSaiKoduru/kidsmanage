import { Request, Response, NextFunction } from 'express';

export function tenantGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.centerId) {
    res.status(403).json({ error: 'No center associated with this account' });
    return;
  }
  next();
}
