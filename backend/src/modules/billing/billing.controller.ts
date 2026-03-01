import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { stripe } from '../../lib/stripe';
import * as billingService from './billing.service';
import * as subscriptionService from './subscription.service';

const createInvoiceSchema = z.object({
  childId: z.string().optional(),
  parentId: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string(),
  lineItems: z.any().optional(),
  lateFee: z.number().min(0).optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
});

export async function listInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    // PARENT users can only see their own invoices
    const parentId = req.user!.role === 'PARENT' ? req.user!.id : (req.query.parentId as string);
    const result = await billingService.listInvoices(req.user!.centerId!, {
      status: status as string,
      parentId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const result = await billingService.createInvoice(req.user!.centerId!, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await billingService.sendInvoice(req.user!.centerId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      res.status(400).json({ error: 'invoiceId is required' });
      return;
    }
    const result = await billingService.createCheckoutSession(req.user!.centerId!, invoiceId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Route to appropriate handler
    await billingService.handleStripeWebhook(event);
    await subscriptionService.handleSubscriptionWebhook(event);

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

// ─── Subscription Endpoints ─────────────────────────────────────────────────

export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await subscriptionService.getPlans();
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await subscriptionService.getSubscription(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createSubscriptionCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const { tier } = req.body;
    if (!tier) {
      res.status(400).json({ error: 'tier is required' });
      return;
    }
    const result = await subscriptionService.createSubscriptionCheckout(
      req.user!.centerId!,
      tier,
      req.user!.email,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createCustomerPortal(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await subscriptionService.createCustomerPortal(req.user!.centerId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
