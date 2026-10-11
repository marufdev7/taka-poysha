const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetClean() {
  console.log('🧹 Clearing all mock data for manual entry...');

  // 1. Delete all transactions, budgets, ai reports
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.aiReport.deleteMany();

  // 2. Reset account balances to 0 or delete mock accounts
  await prisma.account.deleteMany();

  // 3. Keep or clean categories
  // Let's create an active clean user profile if user wants
  const user = await prisma.user.findFirst();
  if (user) {
    // Create basic empty wallets for the user with 0 balance
    await prisma.account.createMany({
      data: [
        { userId: user.id, name: 'ক্যাশ টাকা', type: 'CASH', balance: 0 },
        { userId: user.id, name: 'bKash', type: 'BKASH', balance: 0 },
        { userId: user.id, name: 'ব্যাংক একাউন্ট', type: 'BANK', balance: 0 },
      ],
    });
  }

  console.log('✨ Database is now clean with 0 transactions and 0 balance! Ready for manual entry.');
}

resetClean()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
