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
      include: {
        account: true,
      },
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
    const { userId, householdId, accountId, personName, type, amount, dueDate, note } = body;

    if (!personName || !type || !amount || !dueDate) {
      return NextResponse.json({ error: 'সকল তথ্য সঠিকভাবে পূরণ করুন' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'টাকার পরিমাণ সঠিক দিন' }, { status: 400 });
    }

    const effectiveUserId = userId || auth.userId;
    const effectiveHouseholdId = householdId || auth.householdId;

    const result = await prisma.$transaction(async (tx) => {
      // Find target account (specified accountId or user's first account)
      let targetAccount = null;
      if (accountId) {
        targetAccount = await tx.account.findUnique({ where: { id: accountId } });
      }
      if (!targetAccount) {
        targetAccount = await tx.account.findFirst({
          where: { userId: effectiveUserId },
        });
      }

      if (!targetAccount) {
        throw new Error('কোনো ওয়ালেট বা একাউন্ট পাওয়া যায়নি');
      }

      // 1. Create the Debt record
      const debt = await tx.debt.create({
        data: {
          userId: effectiveUserId,
          householdId: effectiveHouseholdId,
          accountId: targetAccount.id,
          personName: personName.trim(),
          type, // 'RECEIVABLE' (পাওনা - ধার দেওয়া হয়েছে) | 'PAYABLE' (দেনা - ধার নেওয়া হয়েছে)
          amount: parsedAmount,
          dueDate: parseDateSafe(dueDate),
          note: note ? note.trim() : null,
          status: 'PENDING',
        },
        include: {
          account: true,
        },
      });

      // 2. Adjust wallet balance and create Transaction record
      if (type === 'RECEIVABLE') {
        // User lent money to someone -> Wallet balance DECREASES immediately!
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: { decrement: parsedAmount } },
        });

        // Find or create 'ধার প্রদান' category
        let category = await tx.category.findFirst({
          where: {
            name: 'ধার প্রদান',
            householdId: effectiveHouseholdId || undefined,
          },
        });
        if (!category && effectiveHouseholdId) {
          category = await tx.category.create({
            data: {
              householdId: effectiveHouseholdId,
              name: 'ধার প্রদান',
              type: 'EXPENSE',
              color: '#f59e0b',
            },
          });
        }

        if (effectiveHouseholdId) {
          await tx.transaction.create({
            data: {
              userId: effectiveUserId,
              householdId: effectiveHouseholdId,
              accountId: targetAccount.id,
              categoryId: category ? category.id : null,
              type: 'EXPENSE',
              amount: parsedAmount,
              date: new Date(),
              note: `ধার প্রদান: ${personName.trim()}${note ? ` (${note.trim()})` : ''}`,
              visibility: 'FAMILY',
            },
          });
        }
      } else if (type === 'PAYABLE') {
        // User borrowed money -> Wallet balance INCREASES immediately!
        await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: { increment: parsedAmount } },
        });

        // Find or create 'ধার গ্রহণ' category
        let category = await tx.category.findFirst({
          where: {
            name: 'ধার গ্রহণ',
            householdId: effectiveHouseholdId || undefined,
          },
        });
        if (!category && effectiveHouseholdId) {
          category = await tx.category.create({
            data: {
              householdId: effectiveHouseholdId,
              name: 'ধার গ্রহণ',
              type: 'INCOME',
              color: '#06b6d4',
            },
          });
        }

        if (effectiveHouseholdId) {
          await tx.transaction.create({
            data: {
              userId: effectiveUserId,
              householdId: effectiveHouseholdId,
              accountId: targetAccount.id,
              categoryId: category ? category.id : null,
              type: 'INCOME',
              amount: parsedAmount,
              date: new Date(),
              note: `ধার গ্রহণ: ${personName.trim()}${note ? ` (${note.trim()})` : ''}`,
              visibility: 'FAMILY',
            },
          });
        }
      }

      return debt;
    });

    return NextResponse.json(result);
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
        if (!targetAccount && existingDebt.accountId) {
          targetAccount = await tx.account.findUnique({ where: { id: existingDebt.accountId } });
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
          if (existingDebt.type === 'PAYABLE') {
            // Repaying a debt -> Money leaves the wallet!
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { decrement: existingDebt.amount } },
            });

            let category = await tx.category.findFirst({
              where: {
                name: 'দেনা পরিশোধ',
                householdId: effectiveHouseholdId || undefined,
              },
            });

            if (!category && effectiveHouseholdId) {
              category = await tx.category.create({
                data: {
                  householdId: effectiveHouseholdId,
                  name: 'দেনা পরিশোধ',
                  type: 'EXPENSE',
                  color: '#ef4444',
                },
              });
            }

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
                  note: `দেনা পরিশোধ: ${existingDebt.personName}${existingDebt.note ? ` (${existingDebt.note})` : ''}`,
                  visibility: 'FAMILY',
                },
              });
            }
          } else if (existingDebt.type === 'RECEIVABLE') {
            // Receiving repayment -> Money ENTERS the wallet! Cash/wallet balance increases!
            await tx.account.update({
              where: { id: targetAccount.id },
              data: { balance: { increment: existingDebt.amount } },
            });

            let category = await tx.category.findFirst({
              where: {
                name: 'পাওনা আদায়',
                householdId: effectiveHouseholdId || undefined,
              },
            });

            if (!category && effectiveHouseholdId) {
              category = await tx.category.create({
                data: {
                  householdId: effectiveHouseholdId,
                  name: 'পাওনা আদায়',
                  type: 'INCOME',
                  color: '#10b981',
                },
              });
            }

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
                  note: `পাওনা আদায় (ধার ফেরত): ${existingDebt.personName}${existingDebt.note ? ` (${existingDebt.note})` : ''}`,
                  visibility: 'FAMILY',
                },
              });
            }
          }
        }
      } else if (status === 'PENDING' && existingDebt.status === 'SETTLED') {
        // Reverting a settlement
        let targetAccount = null;
        if (accountId) {
          targetAccount = await tx.account.findUnique({ where: { id: accountId } });
        }
        if (!targetAccount && existingDebt.accountId) {
          targetAccount = await tx.account.findUnique({ where: { id: existingDebt.accountId } });
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
        include: { account: true },
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

    await prisma.$transaction(async (tx) => {
      // If the debt was still PENDING when deleted, revert the wallet balance adjustment!
      if (existingDebt.status === 'PENDING' && existingDebt.accountId) {
        if (existingDebt.type === 'RECEIVABLE') {
          // Money was lent out; deleting the record refunds the wallet
          await tx.account.update({
            where: { id: existingDebt.accountId },
            data: { balance: { increment: existingDebt.amount } },
          });
        } else if (existingDebt.type === 'PAYABLE') {
          // Money was borrowed; deleting the record reverts that balance
          await tx.account.update({
            where: { id: existingDebt.accountId },
            data: { balance: { decrement: existingDebt.amount } },
          });
        }
      }

      await tx.debt.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting debt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
