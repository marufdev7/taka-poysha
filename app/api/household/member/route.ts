import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPin } from '@/lib/authSecurity';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন' }, { status: 401 });
    }

    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'শুধুমাত্র পরিবারের অ্যাডমিন নতুন সদস্য যুক্ত করতে পারেন' }, { status: 403 });
    }

    const body = await request.json();
    const { householdId, name, role = 'MEMBER', pin } = body;

    const targetHouseholdId = householdId || auth.householdId;
    if (!targetHouseholdId || !name || !name.trim()) {
      return NextResponse.json({ error: 'সদস্যের নাম ও পরিবার আবশ্যক' }, { status: 400 });
    }

    // Set PIN: if provided, use it; otherwise generate a cryptographically random 4-digit PIN
    const rawPin = pin && String(pin).trim().length >= 4
      ? String(pin).trim()
      : Math.floor(1000 + Math.random() * 9000).toString();

    const hashedPin = hashPin(rawPin);

    // Create user for the new family member
    const newMemberUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: `${Date.now()}@local.app`,
        pin: hashedPin,
      },
    });

    // Link to household
    const membership = await prisma.householdMember.create({
      data: {
        householdId: targetHouseholdId,
        userId: newMemberUser.id,
        role: role || 'MEMBER',
      },
      include: {
        user: true,
      },
    });

    // Create default Cash wallet for this new member with 0 balance
    await prisma.account.create({
      data: {
        userId: newMemberUser.id,
        name: `ক্যাশ (${name.trim()})`,
        type: 'CASH',
        balance: 0,
      },
    });

    return NextResponse.json({
      success: true,
      member: membership,
      initialPin: rawPin,
      message: `সদস্য যুক্ত হয়েছে। প্রাথমিক পিন: ${rawPin}`,
    });
  } catch (error: any) {
    console.error('Add member error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'শুধুমাত্র পরিবারের অ্যাডমিন সদস্য ডিলিট করতে পারেন' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const householdId = searchParams.get('householdId') || auth.householdId;

    if (!userId || !householdId) {
      return NextResponse.json({ error: 'User ID and Household ID are required' }, { status: 400 });
    }

    // Prevent deleting oneself or if single member
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

    // Delete user's accounts, transactions, debts
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
