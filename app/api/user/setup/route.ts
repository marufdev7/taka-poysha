import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPin } from '@/lib/authSecurity';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Prevent re-running setup if an admin or household already exists
    const existingCount = await prisma.user.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: 'সিস্টেম ইতিমধ্যে ইনিশিয়ালাইজ করা হয়েছে। নতুন মেম্বার যুক্ত হতে ইনভিটেশন কোড ব্যবহার করুন।' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, householdName, wallets, pin } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'আপনার নাম আবশ্যক' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = (email && email.trim()) || `${Date.now()}@local.app`;
    const cleanHouseholdName = (householdName && householdName.trim()) || 'আমার পরিবার';
    const cleanPin = pin && String(pin).trim().length >= 4 ? hashPin(String(pin).trim()) : null;

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        pin: cleanPin,
      },
    });

    // 2. Create Household
    const household = await prisma.household.create({
      data: {
        name: cleanHouseholdName,
        currency: 'BDT',
        inviteCode: `FAM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      },
    });

    // 3. Link User as Admin
    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        role: 'ADMIN',
      },
    });

    // 4. Create standard categories for this household
    const defaultCategories = [
      { name: 'বেতন (Salary)', type: 'INCOME', color: '#10b981' },
      { name: 'ব্যবসা ও ফ্রিল্যান্স', type: 'INCOME', color: '#06b6d4' },
      { name: 'অন্যান্য আয়', type: 'INCOME', color: '#8b5cf6' },
      { name: 'বাজার ও মুদি', type: 'EXPENSE', color: '#ef4444' },
      { name: 'বাসা ভাড়া', type: 'EXPENSE', color: '#f59e0b' },
      { name: 'বিদ্যুৎ ও ইউটিলিটি বিল', type: 'EXPENSE', color: '#ec4899' },
      { name: 'যাতায়াত ও ভাড়া', type: 'EXPENSE', color: '#6366f1' },
      { name: 'চিকিৎসা ও ওষুধ', type: 'EXPENSE', color: '#14b8a6' },
      { name: 'খাওয়া-দাওয়া ও নাশতা', type: 'EXPENSE', color: '#d97706' },
      { name: 'অন্যান্য খরচ', type: 'EXPENSE', color: '#64748b' },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map((c) => ({
        householdId: household.id,
        name: c.name,
        type: c.type,
        color: c.color,
      })),
    });

    // 5. Create initial wallets
    const walletList =
      Array.isArray(wallets) && wallets.length > 0
        ? wallets
        : [
            { name: 'ক্যাশ টাকা', type: 'CASH', balance: 0 },
            { name: 'bKash', type: 'BKASH', balance: 0 },
            { name: 'ব্যাংক একাউন্ট', type: 'BANK', balance: 0 },
          ];

    await prisma.account.createMany({
      data: walletList.map((w: any) => ({
        userId: user.id,
        name: w.name,
        type: w.type || 'CASH',
        balance: parseFloat(w.balance) || 0,
      })),
    });

    // 6. Issue initial session token & HttpOnly cookie
    const token = createSessionToken(user.id, 'ADMIN');

    const response = NextResponse.json({ success: true, token, user, household });

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
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
