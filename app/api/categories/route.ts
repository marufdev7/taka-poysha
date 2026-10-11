import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { householdId, name, type, icon, color } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'নাম এবং টাইপ আবশ্যক' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        householdId,
        name,
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
