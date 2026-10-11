import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Find active household that has members
    const household = await prisma.household.findFirst({
      where: {
        members: { some: {} },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                pin: true,
              },
            },
          },
        },
      },
    });

    if (!household || household.members.length === 0) {
      // Check if any standalone users exist
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          pin: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (users.length === 0) {
        return NextResponse.json({
          requiresSetup: true,
          householdName: 'টাকা-পয়সা',
          profiles: [],
        });
      }

      return NextResponse.json({
        requiresSetup: false,
        householdName: 'আমার পরিবার',
        profiles: users.map((u) => ({
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl,
          hasPin: Boolean(u.pin && u.pin.trim().length > 0),
          role: 'ADMIN',
        })),
      });
    }

    const profiles = household.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      hasPin: Boolean(m.user.pin && m.user.pin.trim().length > 0),
      role: m.role,
    }));

    return NextResponse.json({
      requiresSetup: false,
      householdName: household.name,
      profiles,
    });
  } catch (error: any) {
    console.error('Error fetching auth profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
