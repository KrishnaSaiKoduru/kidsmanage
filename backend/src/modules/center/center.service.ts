import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function getCenter(centerId: string) {
  const center = await prisma.center.findUnique({
    where: { id: centerId },
  });

  if (!center) {
    throw new AppError(404, 'Center not found');
  }

  return center;
}

export async function updateCenter(centerId: string, data: {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  capacity?: number;
}) {
  return prisma.center.update({
    where: { id: centerId },
    data,
  });
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getJoinCode(centerId: string) {
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { joinCode: true },
  });

  if (!center) {
    throw new AppError(404, 'Center not found');
  }

  // Auto-generate join code if missing (backfill for pre-migration centers)
  if (!center.joinCode) {
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.center.findUnique({ where: { joinCode } });
      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
    }
    const updated = await prisma.center.update({
      where: { id: centerId },
      data: { joinCode },
    });
    return { joinCode: updated.joinCode };
  }

  return { joinCode: center.joinCode };
}

export async function listStaff(centerId: string) {
  return prisma.user.findMany({
    where: {
      centerId,
      role: { in: ['ADMIN', 'CARETAKER'] },
    },
    orderBy: { name: 'asc' },
  });
}

export async function listParents(centerId: string) {
  return prisma.user.findMany({
    where: {
      centerId,
      role: 'PARENT',
      status: 'ACTIVE',
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

export async function updateStaffRole(centerId: string, staffId: string, role: string) {
  const user = await prisma.user.findFirst({
    where: { id: staffId, centerId },
  });

  if (!user) {
    throw new AppError(404, 'Staff member not found');
  }

  return prisma.user.update({
    where: { id: staffId },
    data: { role: role as any },
  });
}

export async function deactivateStaff(centerId: string, staffId: string) {
  const user = await prisma.user.findFirst({
    where: { id: staffId, centerId },
  });

  if (!user) {
    throw new AppError(404, 'Staff member not found');
  }

  if (user.role === 'ADMIN') {
    throw new AppError(400, 'Cannot deactivate an admin');
  }

  return prisma.user.update({
    where: { id: staffId },
    data: { status: 'DEACTIVATED' },
  });
}
