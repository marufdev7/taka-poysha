import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPin } from '@/lib/authSecurity';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, adminPin } = body;

    // 1. Try to get user from session or body
    let auth = await getAuthenticatedUser(request);
    let targetUserId = auth?.userId || userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'অ্যাডমিন ভেরিফিকেশন প্রয়োজন। লগইন করুন।' },
        { status: 401 }
      );
    }

    if (!adminPin || String(adminPin).trim().length < 4) {
      return NextResponse.json(
        { error: 'রিসেট নিশ্চিত করতে সঠিক অ্যাডমিন সিকিউরিটি পিন (PIN) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const cleanPin = String(adminPin).trim();

    // 2. Fetch admin user
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' }, { status: 404 });
    }

    // 3. Verify role
    const role = user.memberships[0]?.role || 'MEMBER';
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'শুধুমাত্র পরিবারের অ্যাডমিন সমস্ত হিসাব রিসেট করতে পারেন।' },
        { status: 403 }
      );
    }

    // 4. Verify Admin PIN (timing-safe)
    const isPinValid = verifyPin(cleanPin, user.pin);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'ভুল অ্যাডমিন পিন! রিসেট বাতিল করা হয়েছে।' },
        { status: 401 }
      );
    }

    // 5. If household exists, delete only this household's transactions, or all if single tenant
    const householdId = user.memberships[0]?.householdId;

    if (householdId) {
      await prisma.transaction.deleteMany({ where: { householdId } });
      await prisma.budget.deleteMany({ where: { householdId } });
      await prisma.aiReport.deleteMany({ where: { householdId } });
      await prisma.debt.deleteMany({ where: { householdId } });

      // Reset member accounts belonging to this household
      await prisma.account.updateMany({
        where: {
          user: {
            memberships: { some: { householdId } },
          },
        },
        data: { balance: 0 },
      });
    } else {
      await prisma.transaction.deleteMany();
      await prisma.budget.deleteMany();
      await prisma.aiReport.deleteMany();
      await prisma.debt.deleteMany();
      await prisma.account.updateMany({ data: { balance: 0 } });
    }

    return NextResponse.json({
      success: true,
      message: 'সকল লেনদেন ও হিসাব সফলভাবে শূন্য (০) করা হয়েছে।',
    });
  } catch (error: any) {
    console.error('Secure reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
