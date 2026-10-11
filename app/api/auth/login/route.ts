import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, pin } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ব্যবহারকারী নির্বাচন করুন' }, { status: 400 });
    }

    if (!pin || String(pin).trim().length < 4) {
      return NextResponse.json({ error: 'কমপক্ষে ৪ সংখ্যার পিন প্রদান করুন' }, { status: 400 });
    }

    const cleanPin = String(pin).trim();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            household: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি' }, { status: 404 });
    }

    // If user does not have a PIN yet (initial setup)
    if (!user.pin) {
      await prisma.user.update({
        where: { id: userId },
        data: { pin: cleanPin },
      });

      const role = user.memberships[0]?.role || 'ADMIN';
      return NextResponse.json({
        success: true,
        isNewPin: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          householdId: user.memberships[0]?.householdId,
        },
      });
    }

    // Verify existing PIN
    if (user.pin !== cleanPin) {
      return NextResponse.json({ error: 'ভুল পিন নম্বর! অনুগ্রহ করে সঠিক পিন দিন।' }, { status: 401 });
    }

    const role = user.memberships[0]?.role || 'MEMBER';
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        householdId: user.memberships[0]?.householdId,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
