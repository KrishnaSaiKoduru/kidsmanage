import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function listActivities(centerId: string, date?: string) {
  const filterDate = date ? new Date(date) : new Date();
  filterDate.setHours(0, 0, 0, 0);

  return prisma.activityLog.findMany({
    where: { centerId, date: filterDate },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, room: true } },
    },
    orderBy: { scheduledTime: 'asc' },
  });
}

export async function createActivity(centerId: string, data: {
  title: string;
  category: string;
  scheduledTime?: string;
  notes?: string;
  childId?: string;
  date?: string;
}) {
  const activityDate = data.date ? new Date(data.date) : new Date();
  activityDate.setHours(0, 0, 0, 0);

  return prisma.activityLog.create({
    data: {
      centerId,
      title: data.title,
      category: data.category,
      scheduledTime: data.scheduledTime,
      notes: data.notes,
      childId: data.childId,
      date: activityDate,
    },
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function updateActivity(centerId: string, id: string, data: {
  title?: string;
  category?: string;
  scheduledTime?: string;
  notes?: string;
}) {
  const activity = await prisma.activityLog.findFirst({
    where: { id, centerId },
  });

  if (!activity) {
    throw new AppError(404, 'Activity not found');
  }

  return prisma.activityLog.update({
    where: { id },
    data,
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function deleteActivity(centerId: string, id: string) {
  const activity = await prisma.activityLog.findFirst({
    where: { id, centerId },
  });

  if (!activity) {
    throw new AppError(404, 'Activity not found');
  }

  return prisma.activityLog.delete({ where: { id } });
}
