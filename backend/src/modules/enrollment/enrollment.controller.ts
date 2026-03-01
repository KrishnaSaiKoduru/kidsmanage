import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as enrollmentService from './enrollment.service';

const applySchema = z.object({
  childName: z.string().min(1),
  parentName: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  dateOfBirth: z.string().min(1),
  notes: z.string().optional(),
});

export async function listApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await enrollmentService.listApplications(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const data = applySchema.parse(req.body);
    const result = await enrollmentService.createApplication(req.user!.centerId!, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await enrollmentService.approveApplication(req.user!.centerId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
