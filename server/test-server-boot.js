import app from './src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBoot() {
  console.log('=== VERIFYING BACKEND SERVER & DATABASE MODELS ===');

  const server = app.listen(5003, () => {
    console.log(' -> Express app loaded & listening on port 5003 successfully!');
  });

  try {
    const units = await prisma.unit.findMany();
    console.log(` -> Units DB Query OK: Found ${units.length} units.`);

    const employees = await prisma.employee.findMany();
    console.log(` -> Employees DB Query OK: Found ${employees.length} employees.`);

    const assignments = await prisma.assignment.findMany();
    console.log(` -> Assignments DB Query OK: Found ${assignments.length} assignments.`);

    console.log('=== ALL SERVER & DATABASE MODEL CHECKS PASSED ===');
  } catch (err) {
    console.error('Boot verification error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

testBoot();
