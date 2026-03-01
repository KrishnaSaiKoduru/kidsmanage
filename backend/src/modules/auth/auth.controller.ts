import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

const registerSchema = z.object({
  centerName: z.string().min(1),
  directorName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const registerUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(['PARENT', 'CARETAKER']),
  joinCode: z.string().min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'CARETAKER', 'PARENT']),
});

const acceptInviteSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const completeOAuthSchema = z.object({
  role: z.enum(['PARENT', 'CARETAKER']),
  joinCode: z.string().min(1),
  name: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(), // allow base64 strings or URLs
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  employer: z.string().optional(),
  authorizedPickups: z.string().optional(),
  bio: z.string().optional(),
  jobTitle: z.string().optional(),
  certifications: z.string().optional(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerCenter(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerUserSchema.parse(req.body);
    const result = await authService.registerUser(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function invite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = inviteSchema.parse(req.body);
    const result = await authService.inviteUser({
      ...data,
      centerId: req.user!.centerId!,
      invitedBy: req.user!.id,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = acceptInviteSchema.parse(req.body);
    const result = await authService.acceptInvite(data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function completeOAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const data = completeOAuthSchema.parse(req.body);
    const supabaseUser = (req as any).supabaseUser;
    const result = await authService.completeOAuthRegistration({
      supabaseId: supabaseUser.id,
      email: supabaseUser.email,
      ...data,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.getCurrentUser(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const result = await authService.updateProfile(req.user!.id, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
