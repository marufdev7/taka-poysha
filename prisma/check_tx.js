const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const txs = await prisma.transaction.findMany({
    include: { user: true, account: true, category: true },
  });
  console.log(`Found ${txs.length} transactions in database:`);
  console.log(JSON.stringify(txs, null, 2));

  const users = await prisma.user.findMany();
  console.log('Users in DB:', users);

  const households = await prisma.household.findMany({
    include: { members: true },
  });
  console.log('Households in DB:', JSON.stringify(households, null, 2));
}

check().finally(() => prisma.$disconnect());
