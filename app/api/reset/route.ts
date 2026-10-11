import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Delete all transactions, budgets, ai reports
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.aiReport.deleteMany();

    // Reset account balances to 0
    await prisma.account.updateMany({
      data: {
        balance: 0,
      },
    });

    return NextResponse.json({ success: true, message: 'সকল লেনদেন ও হিসাব সফলভাবে রিসেট করা হয়েছে।' });
  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
