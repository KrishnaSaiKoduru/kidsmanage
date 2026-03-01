import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notifications.service';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await notificationService.getNotifications(req.user!.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAsRead(req.user!.id, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
