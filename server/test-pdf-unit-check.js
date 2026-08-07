import { PrismaClient } from '@prisma/client';
import { generateReturnPdf, generateAssignmentPdf } from './src/modules/documents/document.service.js';

const prisma = new PrismaClient();

async function checkPdfUnitText() {
  console.log('=== TESTING PDF UNIT TEXT GENERATION ===');

  const lastReturn = await prisma.return.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!lastReturn) {
    console.error('No return record found');
    return;
  }

  const pdfPath = await generateReturnPdf(lastReturn.id);
  console.log('Generated Return PDF Path:', pdfPath);

  const lastAssignment = await prisma.assignment.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (lastAssignment) {
    const assignPdfPath = await generateAssignmentPdf(lastAssignment.id);
    console.log('Generated Assignment PDF Path:', assignPdfPath);
  }

  console.log('=== PDF UNIT TEXT GENERATION SUCCESS ===');
  await prisma.$disconnect();
}

checkPdfUnitText();
