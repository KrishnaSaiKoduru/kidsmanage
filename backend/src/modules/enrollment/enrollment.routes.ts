import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import { roleGuard } from '../../middleware/roleGuard';
import * as enrollmentController from './enrollment.controller';

const router = Router();

router.use(authMiddleware, tenantGuard, roleGuard('ADMIN'));

router.get('/applications', enrollmentController.listApplications);
router.post('/apply', enrollmentController.apply);
router.patch('/applications/:id/approve', enrollmentController.approve);

export default router;
