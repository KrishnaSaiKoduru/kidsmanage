import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function checkIn(centerId: string, data: {
  childId: string;
  method?: 'MANUAL' | 'QR_CODE' | 'PIN';
  notes?: string;
}) {
  // Verify child belongs to center
  const child = await prisma.child.findFirst({
    where: { id: data.childId, centerId },
  });

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already checked in today
  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      childId: data.childId,
      centerId,
      date: today,
      checkOut: null,
    },
  });

  if (existing) {
    throw new AppError(400, 'Child is already checked in');
  }

  return prisma.attendanceRecord.create({
    data: {
      childId: data.childId,
      centerId,
      date: today,
      checkIn: new Date(),
      method: (data.method as any) || 'MANUAL',
      notes: data.notes,
    },
    include: {
      child: { select: { firstName: true, lastName: true, room: true } },
    },
  });
}

export async function checkOut(centerId: string, data: {
  childId: string;
  notes?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendanceRecord.findFirst({
    where: {
      childId: data.childId,
      centerId,
      date: today,
      checkOut: null,
    },
  });

  if (!record) {
    throw new AppError(400, 'No active check-in found for today');
  }

  return prisma.attendanceRecord.update({
    where: { id: record.id },
    data: {
      checkOut: new Date(),
      notes: data.notes ? `${record.notes || ''} ${data.notes}`.trim() : record.notes,
    },
    include: {
      child: { select: { firstName: true, lastName: true, room: true } },
    },
  });
}

export async function getTodayAttendance(centerId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = await prisma.attendanceRecord.findMany({
    where: { centerId, date: today },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, room: true, status: true } },
    },
    orderBy: { checkIn: 'desc' },
  });

  // Also get all enrolled children to show who's absent
  const allChildren = await prisma.child.findMany({
    where: { centerId, status: 'ENROLLED' },
    select: { id: true, firstName: true, lastName: true, room: true },
  });

  const checkedInIds = new Set(records.map((r) => r.childId));
  const absent = allChildren.filter((c) => !checkedInIds.has(c.id));

  return {
    present: records.filter((r) => !r.checkOut),
    checkedOut: records.filter((r) => r.checkOut),
    absent,
    summary: {
      total: allChildren.length,
      present: records.filter((r) => !r.checkOut).length,
      checkedOut: records.filter((r) => r.checkOut).length,
      absent: absent.length,
    },
  };
}

export async function getMyChildrenAttendance(centerId: string, parentId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get children linked to this parent
  const parentChildren = await prisma.parentChild.findMany({
    where: { parentId },
    include: {
      child: {
        select: { id: true, firstName: true, lastName: true, room: true, status: true },
      },
    },
  });

  const childIds = parentChildren.map((pc) => pc.child.id);

  if (childIds.length === 0) {
    return { children: [], records: [], summary: { total: 0, present: 0, checkedOut: 0, absent: 0 } };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { centerId, date: today, childId: { in: childIds } },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, room: true, status: true } },
    },
    orderBy: { checkIn: 'desc' },
  });

  const checkedInIds = new Set(records.map((r) => r.childId));
  const children = parentChildren.map((pc) => pc.child);
  const absent = children.filter((c) => !checkedInIds.has(c.id));

  return {
    present: records.filter((r) => !r.checkOut),
    checkedOut: records.filter((r) => r.checkOut),
    absent,
    summary: {
      total: children.length,
      present: records.filter((r) => !r.checkOut).length,
      checkedOut: records.filter((r) => r.checkOut).length,
      absent: absent.length,
    },
  };
}

export async function getChildAttendanceHistory(centerId: string, childId: string, limit = 30) {
  const child = await prisma.child.findFirst({
    where: { id: childId, centerId },
  });

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  return prisma.attendanceRecord.findMany({
    where: { childId, centerId },
    orderBy: { date: 'desc' },
    take: limit,
  });
}
