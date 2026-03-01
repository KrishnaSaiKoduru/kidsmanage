import { prisma } from '../../lib/prisma';
import { supabaseAdmin } from '../../lib/supabase';
import { resend } from '../../lib/resend';
import { AppError } from '../../middleware/errorHandler';
import { notifyAdmins } from '../notifications/notifications.service';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function registerCenter(data: {
  centerName: string;
  directorName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  // Create Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (authError) {
    throw new AppError(400, authError.message);
  }

  // Generate a unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.center.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  // Create center and admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const center = await tx.center.create({
      data: {
        name: data.centerName,
        joinCode,
      },
    });

    const user = await tx.user.create({
      data: {
        supabaseId: authData.user.id,
        centerId: center.id,
        name: data.directorName,
        email: data.email,
        phone: data.phone,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    return { center, user };
  });

  return result;
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'PARENT' | 'CARETAKER';
  joinCode: string;
}) {
  // Look up center by join code
  const center = await prisma.center.findUnique({
    where: { joinCode: data.joinCode.toUpperCase() },
  });

  if (!center) {
    throw new AppError(400, 'Invalid join code');
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError(400, 'User with this email already exists');
  }

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (authError) {
    throw new AppError(400, authError.message);
  }

  // Create user record
  const user = await prisma.user.create({
    data: {
      supabaseId: authData.user.id,
      centerId: center.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      status: 'ACTIVE',
    },
  });

  return { user, center };
}

export async function inviteUser(data: {
  centerId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CARETAKER' | 'PARENT';
  invitedBy: string;
}) {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError(400, 'User with this email already exists');
  }

  // Create Supabase auth user with invite
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    email_confirm: false,
  });

  if (authError) {
    throw new AppError(400, authError.message);
  }

  // Create user record as INVITED
  const user = await prisma.user.create({
    data: {
      supabaseId: authData.user.id,
      centerId: data.centerId,
      name: data.name,
      email: data.email,
      role: data.role,
      status: 'INVITED',
    },
  });

  // Send invite email via Resend
  try {
    await resend.emails.send({
      from: 'KidsManage <onboarding@resend.dev>',
      to: data.email,
      subject: 'You\'ve been invited to KidsManage',
      html: `<p>Hi ${data.name},</p><p>You've been invited to join KidsManage. Please set up your account by clicking the link below.</p><p><a href="${process.env.FRONTEND_URL}/accept-invite?email=${encodeURIComponent(data.email)}">Accept Invitation</a></p>`,
    });
  } catch {
    // Email failure shouldn't block invite creation
    console.error('Failed to send invite email');
  }

  return user;
}

export async function acceptInvite(data: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || user.status !== 'INVITED') {
    throw new AppError(400, 'No pending invitation found');
  }

  // Update Supabase auth user password
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseId, {
    password: data.password,
    email_confirm: true,
  });

  if (error) {
    throw new AppError(400, error.message);
  }

  // Activate user
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE' },
  });

  // Notify admins that the invite was accepted
  if (user.centerId) {
    notifyAdmins(
      user.centerId,
      'Invite Accepted',
      `${user.name} (${user.role}) has accepted their invitation and joined the center.`,
      '/settings',
    );
  }

  return updated;
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { center: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}

export async function updateProfile(userId: string, data: {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
