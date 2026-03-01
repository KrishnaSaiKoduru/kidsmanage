import { Router, raw } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { tenantGuard } from '../../middleware/tenantGuard';
import { roleGuard } from '../../middleware/roleGuard';
import * as billingController from './billing.controller';

const router = Router();

// Stripe webhook needs raw body — must be before JSON parsing
router.post('/stripe/webhook', raw({ type: 'application/json' }), billingController.stripeWebhook);

// Protected routes
router.use(authMiddleware, tenantGuard);

router.get('/invoices', billingController.listInvoices);
router.post('/invoices', roleGuard('ADMIN'), billingController.createInvoice);
router.post('/invoices/:id/send', roleGuard('ADMIN'), billingController.sendInvoice);
router.post('/stripe/checkout', roleGuard('ADMIN', 'PARENT'), billingController.createCheckoutSession);
router.get('/subscriptions', roleGuard('ADMIN'), billingController.getSubscriptionStatus);

export default router;
