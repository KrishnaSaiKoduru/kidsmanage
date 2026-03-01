import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function listChildren(centerId: string, filters?: {
  room?: string;
  status?: string;
  search?: string;
}) {
  return prisma.child.findMany({
    where: {
      centerId,
      ...(filters?.room && { room: filters.room }),
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.search && {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' as const } },
          { lastName: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    },
    include: {
      parentChildren: {
        include: { parent: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
    orderBy: { firstName: 'asc' },
  });
}

export async function createChild(centerId: string, data: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  room?: string;
  allergies?: string;
  notes?: string;
  parentIds?: string[];
}) {
  const { parentIds, ...childData } = data;

  return prisma.child.create({
    data: {
      centerId,
      firstName: childData.firstName,
      lastName: childData.lastName,
      dateOfBirth: new Date(childData.dateOfBirth),
      room: childData.room,
      allergies: childData.allergies,
      notes: childData.notes,
      ...(parentIds?.length && {
        parentChildren: {
          create: parentIds.map((parentId) => ({ parentId })),
        },
      }),
    },
    include: {
      parentChildren: {
        include: { parent: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export async function getChild(centerId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, centerId },
    include: {
      parentChildren: {
        include: { parent: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  return child;
}

export async function updateChild(centerId: string, childId: string, data: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  room?: string;
  allergies?: string;
  notes?: string;
  status?: string;
}) {
  const child = await prisma.child.findFirst({
    where: { id: childId, centerId },
  });

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  return prisma.child.update({
    where: { id: childId },
    data: {
      ...data,
      ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
      ...(data.status && { status: data.status as any }),
    },
  });
}

export async function archiveChild(centerId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, centerId },
  });

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  return prisma.child.update({
    where: { id: childId },
    data: { status: 'WITHDRAWN' },
  });
}
