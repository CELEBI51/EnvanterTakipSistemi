import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDepartmentReport() {
  try {
    const totalEmployeesResult = await prisma.$queryRaw`SELECT COUNT(*)::int as total FROM employees;`;
    const totalEmployees = totalEmployeesResult[0]?.total || 0;

    const departmentGroups = await prisma.$queryRaw`
      SELECT department, COUNT(*)::int as count 
      FROM employees 
      GROUP BY department 
      ORDER BY count DESC;
    `;

    const nullOrEmptyResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM employees 
      WHERE department IS NULL OR department = '';
    `;
    const nullOrEmptyCount = nullOrEmptyResult[0]?.count || 0;

    console.log('=== EMPLOYEES DEPARTMENT REPORT ===');
    console.log(`Total Employees Count: ${totalEmployees}`);
    console.log(`Null or Empty ('') Department Count: ${nullOrEmptyCount}\n`);

    console.log('Department Name | Employee Count');
    console.log('--------------------------------');
    for (const group of departmentGroups) {
      console.log(`"${group.department}" | ${group.count}`);
    }
  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateDepartmentReport();
