const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeAll() {
  console.log('🗑️ Completely removing all demo data, users (Rakib, Sadia), and households...');

  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.aiReport.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ All demo users and data wiped completely. The system is 100% empty and ready for manual setup!');
}

wipeAll()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
