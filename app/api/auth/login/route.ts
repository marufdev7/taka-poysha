import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPin,
  verifyPin,
  needsRehash,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from '@/lib/authSecurity';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

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

    // 1. Check Rate Limit (Brute Force Protection)
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `অতিরিক্ত ভুল পিন চেষ্টার কারণে অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে। অনুগ্রহ করে ${rateCheck.retryAfterMinutes} মিনিট পর আবার চেষ্টা করুন।`,
          locked: true,
        },
        { status: 429 }
      );
    }

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

    const role = user.memberships[0]?.role || 'MEMBER';

    // 2. Initial PIN setup if user does not have a PIN yet
    if (!user.pin) {
      const hashed = hashPin(cleanPin);
      await prisma.user.update({
        where: { id: userId },
        data: { pin: hashed },
      });

      clearRateLimit(userId);
      const token = createSessionToken(user.id, role);

      const response = NextResponse.json({
        success: true,
        isNewPin: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          householdId: user.memberships[0]?.householdId,
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
    }

    // 3. Verify PIN cryptographically (timing-safe)
    const isPinValid = verifyPin(cleanPin, user.pin);
    if (!isPinValid) {
      const failed = recordFailedAttempt(userId);
      if (failed.locked) {
        return NextResponse.json(
          {
            error: `৫ বার ভুল পিন দেওয়ায় অ্যাকাউন্টটি ${failed.retryAfterMinutes} মিনিটের জন্য লক করা হয়েছে।`,
            locked: true,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: `ভুল পিন নম্বর! আর ${failed.remainingAttempts} বার চেষ্টা করা যাবে।`,
          remainingAttempts: failed.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 4. Success: Clear rate limit record
    clearRateLimit(userId);

    // 5. Automatic transparent PIN migration: If user had legacy plaintext PIN, hash it now!
    if (needsRehash(user.pin)) {
      await prisma.user.update({
        where: { id: userId },
        data: { pin: hashPin(cleanPin) },
      });
    }

    // 6. Issue signed session token & HttpOnly cookie
    const token = createSessionToken(user.id, role);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        householdId: user.memberships[0]?.householdId,
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
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
