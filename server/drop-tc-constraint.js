import prisma from './src/config/db.js';

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_tc_no_check;');
  console.log('SUCCESS: employees_tc_no_check constraint dropped');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
