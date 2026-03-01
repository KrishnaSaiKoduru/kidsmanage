import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function listActivities(centerId: string, date?: string) {
  const filterDate = date ? new Date(date) : new Date();
  filterDate.setHours(0, 0, 0, 0);

  return prisma.activityLog.findMany({
    where: { centerId, date: filterDate },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, room: true } },
      completions: {
        include: {
          child: { select: { id: true, firstName: true, lastName: true, room: true } },
        },
      },
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

  // Create activity
  const activity = await prisma.activityLog.create({
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

  // Auto-create completion records for all enrolled children in the center
  const enrolledChildren = await prisma.child.findMany({
    where: { centerId, status: 'ENROLLED' },
    select: { id: true },
  });

  if (enrolledChildren.length > 0) {
    await prisma.activityCompletion.createMany({
      data: enrolledChildren.map((child) => ({
        activityId: activity.id,
        childId: child.id,
        completed: false,
      })),
      skipDuplicates: true,
    });
  }

  // Re-fetch with completions included
  return prisma.activityLog.findUnique({
    where: { id: activity.id },
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
      completions: {
        include: {
          child: { select: { id: true, firstName: true, lastName: true, room: true } },
        },
      },
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
      completions: {
        include: {
          child: { select: { id: true, firstName: true, lastName: true, room: true } },
        },
      },
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

// Toggle completion for a single child on an activity
export async function toggleCompletion(centerId: string, activityId: string, childId: string, userId: string) {
  // Verify activity belongs to this center
  const activity = await prisma.activityLog.findFirst({
    where: { id: activityId, centerId },
  });

  if (!activity) {
    throw new AppError(404, 'Activity not found');
  }

  // Find or create the completion record
  const existing = await prisma.activityCompletion.findUnique({
    where: { activityId_childId: { activityId, childId } },
  });

  if (existing) {
    return prisma.activityCompletion.update({
      where: { id: existing.id },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
        completedBy: !existing.completed ? userId : null,
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true, room: true } },
      },
    });
  }

  return prisma.activityCompletion.create({
    data: {
      activityId,
      childId,
      completed: true,
      completedAt: new Date(),
      completedBy: userId,
    },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, room: true } },
    },
  });
}

// Mark all children as done for an activity
export async function markAllDone(centerId: string, activityId: string, userId: string) {
  const activity = await prisma.activityLog.findFirst({
    where: { id: activityId, centerId },
  });

  if (!activity) {
    throw new AppError(404, 'Activity not found');
  }

  // Get all enrolled children in the center
  const enrolledChildren = await prisma.child.findMany({
    where: { centerId, status: 'ENROLLED' },
    select: { id: true },
  });

  const now = new Date();

  // Upsert completion records for all children
  for (const child of enrolledChildren) {
    await prisma.activityCompletion.upsert({
      where: { activityId_childId: { activityId, childId: child.id } },
      update: { completed: true, completedAt: now, completedBy: userId },
      create: {
        activityId,
        childId: child.id,
        completed: true,
        completedAt: now,
        completedBy: userId,
      },
    });
  }

  // Return updated activity
  return prisma.activityLog.findUnique({
    where: { id: activityId },
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
      completions: {
        include: {
          child: { select: { id: true, firstName: true, lastName: true, room: true } },
        },
      },
    },
  });
}

// Get activities for a specific child (parent view)
export async function listChildActivities(centerId: string, childId: string, date?: string) {
  const filterDate = date ? new Date(date) : new Date();
  filterDate.setHours(0, 0, 0, 0);

  return prisma.activityLog.findMany({
    where: { centerId, date: filterDate },
    include: {
      completions: {
        where: { childId },
        include: {
          child: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { scheduledTime: 'asc' },
  });
}
