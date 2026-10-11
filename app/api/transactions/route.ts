import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateSafe } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      householdId,
      accountId,
      toAccountId,
      categoryId,
      type, // 'INCOME', 'EXPENSE', 'TRANSFER'
      amount,
      date,
      note,
      visibility, // 'FAMILY', 'PRIVATE'
    } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'সঠিক টাকার পরিমাণ দিন' }, { status: 400 });
    }

    // Run transaction and account balance updates atomically
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          householdId,
          accountId,
          toAccountId: type === 'TRANSFER' ? toAccountId : null,
          categoryId: type === 'TRANSFER' ? null : categoryId,
          type,
          amount: parsedAmount,
          date: date ? parseDateSafe(date) : new Date(),
          note,
          visibility: visibility || 'FAMILY',
        },
        include: {
          user: true,
          account: true,
          toAccount: true,
          category: true,
        },
      });

      // Update account balances
      if (type === 'INCOME') {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: parsedAmount } },
        });
      } else if (type === 'EXPENSE') {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: parsedAmount } },
        });
      } else if (type === 'TRANSFER' && toAccountId) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: parsedAmount } },
        });
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: parsedAmount } },
        });
      }

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Revert account balances
      if (existing.type === 'INCOME') {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: existing.amount } },
        });
      } else if (existing.type === 'EXPENSE') {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        });
      } else if (existing.type === 'TRANSFER' && existing.toAccountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        });
        await tx.account.update({
          where: { id: existing.toAccountId },
          data: { balance: { decrement: existing.amount } },
        });
      }

      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
