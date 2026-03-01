import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Fields that should never be sanitized (contain secrets/credentials)
const SKIP_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword']);

function sanitizeValue(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    // Skip sanitization entirely for password fields
    if (key && SKIP_FIELDS.has(key)) {
      return value;
    }
    // Use ALLOWED_TAGS:[] to strip all HTML tags but keep text content
    // This escapes HTML without destroying the text inside angle brackets
    return purify.sanitize(value, { ALLOWED_TAGS: [] });
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v));
  }
  if (value && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value, key);
  }
  return sanitized;
}

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}
