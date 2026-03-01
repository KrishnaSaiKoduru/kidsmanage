import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import { roleGuard } from '../../middleware/roleGuard';
import * as attendanceController from './attendance.controller';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.post('/checkin', roleGuard('ADMIN', 'CARETAKER'), attendanceController.checkIn);
router.post('/checkout', roleGuard('ADMIN', 'CARETAKER'), attendanceController.checkOut);
router.get('/today', roleGuard('ADMIN', 'CARETAKER'), attendanceController.getTodayAttendance);
router.get('/my-children', roleGuard('PARENT'), attendanceController.getMyChildrenAttendance);
router.get('/:childId', attendanceController.getChildHistory);

export default router;
