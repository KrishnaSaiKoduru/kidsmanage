import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as messagesService from './messages.service';

const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  title: z.string().min(1).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.string().optional(),
});

export async function getCenterUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messagesService.getCenterUsers(req.user!.centerId!, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messagesService.listConversations(req.user!.centerId!, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createConversationSchema.parse(req.body);
    const result = await messagesService.createConversation(req.user!.centerId!, req.user!.id, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messagesService.getMessages(req.user!.centerId!, req.params.id as string, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messagesService.markAsRead(req.user!.centerId!, req.params.id as string, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const data = sendMessageSchema.parse(req.body);
    const result = await messagesService.sendMessage(
      req.user!.centerId!,
      req.params.id as string,
      req.user!.id,
      data
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
