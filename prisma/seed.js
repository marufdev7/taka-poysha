const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with Bangladeshi family finance data...');

  // 1. Clean existing records if any
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.aiReport.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const rakib = await prisma.user.create({
    data: {
      name: 'রাকিব হাসান',
      email: 'rakib@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
  });

  const sadia = await prisma.user.create({
    data: {
      name: 'সাদিয়া আক্তার',
      email: 'sadia@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    },
  });

  // 3. Create Household
  const household = await prisma.household.create({
    data: {
      name: 'হাসান পরিবার',
      currency: 'BDT',
      inviteCode: 'HASAN-2026',
    },
  });

  // 4. Link Members to Household
  await prisma.householdMember.createMany({
    data: [
      {
        householdId: household.id,
        userId: rakib.id,
        role: 'ADMIN',
      },
      {
        householdId: household.id,
        userId: sadia.id,
        role: 'MEMBER',
      },
    ],
  });

  // 5. Create Accounts (Wallets)
  const rakibCash = await prisma.account.create({
    data: { userId: rakib.id, name: 'ক্যাশ টাকা', type: 'CASH', balance: 18500 },
  });
  const rakibBkash = await prisma.account.create({
    data: { userId: rakib.id, name: 'bKash (রাকিব)', type: 'BKASH', balance: 24200 },
  });
  const rakibBank = await prisma.account.create({
    data: { userId: rakib.id, name: 'ব্র্যাক ব্যাংক', type: 'BANK', balance: 145000 },
  });

  const sadiaCash = await prisma.account.create({
    data: { userId: sadia.id, name: 'ক্যাশ (সাদিয়া)', type: 'CASH', balance: 6500 },
  });
  const sadiaBkash = await prisma.account.create({
    data: { userId: sadia.id, name: 'bKash (সাদিয়া)', type: 'BKASH', balance: 14000 },
  });

  // 6. Create Standard Categories
  const catIncomeSalary = await prisma.category.create({
    data: { householdId: household.id, name: 'বেতন (Salary)', type: 'INCOME', icon: 'Briefcase', color: '#10b981' },
  });
  const catIncomeFreelance = await prisma.category.create({
    data: { householdId: household.id, name: 'ফ্রিল্যান্সিং', type: 'INCOME', icon: 'Laptop', color: '#06b6d4' },
  });
  const catIncomeBusiness = await prisma.category.create({
    data: { householdId: household.id, name: 'ব্যবসা ও লাভ', type: 'INCOME', icon: 'TrendingUp', color: '#8b5cf6' },
  });

  const catExpRent = await prisma.category.create({
    data: { householdId: household.id, name: 'বাসা ভাড়া', type: 'EXPENSE', icon: 'Home', color: '#f59e0b' },
  });
  const catExpBazaar = await prisma.category.create({
    data: { householdId: household.id, name: 'বাজার ও কাঁচামাল', type: 'EXPENSE', icon: 'ShoppingCart', color: '#ef4444' },
  });
  const catExpBills = await prisma.category.create({
    data: { householdId: household.id, name: 'বিদ্যুৎ ও গ্যাস বিল', type: 'EXPENSE', icon: 'Zap', color: '#ec4899' },
  });
  const catExpTransport = await prisma.category.create({
    data: { householdId: household.id, name: 'যাতায়াত ও ভাড়া', type: 'EXPENSE', icon: 'Car', color: '#6366f1' },
  });
  const catExpHealth = await prisma.category.create({
    data: { householdId: household.id, name: 'চিকিৎসা ও ওষুধ', type: 'EXPENSE', icon: 'HeartPulse', color: '#14b8a6' },
  });
  const catExpDining = await prisma.category.create({
    data: { householdId: household.id, name: 'বাইরে খাওয়া ও নাশতা', type: 'EXPENSE', icon: 'Coffee', color: '#d97706' },
  });

  // 7. Seed Transactions for Current Month (October 2026) & Previous Month (September 2026)
  const currentMonthDate = (day) => new Date(2026, 9, day, 12, 0, 0); // October (month 9 index)
  const prevMonthDate = (day) => new Date(2026, 8, day, 12, 0, 0); // September (month 8 index)

  // Previous Month transactions for growth comparison
  await prisma.transaction.createMany({
    data: [
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBank.id,
        categoryId: catIncomeSalary.id,
        type: 'INCOME',
        amount: 80000,
        date: prevMonthDate(1),
        note: 'সেপ্টেম্বরের মূল বেতন',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBank.id,
        categoryId: catExpRent.id,
        type: 'EXPENSE',
        amount: 18000,
        date: prevMonthDate(3),
        note: 'সেপ্টেম্বর বাসা ভাড়া',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibCash.id,
        categoryId: catExpBazaar.id,
        type: 'EXPENSE',
        amount: 19500,
        date: prevMonthDate(10),
        note: 'মাসিক মুদি ও বাজার',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBkash.id,
        categoryId: catExpBills.id,
        type: 'EXPENSE',
        amount: 4500,
        date: prevMonthDate(12),
        note: 'বিদ্যুৎ ও ওয়াইফাই বিল',
        visibility: 'FAMILY',
      },
    ],
  });

  // Current Month (October 2026)
  await prisma.transaction.createMany({
    data: [
      // Rakib's Salary
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBank.id,
        categoryId: catIncomeSalary.id,
        type: 'INCOME',
        amount: 85000,
        date: currentMonthDate(1),
        note: 'অক্টোবর মাসের বেতন',
        visibility: 'FAMILY',
      },
      // Sadia's Freelancing Income
      {
        userId: sadia.id,
        householdId: household.id,
        accountId: sadiaBkash.id,
        categoryId: catIncomeFreelance.id,
        type: 'INCOME',
        amount: 25000,
        date: currentMonthDate(4),
        note: 'ইউআই ডিজাইন ক্লায়েন্ট প্রজেক্ট পেমেন্ট',
        visibility: 'FAMILY',
      },
      // Rakib's Private Freelance Income
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBkash.id,
        categoryId: catIncomeFreelance.id,
        type: 'INCOME',
        amount: 12000,
        date: currentMonthDate(6),
        note: 'সাইড প্রজেক্ট কনসাল্টিং (ব্যক্তিগত)',
        visibility: 'PRIVATE',
      },
      // Shared Family Expenses
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBank.id,
        categoryId: catExpRent.id,
        type: 'EXPENSE',
        amount: 18000,
        date: currentMonthDate(2),
        note: 'অক্টোবরের বাসা ভাড়া ও সার্ভিস চার্জ',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibCash.id,
        categoryId: catExpBazaar.id,
        type: 'EXPENSE',
        amount: 14200,
        date: currentMonthDate(5),
        note: 'সাপ্তাহিক কাঁচাবাজার ও মাছ-মাংস',
        visibility: 'FAMILY',
      },
      {
        userId: sadia.id,
        householdId: household.id,
        accountId: sadiaCash.id,
        categoryId: catExpBazaar.id,
        type: 'EXPENSE',
        amount: 3800,
        date: currentMonthDate(7),
        note: 'মসলা ও দৈনন্দিন মুদিপণ্য',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibBkash.id,
        categoryId: catExpBills.id,
        type: 'EXPENSE',
        amount: 3450,
        date: currentMonthDate(4),
        note: 'ডেসকো প্রিপেইড বিদ্যুৎ রিচার্জ',
        visibility: 'FAMILY',
      },
      {
        userId: sadia.id,
        householdId: household.id,
        accountId: sadiaBkash.id,
        categoryId: catExpHealth.id,
        type: 'EXPENSE',
        amount: 4200,
        date: currentMonthDate(6),
        note: 'মায়ের প্রেসারের ওষুধ ও চেকআপ',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibCash.id,
        categoryId: catExpTransport.id,
        type: 'EXPENSE',
        amount: 2150,
        date: currentMonthDate(7),
        note: 'মেট্রোরেল ও সিএনজি ভাড়া',
        visibility: 'FAMILY',
      },
      {
        userId: rakib.id,
        householdId: household.id,
        accountId: rakibCash.id,
        categoryId: catExpDining.id,
        type: 'EXPENSE',
        amount: 1600,
        date: currentMonthDate(8),
        note: 'উইকেন্ডে পরিবারের সাথে রেস্তোরাঁয় ডিনার',
        visibility: 'FAMILY',
      },
    ],
  });

  // 8. Set Budgets for October 2026
  await prisma.budget.createMany({
    data: [
      { householdId: household.id, categoryId: catExpRent.id, month: '2026-10', limitAmount: 18000 },
      { householdId: household.id, categoryId: catExpBazaar.id, month: '2026-10', limitAmount: 25000 },
      { householdId: household.id, categoryId: catExpBills.id, month: '2026-10', limitAmount: 6000 },
      { householdId: household.id, categoryId: catExpDining.id, month: '2026-10', limitAmount: 4000 },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
