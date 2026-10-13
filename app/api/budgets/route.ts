import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const body = await request.json();
    const { householdId, categoryId, month, limitAmount } = body;

    const targetHouseholdId = householdId || auth.householdId;
    if (!targetHouseholdId || !categoryId || !month) {
      return NextResponse.json({ error: 'সকল তথ্য আবশ্যক' }, { status: 400 });
    }

    const budget = await prisma.budget.upsert({
      where: {
        householdId_categoryId_month: {
          householdId: targetHouseholdId,
          categoryId,
          month,
        },
      },
      update: {
        limitAmount: parseFloat(limitAmount),
      },
      create: {
        householdId: targetHouseholdId,
        categoryId,
        month,
        limitAmount: parseFloat(limitAmount),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    console.error('Error creating budget:', error);
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
      return NextResponse.json({ error: 'বাজেট আইডি আবশ্যক' }, { status: 400 });
    }

    const existing = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'বাজেট পাওয়া যায়নি' }, { status: 404 });
    }

    if (existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'এই বাজেট মুছে ফেলার অনুমতি নেই' }, { status: 403 });
    }

    await prisma.budget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting budget:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
