import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

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
  return prisma.enrollmentApplication.create({
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

  return { application: { ...application, status: 'APPROVED' }, child };
}
