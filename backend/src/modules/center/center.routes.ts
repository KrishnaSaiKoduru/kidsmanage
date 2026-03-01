import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import { roleGuard } from '../../middleware/roleGuard';
import * as centerController from './center.controller';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/', centerController.getCenter);
router.patch('/', roleGuard('ADMIN'), centerController.updateCenter);
router.get('/join-code', roleGuard('ADMIN'), centerController.getJoinCode);
router.get('/staff', roleGuard('ADMIN'), centerController.listStaff);
router.patch('/staff/:id', roleGuard('ADMIN'), centerController.updateStaffRole);
router.delete('/staff/:id', roleGuard('ADMIN'), centerController.deactivateStaff);

export default router;
