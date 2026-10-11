const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${users.length} users in database.`);

  if (users.length > 1) {
    const primaryUser = users[0];
    const duplicateUserIds = users.slice(1).map((u) => u.id);

    console.log(`Keeping primary user: "${primaryUser.name}" (${primaryUser.id})`);
    console.log(`Deleting ${duplicateUserIds.length} duplicate users...`);

    // Clean relations
    await prisma.transaction.deleteMany({ where: { userId: { in: duplicateUserIds } } });
    await prisma.debt.deleteMany({ where: { userId: { in: duplicateUserIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: duplicateUserIds } } });
    await prisma.householdMember.deleteMany({ where: { userId: { in: duplicateUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: duplicateUserIds } } });

    console.log('✅ Successfully cleaned duplicate user accounts!');
  }
}

cleanDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
