import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as centerService from './center.service';

const updateCenterSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  licenseNumber: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
});

const updateStaffRoleSchema = z.object({
  role: z.enum(['ADMIN', 'CARETAKER']),
});

export async function getCenter(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await centerService.getCenter(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateCenter(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateCenterSchema.parse(req.body);
    const result = await centerService.updateCenter(req.user!.centerId!, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await centerService.listStaff(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listParents(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await centerService.listParents(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateStaffRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = updateStaffRoleSchema.parse(req.body);
    const result = await centerService.updateStaffRole(req.user!.centerId!, req.params.id as string, role);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getJoinCode(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await centerService.getJoinCode(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deactivateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await centerService.deactivateStaff(req.user!.centerId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
