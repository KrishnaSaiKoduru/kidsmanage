import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import { roleGuard } from '../../middleware/roleGuard';
import * as activitiesController from './activities.controller';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/', activitiesController.list);
router.post('/', roleGuard('ADMIN', 'CARETAKER'), activitiesController.create);
router.patch('/:id', roleGuard('ADMIN', 'CARETAKER'), activitiesController.update);
router.delete('/:id', roleGuard('ADMIN', 'CARETAKER'), activitiesController.remove);

export default router;
