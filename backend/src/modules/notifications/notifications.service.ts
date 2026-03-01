import { prisma } from '../../lib/prisma';
import { resend } from '../../lib/resend';

// ─── In-App Notifications ───────────────────────────────────────────────────

export async function getNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

// ─── Notification Creator (used by other services) ──────────────────────────

export async function createNotification(data: {
  centerId: string;
  userId: string;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({ data });
}

/** Notify all admins at a center */
export async function notifyAdmins(centerId: string, title: string, body?: string, link?: string) {
  const admins = await prisma.user.findMany({
    where: { centerId, role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({ centerId, userId: a.id, title, body, link })),
  });
}

/** Notify specific users by ID */
export async function notifyUsers(centerId: string, userIds: string[], title: string, body?: string, link?: string) {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ centerId, userId, title, body, link })),
  });
}

// ─── Email Sender ───────────────────────────────────────────────────────────

const FROM_EMAIL = 'KidsManage <onboarding@resend.dev>';

export async function sendNotificationEmail(data: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: data.subject,
      html: buildEmailHtml(data),
    });
  } catch (err) {
    console.error('[Notification Email] Failed to send:', err);
    // Don't throw — email failure shouldn't block business logic
  }
}

function buildEmailHtml(data: { heading: string; body: string; ctaText?: string; ctaUrl?: string }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 0;">KidsManage</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">${data.heading}</h2>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">${data.body}</p>
        ${data.ctaText && data.ctaUrl ? `
          <a href="${data.ctaUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            ${data.ctaText}
          </a>
        ` : ''}
      </div>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
        You're receiving this because you have an account on KidsManage.
      </p>
    </div>
  `;
}
