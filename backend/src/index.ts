import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalLimiter } from './middleware/rateLimiter';
import { sanitizeMiddleware } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

import authRoutes from './modules/auth/auth.routes';
import centerRoutes from './modules/center/center.routes';
import childrenRoutes from './modules/children/children.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import billingRoutes from './modules/billing/billing.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import activitiesRoutes from './modules/activities/activities.routes';
import messagesRoutes from './modules/messages/messages.routes';
import enrollmentRoutes from './modules/enrollment/enrollment.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:4173',
    ].filter(Boolean) as string[];

    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowed.some((url) => origin === url || origin === url.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin} | Allowed: ${allowed.join(', ')}`);
      callback(null, false); // Omit CORS headers instead of throwing (avoids 500)
    }
  },
  credentials: true,
}));
app.use(generalLimiter);

// JSON body parser — billing routes handle raw body for Stripe webhook internally
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhook endpoint (it needs raw body)
  if (req.originalUrl === '/api/billing/stripe/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next); // increased limit for base64 image uploads
  }
});

app.use(sanitizeMiddleware);

// Health check
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    hasDbUrl: !!process.env.DATABASE_URL,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/center', centerRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Global error handler
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`KidsManage API running on http://localhost:${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '***set***' : '*** NOT SET ***'}`);
  console.log(`CORS allowed origins: ${[process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'].filter(Boolean).join(', ')}`);

  // Verify database connectivity at startup
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection: OK');
  } catch (err) {
    console.error('Database connection: FAILED', err);
  }
});
