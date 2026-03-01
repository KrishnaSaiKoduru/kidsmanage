import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import * as dashboardController from './dashboard.controller';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/stats', dashboardController.getStats);

export default router;
