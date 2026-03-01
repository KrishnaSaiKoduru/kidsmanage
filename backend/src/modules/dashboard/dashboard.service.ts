import { prisma } from '../../lib/prisma';

export async function getStats(centerId: string, userId: string, role: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (role === 'PARENT') {
    return getParentStats(centerId, userId, today);
  }

  if (role === 'CARETAKER') {
    return getCaretakerStats(centerId, today);
  }

  // ADMIN — full stats
  return getAdminStats(centerId, today);
}

async function getAdminStats(centerId: string, today: Date) {
  const [
    childCount,
    todayRecords,
    invoices,
    pendingApplications,
  ] = await Promise.all([
    prisma.child.count({ where: { centerId, status: 'ENROLLED' } }),
    prisma.attendanceRecord.findMany({
      where: { centerId, date: today },
      include: { child: { select: { firstName: true, lastName: true } } },
    }),
    prisma.invoice.findMany({
      where: { centerId },
      select: { status: true, total: true },
    }),
    prisma.enrollmentApplication.count({
      where: { centerId, status: 'PENDING' },
    }),
  ]);

  const presentCount = todayRecords.filter((r) => !r.checkOut).length;
  const checkedOutCount = todayRecords.filter((r) => r.checkOut).length;
  const absentCount = childCount - todayRecords.length;

  const collected = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0);
  const pending = invoices.filter((i) => i.status === 'SENT' || i.status === 'DRAFT').reduce((sum, i) => sum + i.total, 0);
  const overdue = invoices.filter((i) => i.status === 'OVERDUE').reduce((sum, i) => sum + i.total, 0);

  const unreadMessages = await prisma.message.count({
    where: { conversation: { centerId }, createdAt: { gte: today } },
  });

  return {
    children: { enrolled: childCount, pendingApplications },
    attendance: {
      present: presentCount,
      checkedOut: checkedOutCount,
      absent: absentCount,
      total: childCount,
      rate: childCount > 0 ? Math.round((presentCount / childCount) * 100) : 0,
    },
    billing: { collected, pending, overdue },
    unreadMessages,
    recentCheckIns: todayRecords
      .filter((r) => r.checkIn)
      .sort((a, b) => (b.checkIn?.getTime() || 0) - (a.checkIn?.getTime() || 0))
      .slice(0, 5)
      .map((r) => ({
        childName: `${r.child.firstName} ${r.child.lastName}`,
        time: r.checkIn,
        type: 'checkin' as const,
      })),
  };
}

async function getCaretakerStats(centerId: string, today: Date) {
  const [childCount, todayRecords, activityCount] = await Promise.all([
    prisma.child.count({ where: { centerId, status: 'ENROLLED' } }),
    prisma.attendanceRecord.findMany({
      where: { centerId, date: today },
      include: { child: { select: { firstName: true, lastName: true } } },
    }),
    prisma.activityLog.count({ where: { centerId, date: today } }),
  ]);

  const presentCount = todayRecords.filter((r) => !r.checkOut).length;
  const checkedOutCount = todayRecords.filter((r) => r.checkOut).length;
  const absentCount = childCount - todayRecords.length;

  const unreadMessages = await prisma.message.count({
    where: { conversation: { centerId }, createdAt: { gte: today } },
  });

  return {
    children: { enrolled: childCount },
    attendance: {
      present: presentCount,
      checkedOut: checkedOutCount,
      absent: absentCount,
      total: childCount,
      rate: childCount > 0 ? Math.round((presentCount / childCount) * 100) : 0,
    },
    activitiesScheduled: activityCount,
    unreadMessages,
    recentCheckIns: todayRecords
      .filter((r) => r.checkIn)
      .sort((a, b) => (b.checkIn?.getTime() || 0) - (a.checkIn?.getTime() || 0))
      .slice(0, 5)
      .map((r) => ({
        childName: `${r.child.firstName} ${r.child.lastName}`,
        time: r.checkIn,
        type: 'checkin' as const,
      })),
  };
}

async function getParentStats(centerId: string, parentId: string, today: Date) {
  // Get parent's children
  const parentChildren = await prisma.parentChild.findMany({
    where: { parentId },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, room: true } },
    },
  });

  const childIds = parentChildren.map((pc) => pc.child.id);

  const [todayRecords, invoices] = await Promise.all([
    childIds.length > 0
      ? prisma.attendanceRecord.findMany({
          where: { centerId, date: today, childId: { in: childIds } },
          include: { child: { select: { firstName: true, lastName: true } } },
        })
      : [],
    prisma.invoice.findMany({
      where: { centerId, parentId },
      select: { status: true, total: true },
    }),
  ]);

  const checkedInIds = new Set((todayRecords as any[]).map((r: any) => r.childId));
  const children = parentChildren.map((pc) => pc.child);
  const presentCount = (todayRecords as any[]).filter((r: any) => !r.checkOut).length;
  const checkedOutCount = (todayRecords as any[]).filter((r: any) => r.checkOut).length;
  const absentCount = children.filter((c) => !checkedInIds.has(c.id)).length;

  const pending = invoices.filter((i) => i.status === 'SENT' || i.status === 'DRAFT').reduce((sum, i) => sum + i.total, 0);
  const overdue = invoices.filter((i) => i.status === 'OVERDUE').reduce((sum, i) => sum + i.total, 0);

  const unreadMessages = await prisma.message.count({
    where: { conversation: { centerId }, createdAt: { gte: today } },
  });

  return {
    myChildren: children,
    attendance: {
      present: presentCount,
      checkedOut: checkedOutCount,
      absent: absentCount,
      total: children.length,
      rate: children.length > 0 ? Math.round((presentCount / children.length) * 100) : 0,
    },
    billing: { pending, overdue },
    unreadMessages,
  };
}
