import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPin } from '@/lib/authSecurity';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviteCode, name, pin } = body;

    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ error: 'ইনভিটেশন কোড আবশ্যক' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'আপনার নাম প্রদান করুন' }, { status: 400 });
    }

    if (!pin || String(pin).trim().length < 4) {
      return NextResponse.json({ error: 'কমপক্ষে ৪ সংখ্যার সিকিউরিটি পিন দিন' }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    // Look for household with this inviteCode
    const household = await prisma.household.findFirst({
      where: {
        OR: [
          { inviteCode: cleanCode },
          { inviteCode: inviteCode.trim() },
        ],
      },
    });

    if (!household) {
      return NextResponse.json(
        { error: 'ভুল ইনভিটেশন কোড! সঠিক কোডটি অ্যাডমিনের কাছ থেকে জেনে নিন।' },
        { status: 404 }
      );
    }

    // 1. Create user with cryptographically hashed PIN
    const hashedPin = hashPin(String(pin).trim());
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: `${Date.now()}@local.app`,
        pin: hashedPin,
      },
    });

    // 2. Link user to household as MEMBER
    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: newUser.id,
        role: 'MEMBER',
      },
    });

    // 3. Create a default cash wallet for this new member
    await prisma.account.create({
      data: {
        userId: newUser.id,
        name: `ক্যাশ (${name.trim()})`,
        type: 'CASH',
        balance: 0,
      },
    });

    // 4. Issue session token and HttpOnly cookie
    const token = createSessionToken(newUser.id, 'MEMBER');

    const response = NextResponse.json({
      success: true,
      token,
      message: `সফলভাবে "${household.name}" পরিবারে যুক্ত হয়েছেন!`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: 'MEMBER',
        householdId: household.id,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Join with invite code error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
