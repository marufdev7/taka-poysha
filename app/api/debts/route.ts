import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateSafe } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const householdId = searchParams.get('householdId') || auth.householdId;

    const where: any = {};
    if (userId) where.userId = userId;
    else if (householdId) where.householdId = householdId;
    else where.userId = auth.userId;

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
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, householdId, personName, type, amount, dueDate, note } = body;

    if (!personName || !type || !amount || !dueDate) {
      return NextResponse.json({ error: 'সকল তথ্য সঠিকভাবে পূরণ করুন' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'টাকার পরিমাণ সঠিক দিন' }, { status: 400 });
    }

    const effectiveUserId = userId || auth.userId;
    const effectiveHouseholdId = householdId || auth.householdId;

    const debt = await prisma.debt.create({
      data: {
        userId: effectiveUserId,
        householdId: effectiveHouseholdId,
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
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

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

    // Verify ownership
    if (existingDebt.userId !== auth.userId && existingDebt.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'এই দেনা-পাওনা পরিবর্তনের অনুমতি নেই' }, { status: 403 });
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
            const anyHousehold = await tx.household.findFirst();
            if (anyHousehold) effectiveHouseholdId = anyHousehold.id;
          }
        }

        if (targetAccount) {
          let category = await tx.category.findFirst({
            where: {
              name: existingDebt.type === 'PAYABLE' ? 'দেনা পরিশোধ' : 'পাওনা আদায়',
            },
          });

          if (!category && effectiveHouseholdId) {
            category = await tx.category.create({
              data: {
                householdId: effectiveHouseholdId,
                name: existingDebt.type === 'PAYABLE' ? 'দেনা পরিশোধ' : 'পাওনা আদায়',
                type: existingDebt.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME',
                color: existingDebt.type === 'PAYABLE' ? '#ef4444' : '#10b981',
              },
            });
          }

          if (existingDebt.type === 'PAYABLE') {
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { decrement: existingDebt.amount } },
            });

            if (effectiveHouseholdId) {
              await tx.transaction.create({
                data: {
                  userId: existingDebt.userId,
                  householdId: effectiveHouseholdId,
                  accountId: targetAccount.id,
                  categoryId: category ? category.id : null,
                  type: 'EXPENSE',
                  amount: existingDebt.amount,
                  date: new Date(),
                  note: `দেনা পরিশোধ: ${existingDebt.personName} (${existingDebt.note || 'সম্পূর্ণ পরিশোধ'})`,
                  visibility: 'FAMILY',
                },
              });
            }
          } else if (existingDebt.type === 'RECEIVABLE') {
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: existingDebt.amount } },
            });

            if (effectiveHouseholdId) {
              await tx.transaction.create({
                data: {
                  userId: existingDebt.userId,
                  householdId: effectiveHouseholdId,
                  accountId: targetAccount.id,
                  categoryId: category ? category.id : null,
                  type: 'INCOME',
                  amount: existingDebt.amount,
                  date: new Date(),
                  note: `পাওনা আদায়: ${existingDebt.personName} (${existingDebt.note || 'সম্পূর্ণ আদায়'})`,
                  visibility: 'FAMILY',
                },
              });
            }
          }
        }
      } else if (status === 'PENDING' && existingDebt.status === 'SETTLED') {
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
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: existingDebt.amount } },
            });
          } else if (existingDebt.type === 'RECEIVABLE') {
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
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Debt ID is required' }, { status: 400 });
    }

    const existingDebt = await prisma.debt.findUnique({
      where: { id },
    });

    if (!existingDebt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    if (existingDebt.userId !== auth.userId && existingDebt.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'এই দেনা-পাওনা মুছে ফেলার অনুমতি নেই' }, { status: 403 });
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
