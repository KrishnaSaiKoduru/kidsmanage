import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  supabaseId: string;
  centerId: string | null;
  name: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Lightweight auth middleware that only validates the Supabase token.
 * Sets req.supabaseUser with { id, email } from the token.
 * Used for routes where the DB user may not exist yet (e.g., OAuth registration).
 */
export async function supabaseAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as any).supabaseUser = {
      id: supabaseUser.id,
      email: supabaseUser.email,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!dbUser) {
      res.status(401).json({ error: 'User not found in database' });
      return;
    }

    if (dbUser.status === 'DEACTIVATED') {
      res.status(403).json({ error: 'Account has been deactivated' });
      return;
    }

    req.user = {
      id: dbUser.id,
      supabaseId: dbUser.supabaseId,
      centerId: dbUser.centerId,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}
