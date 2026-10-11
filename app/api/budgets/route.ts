import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { householdId, categoryId, month, limitAmount } = body;

    if (!householdId || !categoryId || !month) {
      return NextResponse.json({ error: 'সকল তথ্য আবশ্যক' }, { status: 400 });
    }

    const budget = await prisma.budget.upsert({
      where: {
        householdId_categoryId_month: {
          householdId,
          categoryId,
          month,
        },
      },
      update: {
        limitAmount: parseFloat(limitAmount),
      },
      create: {
        householdId,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'বাজেট আইডি আবশ্যক' }, { status: 400 });
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
