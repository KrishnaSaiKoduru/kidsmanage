import { prisma } from '../../lib/prisma';
import { stripe } from '../../lib/stripe';
import { resend } from '../../lib/resend';
import { AppError } from '../../middleware/errorHandler';
import { notifyAdmins, createNotification, sendNotificationEmail } from '../notifications/notifications.service';

export async function listInvoices(centerId: string, filters?: {
  status?: string;
  parentId?: string;
}) {
  return prisma.invoice.findMany({
    where: {
      centerId,
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.parentId && { parentId: filters.parentId }),
    },
    include: {
      child: { select: { firstName: true, lastName: true } },
      parent: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createInvoice(centerId: string, data: {
  childId?: string;
  parentId?: string;
  amount: number;
  dueDate: string;
  lineItems?: any;
  lateFee?: number;
  gracePeriodDays?: number;
}) {
  // Auto-calculate tax from center's tax rate
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { taxRate: true },
  });
  const taxRate = center?.taxRate ?? 0;
  const tax = Math.round(data.amount * taxRate) / 100;
  const total = data.amount + tax;

  return prisma.invoice.create({
    data: {
      centerId,
      childId: data.childId,
      parentId: data.parentId,
      amount: data.amount,
      tax,
      total,
      dueDate: new Date(data.dueDate),
      lineItems: data.lineItems,
      lateFee: data.lateFee ?? 25,
      gracePeriodDays: data.gracePeriodDays ?? 7,
    },
    include: {
      child: { select: { firstName: true, lastName: true } },
      parent: { select: { name: true, email: true } },
    },
  });
}

export async function sendInvoice(centerId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, centerId },
    include: {
      parent: { select: { name: true, email: true } },
      child: { select: { firstName: true, lastName: true } },
      center: { select: { name: true } },
    },
  });

  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  if (!invoice.parent?.email) {
    throw new AppError(400, 'No parent email associated with this invoice');
  }

  // Send email via Resend
  await resend.emails.send({
    from: 'KidsManage <onboarding@resend.dev>',
    to: invoice.parent.email,
    subject: `Invoice from ${invoice.center.name} - $${invoice.total.toFixed(2)}`,
    html: `
      <h2>Invoice from ${invoice.center.name}</h2>
      ${invoice.child ? `<p>Student: ${invoice.child.firstName} ${invoice.child.lastName}</p>` : ''}
      <p>Amount: $${invoice.total.toFixed(2)}</p>
      <p>Due Date: ${invoice.dueDate.toLocaleDateString()}</p>
      <p><a href="${process.env.FRONTEND_URL}/billing">View & Pay Invoice</a></p>
    `,
  });

  // Update status to SENT
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'SENT' },
  });

  // Create in-app notification for the parent
  if (invoice.parentId) {
    createNotification({
      centerId,
      userId: invoice.parentId,
      title: 'New Invoice',
      body: `You have a new invoice of $${invoice.total.toFixed(2)} due ${invoice.dueDate.toLocaleDateString()}.`,
      link: '/billing',
    });
  }

  return updated;
}

export async function createCheckoutSession(centerId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, centerId },
    include: {
      center: { select: { name: true, stripeCustomerId: true } },
      child: { select: { firstName: true, lastName: true } },
    },
  });

  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  if (invoice.status === 'PAID') {
    throw new AppError(400, 'Invoice is already paid');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice - ${invoice.child ? `${invoice.child.firstName} ${invoice.child.lastName}` : 'Childcare'}`,
            description: `Invoice from ${invoice.center.name}`,
          },
          unit_amount: Math.round(invoice.total * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      centerId,
    },
    success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
  });

  return { url: session.url };
}

export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        const paidInvoice = await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            stripePaymentId: session.payment_intent,
          },
          include: {
            parent: { select: { id: true, name: true, email: true } },
            center: { select: { name: true } },
          },
        });

        // Notify admin that payment was received
        if (paidInvoice.centerId) {
          notifyAdmins(
            paidInvoice.centerId,
            'Payment Received',
            `${paidInvoice.parent?.name || 'A parent'} paid $${paidInvoice.total.toFixed(2)}.`,
            '/billing',
          );
        }

        // Notify parent with confirmation
        if (paidInvoice.parentId) {
          createNotification({
            centerId: paidInvoice.centerId,
            userId: paidInvoice.parentId,
            title: 'Payment Confirmed',
            body: `Your payment of $${paidInvoice.total.toFixed(2)} has been received. Thank you!`,
            link: '/billing',
          });
        }

        // Send payment confirmation email to parent
        if (paidInvoice.parent?.email) {
          sendNotificationEmail({
            to: paidInvoice.parent.email,
            subject: `Payment Confirmed - $${paidInvoice.total.toFixed(2)}`,
            heading: 'Payment Received',
            body: `Hi ${paidInvoice.parent.name}, your payment of $${paidInvoice.total.toFixed(2)} to ${paidInvoice.center.name} has been confirmed.`,
          });
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      // Handle direct payment intents if needed
      console.log('Payment succeeded:', event.data.object.id);
      break;
    }
  }
}

export async function getSubscriptionStatus(centerId: string) {
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: {
      planTier: true,
      stripeCustomerId: true,
      _count: { select: { children: { where: { status: 'ENROLLED' } }, users: true } },
    },
  });

  if (!center) {
    throw new AppError(404, 'Center not found');
  }

  return {
    planTier: center.planTier,
    enrolledChildren: center._count.children,
    totalUsers: center._count.users,
    hasStripeCustomer: !!center.stripeCustomerId,
  };
}
