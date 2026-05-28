const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('2125', 10);
  await prisma.user.update({
    where: { email: '98906933n@gmail.com' },
    data: { 
      password: adminHash,
      status: 'active',
      role: 'admin'
    }
  });
  console.log('Admin password reset to: 2125');

  const nizarHash = await bcrypt.hash('2125', 10);
  await prisma.user.update({
    where: { email: 'nizar@test.com' },
    data: { 
      password: nizarHash,
      status: 'active'
    }
  });
  console.log('Nizar password reset to: 2125');

  const users = await prisma.user.findMany();
  console.log('All users after reset:');
  users.forEach(u => {
    console.log('  - Name:', u.name, '| Email:', u.email, '| Role:', u.role, '| Status:', u.status);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
