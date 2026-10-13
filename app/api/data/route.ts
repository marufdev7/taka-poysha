import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // 1. Fetch all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // If completely new instance (zero users), allow onboarding
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
        debts: [],
        aiReports: [],
      });
    }

    // 2. Authenticate the request using cryptographic session token or HttpOnly cookie
    const auth = await getAuthenticatedUser(request);

    if (!auth) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'অননুমোদিত অনুরোধ। অনুগ্রহ করে পিন দিয়ে লগইন করুন।',
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

    // 3. Resolve active current user
    const targetUserId = requestedUserId || auth.userId;
    const currentUser = users.find((u) => u.id === targetUserId) || auth.user;

    // 4. Fetch household for this user
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

    // Authorization check: If requesting another user's view, verify they belong to the same household!
    if (household && auth.householdId && household.id !== auth.householdId) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'অননুমোদিত পারিবারিক অ্যাক্সেস',
        },
        { status: 403 }
      );
    }

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
        account: {
          include: { user: true },
        },
        toAccount: {
          include: { user: true },
        },
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
