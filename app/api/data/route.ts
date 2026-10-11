import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // Fetch all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      return NextResponse.json({
        isNewUser: true,
        currentUser: null,
        users: [],
        household: null,
        accounts: [],
        categories: [],
        budgets: [],
        transactions: [],
        aiReports: [],
      });
    }

    if (!requestedUserId) {
      return NextResponse.json({
        authenticated: false,
        currentUser: null,
        users: [],
        household: null,
        accounts: [],
        categories: [],
        budgets: [],
        transactions: [],
        debts: [],
        aiReports: [],
      });
    }

    const currentUser = users.find((u) => u.id === requestedUserId);
    if (!currentUser) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি বা সেশন সমাপ্ত হয়েছে',
          currentUser: null,
          users: [],
          household: null,
          accounts: [],
          categories: [],
          budgets: [],
          transactions: [],
          debts: [],
          aiReports: [],
        },
        { status: 401 }
      );
    }

    // Fetch household for this user
    const membership = await prisma.householdMember.findFirst({
      where: { userId: currentUser.id },
      include: {
        household: {
          include: {
            members: {
              include: { user: true },
            },
            categories: true,
            budgets: {
              include: { category: true },
            },
            aiReports: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const household = membership?.household;

    // Fetch accounts
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { userId: currentUser.id },
          ...(household ? [{ user: { memberships: { some: { householdId: household.id } } } }] : []),
        ],
      },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where: household ? { householdId: household.id } : { userId: currentUser.id },
      include: {
        user: true,
        account: true,
        toAccount: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    });

    // Fetch debts
    const debts = await prisma.debt.findMany({
      where: {
        OR: [
          { userId: currentUser.id },
          ...(household ? [{ householdId: household.id }] : []),
        ],
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({
      authenticated: true,
      currentUser,
      users,
      household,
      accounts,
      categories: household?.categories || [],
      budgets: household?.budgets || [],
      transactions,
      debts,
      aiReports: household?.aiReports || [],
    });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
