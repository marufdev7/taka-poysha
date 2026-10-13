import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, name, type, balance } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'ওয়ালেটের নাম আবশ্যক' }, { status: 400 });
    }

    const effectiveUserId = userId || auth.userId;

    const account = await prisma.account.create({
      data: {
        userId: effectiveUserId,
        name: name.trim(),
        type: type || 'CASH',
        balance: parseFloat(balance) || 0,
      },
    });

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, type, balance } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const existing = await prisma.account.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify ownership
    const isOwner = existing.userId === auth.userId;
    const isSameHousehold = auth.householdId && existing.user.memberships.some((m) => m.householdId === auth.householdId);

    if (!isOwner && !isSameHousehold) {
      return NextResponse.json({ error: 'এই ওয়ালেট পরিবর্তনের অনুমতি নেই' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (type) updateData.type = type;
    if (balance !== undefined && balance !== '') updateData.balance = parseFloat(balance);

    const updated = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const existing = await prisma.account.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const isOwner = existing.userId === auth.userId;
    const isSameHousehold = auth.householdId && existing.user.memberships.some((m) => m.householdId === auth.householdId);

    if (!isOwner && !isSameHousehold) {
      return NextResponse.json({ error: 'এই ওয়ালেট মুছে ফেলার অনুমতি নেই' }, { status: 403 });
    }

    // Delete account (cascade deletes associated transactions in Prisma)
    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ওয়ালেট সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
