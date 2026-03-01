import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as attendanceService from './attendance.service';

const checkInSchema = z.object({
  childId: z.string().min(1),
  method: z.enum(['MANUAL', 'QR_CODE', 'PIN']).optional(),
  notes: z.string().optional(),
});

const checkOutSchema = z.object({
  childId: z.string().min(1),
  notes: z.string().optional(),
});

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const data = checkInSchema.parse(req.body);
    const result = await attendanceService.checkIn(req.user!.centerId!, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function checkOut(req: Request, res: Response, next: NextFunction) {
  try {
    const data = checkOutSchema.parse(req.body);
    const result = await attendanceService.checkOut(req.user!.centerId!, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTodayAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await attendanceService.getTodayAttendance(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMyChildrenAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await attendanceService.getMyChildrenAttendance(req.user!.centerId!, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChildHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    const result = await attendanceService.getChildAttendanceHistory(
      req.user!.centerId!,
      req.params.childId as string,
      limit
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
