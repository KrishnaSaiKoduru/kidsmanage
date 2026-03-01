import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as childrenService from './children.service';

const createChildSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  room: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
  parentIds: z.array(z.string()).optional(),
});

const updateChildSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  room: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ENROLLED', 'WAITLISTED', 'WITHDRAWN', 'GRADUATED']).optional(),
});

export async function listChildren(req: Request, res: Response, next: NextFunction) {
  try {
    const { room, status, search } = req.query;
    const result = await childrenService.listChildren(req.user!.centerId!, {
      room: room as string,
      status: status as string,
      search: search as string,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createChild(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createChildSchema.parse(req.body);
    const result = await childrenService.createChild(req.user!.centerId!, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChild(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await childrenService.getChild(req.user!.centerId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateChild(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateChildSchema.parse(req.body);
    const result = await childrenService.updateChild(req.user!.centerId!, req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteChild(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await childrenService.archiveChild(req.user!.centerId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
