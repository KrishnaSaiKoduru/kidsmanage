import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { notifyAdmins, sendNotificationEmail } from '../notifications/notifications.service';

export async function listApplications(centerId: string) {
  return prisma.enrollmentApplication.findMany({
    where: { centerId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createApplication(centerId: string, data: {
  childName: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  dateOfBirth: string;
  notes?: string;
}) {
  const application = await prisma.enrollmentApplication.create({
    data: {
      centerId,
      childName: data.childName,
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
      dateOfBirth: new Date(data.dateOfBirth),
      notes: data.notes,
    },
  });

  // Notify admins about new enrollment application
  notifyAdmins(
    centerId,
    'New Enrollment Application',
    `${data.parentName} submitted an application for ${data.childName}.`,
    '/enrollment',
  );

  // Send confirmation email to parent
  sendNotificationEmail({
    to: data.parentEmail,
    subject: 'Enrollment Application Received',
    heading: 'Application Received',
    body: `Hi ${data.parentName}, we've received your enrollment application for ${data.childName}. We'll review it and get back to you soon.`,
  });

  return application;
}

export async function approveApplication(centerId: string, id: string) {
  const application = await prisma.enrollmentApplication.findFirst({
    where: { id, centerId },
  });

  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new AppError(400, 'Application is not in pending status');
  }

  // Create child record from application data
  const [, child] = await prisma.$transaction([
    prisma.enrollmentApplication.update({
      where: { id },
      data: { status: 'APPROVED' },
    }),
    prisma.child.create({
      data: {
        centerId,
        firstName: application.childName.split(' ')[0] || application.childName,
        lastName: application.childName.split(' ').slice(1).join(' ') || '',
        dateOfBirth: application.dateOfBirth,
        status: 'ENROLLED',
      },
    }),
  ]);

  // Send approval email to parent
  sendNotificationEmail({
    to: application.parentEmail,
    subject: 'Enrollment Approved!',
    heading: 'Your Child Has Been Enrolled',
    body: `Great news, ${application.parentName}! The enrollment application for ${application.childName} has been approved. Welcome to our center!`,
    ctaText: 'View Details',
    ctaUrl: `${process.env.FRONTEND_URL}`,
  });

  return { application: { ...application, status: 'APPROVED' }, child };
}
