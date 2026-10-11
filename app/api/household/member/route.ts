import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { householdId, name, role = 'MEMBER', pin } = body;

    if (!householdId || !name || !name.trim()) {
      return NextResponse.json({ error: 'সদস্যের নাম ও পরিবার আবশ্যক' }, { status: 400 });
    }

    // Create user for the new family member
    const newMemberUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: `${Date.now()}@local.app`,
        pin: pin && String(pin).trim().length >= 4 ? String(pin).trim() : '1234',
      },
    });

    // Link to household
    const membership = await prisma.householdMember.create({
      data: {
        householdId,
        userId: newMemberUser.id,
        role: role || 'MEMBER',
      },
      include: {
        user: true,
      },
    });

    // Create default Cash wallet for this new member with 0 balance
    await prisma.account.create({
      data: { userId: newMemberUser.id, name: `ক্যাশ (${name.trim()})`, type: 'CASH', balance: 0 },
    });

    return NextResponse.json({ success: true, member: membership });
  } catch (error: any) {
    console.error('Add member error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const householdId = searchParams.get('householdId');

    if (!userId || !householdId) {
      return NextResponse.json({ error: 'User ID and Household ID are required' }, { status: 400 });
    }

    // Prevent deleting the main admin if they are the only member
    const membersCount = await prisma.householdMember.count({
      where: { householdId },
    });

    if (membersCount <= 1) {
      return NextResponse.json({ error: 'পরিবারের একমাত্র মূল সদস্যকে মোছা যাবে না' }, { status: 400 });
    }

    // Remove household membership
    await prisma.householdMember.deleteMany({
      where: {
        householdId,
        userId,
      },
    });

    // Delete user's accounts & transactions
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.debt.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: 'সদস্য সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (error: any) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
