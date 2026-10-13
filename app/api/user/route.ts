import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ। লগইন করুন।' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, name, householdId, householdName } = body;

    const targetUserId = userId || auth.userId;

    if (targetUserId !== auth.userId && auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'অন্য ব্যবহারকারীর প্রোফাইল পরিবর্তনের অনুমতি নেই' }, { status: 403 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'নাম প্রদান করা আবশ্যক' }, { status: 400 });
    }

    // Update user name
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { name: name.trim() },
    });

    // Optionally update household name (only if ADMIN)
    const targetHouseholdId = householdId || auth.householdId;
    if (targetHouseholdId && householdName && householdName.trim()) {
      if (auth.role === 'ADMIN') {
        await prisma.household.update({
          where: { id: targetHouseholdId },
          data: { name: householdName.trim() },
        });
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
