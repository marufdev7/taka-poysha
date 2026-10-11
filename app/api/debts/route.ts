import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateSafe } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const householdId = searchParams.get('householdId');

    const where: any = {};
    if (userId) where.userId = userId;
    else if (householdId) where.householdId = householdId;

    const debts = await prisma.debt.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(debts);
  } catch (error: any) {
    console.error('Error fetching debts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, householdId, personName, type, amount, dueDate, note } = body;

    if (!userId || !personName || !type || !amount || !dueDate) {
      return NextResponse.json({ error: 'সকল তথ্য সঠিকভাবে পূরণ করুন' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'টাকার পরিমাণ সঠিক দিন' }, { status: 400 });
    }

    const debt = await prisma.debt.create({
      data: {
        userId,
        householdId,
        personName: personName.trim(),
        type, // 'RECEIVABLE' (পাওনা) or 'PAYABLE' (দেনা)
        amount: parsedAmount,
        dueDate: parseDateSafe(dueDate),
        note: note ? note.trim() : null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(debt);
  } catch (error: any) {
    console.error('Error creating debt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, amount, dueDate, note, accountId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Debt ID is required' }, { status: 400 });
    }

    const existingDebt = await prisma.debt.findUnique({
      where: { id },
    });

    if (!existingDebt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If status is transitioning from PENDING to SETTLED
      if (status === 'SETTLED' && existingDebt.status !== 'SETTLED') {
        let targetAccount = null;
        if (accountId) {
          targetAccount = await tx.account.findUnique({ where: { id: accountId } });
        }
        if (!targetAccount) {
          targetAccount = await tx.account.findFirst({
            where: { userId: existingDebt.userId },
          });
        }

        let effectiveHouseholdId = existingDebt.householdId || '';
        if (!effectiveHouseholdId) {
          const member = await tx.householdMember.findFirst({
            where: { userId: existingDebt.userId },
          });
          if (member) {
            effectiveHouseholdId = member.householdId;
          } else {
            const h = await tx.household.findFirst();
            effectiveHouseholdId = h?.id || '';
          }
        }

        if (targetAccount && effectiveHouseholdId) {
          if (existingDebt.type === 'PAYABLE') {
            // দেনা পরিশোধ: ওয়ালেট ব্যালেন্স থেকে মাইনাস (decrement)
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { decrement: existingDebt.amount } },
            });

            // Find or create 'অন্যান্য খরচ' category
            let expenseCategory = await tx.category.findFirst({
              where: {
                householdId: effectiveHouseholdId,
                type: 'EXPENSE',
                name: { contains: 'অন্যান্য' },
              },
            });
            if (!expenseCategory) {
              expenseCategory = await tx.category.findFirst({
                where: { householdId: effectiveHouseholdId, type: 'EXPENSE' },
              });
            }

            // Create EXPENSE transaction log
            await tx.transaction.create({
              data: {
                userId: existingDebt.userId,
                householdId: effectiveHouseholdId,
                accountId: targetAccount.id,
                categoryId: expenseCategory?.id || undefined,
                type: 'EXPENSE',
                amount: existingDebt.amount,
                date: new Date(),
                note: `ধার পরিশোধ (${existingDebt.personName})`,
                visibility: 'FAMILY',
              },
            });
          } else if (existingDebt.type === 'RECEIVABLE') {
            // পাওনা টাকা আদায়: ওয়ালেট ব্যালেন্সে যোগ (increment)
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: existingDebt.amount } },
            });

            // Find or create 'অন্যান্য আয়' category
            let incomeCategory = await tx.category.findFirst({
              where: {
                householdId: effectiveHouseholdId,
                type: 'INCOME',
                name: { contains: 'অন্যান্য' },
              },
            });
            if (!incomeCategory) {
              incomeCategory = await tx.category.findFirst({
                where: { householdId: effectiveHouseholdId, type: 'INCOME' },
              });
            }

            // Create INCOME transaction log
            await tx.transaction.create({
              data: {
                userId: existingDebt.userId,
                householdId: effectiveHouseholdId,
                accountId: targetAccount.id,
                categoryId: incomeCategory?.id || undefined,
                type: 'INCOME',
                amount: existingDebt.amount,
                date: new Date(),
                note: `পাওনা টাকা গ্রহণ (${existingDebt.personName})`,
                visibility: 'FAMILY',
              },
            });
          }
        }
      } else if (status === 'PENDING' && existingDebt.status === 'SETTLED') {
        // If un-settling, revert balance
        let targetAccount = null;
        if (accountId) {
          targetAccount = await tx.account.findUnique({ where: { id: accountId } });
        }
        if (!targetAccount) {
          targetAccount = await tx.account.findFirst({
            where: { userId: existingDebt.userId },
          });
        }

        if (targetAccount) {
          if (existingDebt.type === 'PAYABLE') {
            // Revert deduction -> add back
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: existingDebt.amount } },
            });
          } else if (existingDebt.type === 'RECEIVABLE') {
            // Revert increment -> subtract
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { decrement: existingDebt.amount } },
            });
          }
        }
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (amount) updateData.amount = parseFloat(amount);
      if (dueDate) updateData.dueDate = parseDateSafe(dueDate);
      if (note !== undefined) updateData.note = note;

      return await tx.debt.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating debt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Debt ID is required' }, { status: 400 });
    }

    await prisma.debt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting debt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
