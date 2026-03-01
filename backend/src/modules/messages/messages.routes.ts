import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import * as messagesController from './messages.controller';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/conversations/users', messagesController.getCenterUsers);
router.get('/conversations', messagesController.listConversations);
router.post('/conversations', messagesController.createConversation);
router.get('/conversations/:id/messages', messagesController.getMessages);
router.put('/conversations/:id/read', messagesController.markAsRead);
router.post('/conversations/:id/messages', messagesController.sendMessage);

export default router;
