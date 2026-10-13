import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateSafe } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।' }, { status: 401 });
    }

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

    const effectiveUserId = userId || auth.userId;
    const effectiveHouseholdId = householdId || auth.householdId;

    if (!effectiveHouseholdId) {
      return NextResponse.json({ error: 'পারিবারিক অ্যাকাউন্ট পাওয়া যায়নি' }, { status: 400 });
    }

    // Run transaction and account balance updates atomically
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: effectiveUserId,
          householdId: effectiveHouseholdId,
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
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

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

    // Verify ownership: must belong to user or same household
    if (existing.userId !== auth.userId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'এই লেনদেন মুছে ফেলার অনুমতি নেই' }, { status: 403 });
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

      // Delete transaction
      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted and balance adjusted' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      userId,
      accountId,
      toAccountId,
      categoryId,
      type, // 'INCOME', 'EXPENSE', 'TRANSFER'
      amount,
      date,
      note,
      visibility, // 'FAMILY', 'PRIVATE'
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'সঠিক টাকার পরিমাণ দিন' }, { status: 400 });
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify ownership
    if (existing.userId !== auth.userId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'এই লেনদেন এডিট করার অনুমতি নেই' }, { status: 403 });
    }

    // Atomic transaction: Revert old balances, apply new balances, update transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Revert previous account balance adjustments
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

      // 2. Apply new account balance adjustments
      const targetAccountId = accountId || existing.accountId;
      const targetToAccountId = type === 'TRANSFER' ? (toAccountId || null) : null;

      if (type === 'INCOME') {
        await tx.account.update({
          where: { id: targetAccountId },
          data: { balance: { increment: parsedAmount } },
        });
      } else if (type === 'EXPENSE') {
        await tx.account.update({
          where: { id: targetAccountId },
          data: { balance: { decrement: parsedAmount } },
        });
      } else if (type === 'TRANSFER' && targetToAccountId) {
        await tx.account.update({
          where: { id: targetAccountId },
          data: { balance: { decrement: parsedAmount } },
        });
        await tx.account.update({
          where: { id: targetToAccountId },
          data: { balance: { increment: parsedAmount } },
        });
      }

      // 3. Update the transaction record
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          userId: userId || existing.userId,
          accountId: targetAccountId,
          toAccountId: targetToAccountId,
          categoryId: type === 'TRANSFER' ? null : (categoryId !== undefined ? categoryId : existing.categoryId),
          type,
          amount: parsedAmount,
          date: date ? parseDateSafe(date) : existing.date,
          note: note !== undefined ? note : existing.note,
          visibility: visibility || existing.visibility,
        },
        include: {
          user: true,
          account: true,
          toAccount: true,
          category: true,
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
