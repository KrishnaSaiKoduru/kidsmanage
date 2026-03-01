import { prisma } from '../../lib/prisma';
import { stripe } from '../../lib/stripe';
import { AppError } from '../../middleware/errorHandler';

// ─── Plan Definitions ───────────────────────────────────────────────────────

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    maxChildren: 10,
    maxStaff: 2,
    features: [
      'Up to 10 children',
      'Up to 2 staff members',
      'Basic check-in/out',
      'Dashboard overview',
    ],
  },
  STARTER: {
    name: 'Starter',
    price: 4900, // cents
    maxChildren: 50,
    maxStaff: 10,
    features: [
      'Up to 50 children',
      'Up to 10 staff members',
      'Attendance with reports',
      'Stripe payment collection',
      '1-on-1 messaging',
      'Daily activities (unlimited)',
      'Basic enrollment forms',
      '100 email notifications/mo',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 14900, // cents
    maxChildren: 200,
    maxStaff: 50,
    features: [
      'Up to 200 children',
      'Up to 50 staff members',
      'Everything in Starter',
      'Auto-invoicing & late fees',
      'Broadcast messaging',
      'Custom enrollment forms + waitlist',
      '1,000 email notifications/mo',
      'Priority email support',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 34900, // cents
    maxChildren: -1, // unlimited
    maxStaff: -1,
    features: [
      'Unlimited children',
      'Unlimited staff',
      'Everything in Professional',
      'ACH payments',
      'File sharing in messages',
      'E-signatures & enrollment pipeline',
      'Unlimited email notifications',
      'Dedicated support + phone',
      'Data export & compliance reports',
    ],
  },
} as const;

export type PlanTier = keyof typeof PLANS;

// Cache for Stripe price IDs — populated once on first use
let stripePriceCache: Record<string, string> | null = null;

// ─── Ensure Stripe Products & Prices Exist ──────────────────────────────────

async function ensureStripePrices(): Promise<Record<string, string>> {
  if (stripePriceCache) return stripePriceCache;

  const priceMap: Record<string, string> = {};

  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.price === 0) continue; // Skip free tier

    // Search for existing product by metadata
    const products = await stripe.products.search({
      query: `metadata["kidsmanage_tier"]:"${tier}"`,
    });

    let productId: string;

    if (products.data.length > 0) {
      productId = products.data[0].id;
    } else {
      // Create the product
      const product = await stripe.products.create({
        name: `KidsManage ${plan.name}`,
        description: plan.features.join(' | '),
        metadata: { kidsmanage_tier: tier },
      });
      productId = product.id;
    }

    // Search for existing price
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: 'recurring',
      limit: 1,
    });

    if (prices.data.length > 0 && prices.data[0].unit_amount === plan.price) {
      priceMap[tier] = prices.data[0].id;
    } else {
      // Create the price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.price,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { kidsmanage_tier: tier },
      });
      priceMap[tier] = price.id;
    }
  }

  stripePriceCache = priceMap;
  return priceMap;
}

// ─── Get Plans with Stripe Price IDs ────────────────────────────────────────

export async function getPlans() {
  const priceMap = await ensureStripePrices();

  return Object.entries(PLANS).map(([tier, plan]) => ({
    tier,
    ...plan,
    priceInDollars: plan.price / 100,
    stripePriceId: priceMap[tier] || null,
  }));
}

// ─── Get Current Subscription ───────────────────────────────────────────────

export async function getSubscription(centerId: string) {
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: {
      planTier: true,
      stripeCustomerId: true,
      _count: {
        select: {
          children: { where: { status: 'ENROLLED' } },
          users: true,
        },
      },
    },
  });

  if (!center) throw new AppError(404, 'Center not found');

  const currentPlan = PLANS[center.planTier as PlanTier] || PLANS.FREE;

  // Check if there's an active Stripe subscription
  let subscription = null;
  if (center.stripeCustomerId) {
    const subs = await stripe.subscriptions.list({
      customer: center.stripeCustomerId,
      status: 'active',
      limit: 1,
    });
    if (subs.data.length > 0) {
      const sub = subs.data[0] as any;
      subscription = {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    }
  }

  return {
    planTier: center.planTier,
    planName: currentPlan.name,
    priceInDollars: currentPlan.price / 100,
    maxChildren: currentPlan.maxChildren,
    maxStaff: currentPlan.maxStaff,
    features: currentPlan.features,
    enrolledChildren: center._count.children,
    totalUsers: center._count.users,
    subscription,
  };
}

// ─── Create Subscription Checkout ───────────────────────────────────────────

export async function createSubscriptionCheckout(centerId: string, targetTier: string, userEmail: string) {
  if (targetTier === 'FREE') {
    throw new AppError(400, 'Cannot checkout for the Free plan');
  }

  const plan = PLANS[targetTier as PlanTier];
  if (!plan) {
    throw new AppError(400, 'Invalid plan tier');
  }

  const priceMap = await ensureStripePrices();
  const priceId = priceMap[targetTier];
  if (!priceId) {
    throw new AppError(500, 'Stripe price not configured for this plan');
  }

  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { stripeCustomerId: true, name: true },
  });

  if (!center) throw new AppError(404, 'Center not found');

  // Get or create Stripe customer
  let customerId = center.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: center.name,
      metadata: { centerId },
    });
    customerId = customer.id;

    await prisma.center.update({
      where: { id: centerId },
      data: { stripeCustomerId: customerId },
    });
  }

  // Check if they already have an active subscription
  const existingSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  if (existingSubs.data.length > 0) {
    // Update the existing subscription to the new plan
    const sub = existingSubs.data[0];
    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: sub.items.data[0].id, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata: { centerId, tier: targetTier },
    });

    // Update plan tier in database
    await prisma.center.update({
      where: { id: centerId },
      data: { planTier: targetTier as any },
    });

    return { type: 'updated', subscriptionId: updated.id };
  }

  // Create a new checkout session for subscription
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { centerId, tier: targetTier },
    subscription_data: {
      metadata: { centerId, tier: targetTier },
    },
    success_url: `${process.env.FRONTEND_URL}/?tab=settings&subscription=success`,
    cancel_url: `${process.env.FRONTEND_URL}/?tab=settings&subscription=cancelled`,
  });

  return { type: 'checkout', url: session.url };
}

// ─── Customer Portal (manage/cancel subscription) ───────────────────────────

export async function createCustomerPortal(centerId: string) {
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { stripeCustomerId: true },
  });

  if (!center?.stripeCustomerId) {
    throw new AppError(400, 'No active subscription to manage. Subscribe to a plan first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: center.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/?tab=settings`,
  });

  return { url: session.url };
}

// ─── Handle Subscription Webhooks ───────────────────────────────────────────

export async function handleSubscriptionWebhook(event: any) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const centerId = sub.metadata?.centerId;
      const tier = sub.metadata?.tier;

      if (centerId && tier && sub.status === 'active') {
        await prisma.center.update({
          where: { id: centerId },
          data: { planTier: tier as any },
        });
      }

      // Handle cancellation scheduled
      if (sub.cancel_at_period_end && centerId) {
        await prisma.center.update({
          where: { id: centerId },
          data: { planTier: 'FREE' },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const centerId = sub.metadata?.centerId;

      if (centerId) {
        await prisma.center.update({
          where: { id: centerId },
          data: { planTier: 'FREE', stripeCustomerId: null },
        });
      }
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        const centerId = session.metadata?.centerId;
        const tier = session.metadata?.tier;

        if (centerId && tier) {
          await prisma.center.update({
            where: { id: centerId },
            data: { planTier: tier as any },
          });
        }
      }
      break;
    }
  }
}
