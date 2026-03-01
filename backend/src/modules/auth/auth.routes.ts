import { Router } from 'express';
import { authMiddleware, supabaseAuthMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import { roleGuard } from '../../middleware/roleGuard';
import { authLimiter } from '../../middleware/rateLimiter';
import * as authController from './auth.controller';

const router = Router();

// Public routes (rate limited)
router.post('/register', authLimiter, authController.register);
router.post('/register-user', authLimiter, authController.registerUser);
router.post('/accept-invite', authLimiter, authController.acceptInvite);

// OAuth completion (needs Supabase token but DB user may not exist yet)
router.post('/complete-oauth', authLimiter, supabaseAuthMiddleware, authController.completeOAuth);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.patch('/me', authMiddleware, authController.updateMe);
router.post('/invite', authMiddleware, tenantGuard, roleGuard('ADMIN'), authController.invite);

export default router;
