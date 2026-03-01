import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dashboardService.getStats(req.user!.centerId!, req.user!.id, req.user!.role);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
