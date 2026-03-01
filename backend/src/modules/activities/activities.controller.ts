import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as activitiesService from './activities.service';

const createSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  scheduledTime: z.string().optional(),
  notes: z.string().optional(),
  childId: z.string().optional(),
  date: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  scheduledTime: z.string().optional(),
  notes: z.string().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string | undefined;
    const result = await activitiesService.listActivities(req.user!.centerId!, date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const result = await activitiesService.createActivity(req.user!.centerId!, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const result = await activitiesService.updateActivity(req.user!.centerId!, req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await activitiesService.deleteActivity(req.user!.centerId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
