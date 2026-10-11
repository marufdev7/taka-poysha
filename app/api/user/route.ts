import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, householdId, householdName } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: 'ব্যবহারকারীর আইডি ও নাম আবশ্যক' }, { status: 400 });
    }

    // Update user name
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    // Optionally update household name
    if (householdId && householdName) {
      await prisma.household.update({
        where: { id: householdId },
        data: { name: householdName },
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
