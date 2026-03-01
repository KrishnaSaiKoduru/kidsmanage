import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import * as childrenController from './children.controller';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/', childrenController.listChildren);
router.post('/', childrenController.createChild);
router.get('/:id', childrenController.getChild);
router.patch('/:id', childrenController.updateChild);
router.delete('/:id', childrenController.deleteChild);

export default router;
