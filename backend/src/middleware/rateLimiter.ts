import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 300,  // generous in dev; 300 req/15min in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skip: () => isDev,          // completely skip rate limiting in development
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 10000 : 20,   // 20 login attempts/minute in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
  skip: () => isDev,          // skip in development
});
