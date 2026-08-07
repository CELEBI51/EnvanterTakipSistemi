import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runCleanup() {
  console.log('=== STEP 1: PRE-CLEANUP DATA AUDIT ===');

  const preEmployeesCount = await prisma.employee.count();
  const preAssignmentsCount = await prisma.assignment.count();
  const preReturnsCount = await prisma.return.count();
  const preStockMovementsCount = await prisma.stockMovement.count({
    where: { issuedToEmployeeId: { not: null } },
  });
  const preAttachmentsCount = await prisma.attachment.count({
    where: { entityType: { in: ['assignment', 'return'] } },
  });

  console.log(`Pre-Cleanup Employees Count: ${preEmployeesCount}`);
  console.log(`Pre-Cleanup Assignments Count: ${preAssignmentsCount}`);
  console.log(`Pre-Cleanup Returns Count: ${preReturnsCount}`);
  console.log(`Pre-Cleanup Employee StockMovements Count: ${preStockMovementsCount}`);
  console.log(`Pre-Cleanup Assignment/Return Attachments Count: ${preAttachmentsCount}\n`);

  console.log('=== STARTING TRANSACTIONAL CLEANUP & STOCK CORRECTION ===');

  let deletedPhysicalFilesCount = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Fetch all assignments with items to correct stock
    const assignments = await tx.assignment.findMany({
      include: {
        items: true,
        accessoryItems: true,
        licenseItems: true,
        consumableItems: true,
      },
    });

    for (const assignment of assignments) {
      // a) Hardware stock correction
      for (const item of assignment.items) {
        if (!item.returned) {
          const hw = await tx.hardware.findUnique({ where: { id: item.hardwareId } });
          if (hw && hw.status === 'Kullanimda') {
            await tx.hardware.update({
              where: { id: item.hardwareId },
              data: { status: 'Hazir' },
            });
            console.log(` -> Hardware ${hw.demirbasNo} status reset to 'Hazır'.`);
          }
        }
      }

      // b) Accessory stock correction
      for (const item of assignment.accessoryItems) {
        const qtyToReturn = item.quantityGiven - item.quantityReturned;
        if (qtyToReturn > 0) {
          const acc = await tx.accessory.findUnique({ where: { id: item.accessoryId } });
          if (acc) {
            const newAssigned = Math.max(0, acc.assignedQuantity - qtyToReturn);
            const newAvailable = Math.max(0, acc.totalQuantity - newAssigned - acc.outOfUseQuantity);
            await tx.accessory.update({
              where: { id: item.accessoryId },
              data: {
                assignedQuantity: newAssigned,
                availableQuantity: newAvailable,
              },
            });
            console.log(` -> Accessory ${acc.name} stock restored (+${qtyToReturn}).`);
          }
        }
      }

      // c) License stock correction
      for (const item of assignment.licenseItems) {
        const qtyToReturn = item.quantityGiven - item.quantityReturned;
        if (qtyToReturn > 0) {
          const lic = await tx.license.findUnique({ where: { id: item.licenseId } });
          if (lic) {
            const newAssigned = Math.max(0, lic.assignedQuantity - qtyToReturn);
            const newAvailable = Math.max(0, lic.totalQuantity - newAssigned);
            await tx.license.update({
              where: { id: item.licenseId },
              data: {
                assignedQuantity: newAssigned,
                availableQuantity: newAvailable,
              },
            });
            console.log(` -> License ${lic.name} stock restored (+${qtyToReturn}).`);
          }
        }
      }

      // d) Consumable stock correction (test data cleanup: restore consumed qty)
      for (const item of assignment.consumableItems) {
        const qtyToRestore = item.quantityGiven;
        if (qtyToRestore > 0) {
          const con = await tx.consumable.findUnique({ where: { id: item.consumableId } });
          if (con) {
            const newConsumed = Math.max(0, con.consumedQuantity - qtyToRestore);
            const newAvailable = Math.max(0, con.totalQuantity - newConsumed);
            await tx.consumable.update({
              where: { id: item.consumableId },
              data: {
                consumedQuantity: newConsumed,
                availableQuantity: newAvailable,
              },
            });
            console.log(` -> Consumable ${con.name} stock restored (+${qtyToRestore}).`);
          }
        }
      }
    }

    // 2. Delete StockMovements linked to employees
    await tx.stockMovement.deleteMany({
      where: { issuedToEmployeeId: { not: null } },
    });

    // 3. Find and delete attachments for assignment and return
    const attachments = await tx.attachment.findMany({
      where: { entityType: { in: ['assignment', 'return'] } },
    });

    for (const att of attachments) {
      if (att.filePath) {
        const fullPath = path.resolve(att.filePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            deletedPhysicalFilesCount++;
          } catch (e) {
            console.warn(`Could not delete file ${fullPath}:`, e.message);
          }
        }
      }
    }

    await tx.attachment.deleteMany({
      where: { entityType: { in: ['assignment', 'return'] } },
    });

    // 4. Delete returns
    await tx.return.deleteMany({});

    // 5. Delete assignments
    await tx.assignment.deleteMany({});

    // 6. Delete employees
    await tx.employee.deleteMany({});
  });

  console.log('\n=== STEP 1: POST-CLEANUP DATA AUDIT ===');
  const postEmployeesCount = await prisma.employee.count();
  const postAssignmentsCount = await prisma.assignment.count();
  const postReturnsCount = await prisma.return.count();
  const postStockMovementsCount = await prisma.stockMovement.count({
    where: { issuedToEmployeeId: { not: null } },
  });
  const postAttachmentsCount = await prisma.attachment.count({
    where: { entityType: { in: ['assignment', 'return'] } },
  });

  console.log(`Post-Cleanup Employees Count: ${postEmployeesCount}`);
  console.log(`Post-Cleanup Assignments Count: ${postAssignmentsCount}`);
  console.log(`Post-Cleanup Returns Count: ${postReturnsCount}`);
  console.log(`Post-Cleanup Employee StockMovements Count: ${postStockMovementsCount}`);
  console.log(`Post-Cleanup Assignment/Return Attachments Count: ${postAttachmentsCount}`);
  console.log(`Physical Attachment Files Deleted: ${deletedPhysicalFilesCount}`);

  return {
    pre: {
      employees: preEmployeesCount,
      assignments: preAssignmentsCount,
      returns: preReturnsCount,
      stockMovements: preStockMovementsCount,
      attachments: preAttachmentsCount,
    },
    post: {
      employees: postEmployeesCount,
      assignments: postAssignmentsCount,
      returns: postReturnsCount,
      stockMovements: postStockMovementsCount,
      attachments: postAttachmentsCount,
    },
  };
}

runCleanup()
  .catch((e) => {
    console.error('[CLEANUP ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
