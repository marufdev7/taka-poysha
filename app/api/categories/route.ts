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
    const { householdId, name, type, icon, color } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'নাম এবং টাইপ আবশ্যক' }, { status: 400 });
    }

    const targetHouseholdId = householdId || auth.householdId;

    const category = await prisma.category.create({
      data: {
        householdId: targetHouseholdId,
        name: name.trim(),
        type,
        icon: icon || (type === 'INCOME' ? 'TrendingUp' : 'Tag'),
        color: color || (type === 'INCOME' ? '#10b981' : '#ef4444'),
      },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
