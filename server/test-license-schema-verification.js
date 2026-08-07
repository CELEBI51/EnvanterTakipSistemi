import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runLicenseSchemaVerification() {
  console.log('=== RUNNING LICENSE SCHEMA VERIFICATION TESTS ===\n');

  try {
    // 1. Check Table Columns in PostgreSQL catalog
    console.log('[TEST 1] Verifying licenses table structure in PostgreSQL...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'licenses'
      ORDER BY ordinal_position;
    `;

    console.log(' -> Columns Found in `licenses` Table:');
    for (const col of columns) {
      console.log(`    - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }

    const colNames = columns.map((c) => c.column_name);
    const expectedCols = ['unit_id', 'brand', 'product_info', 'license_key', 'start_date', 'end_date', 'payment_type', 'status', 'invoice_number', 'invoice_amount', 'notes'];
    for (const exp of expectedCols) {
      if (!colNames.includes(exp)) {
        throw new Error(`Column ${exp} is missing from licenses table!`);
      }
    }
    console.log(' -> All expected new columns exist in database table.');

    // 2. Check Enums in PostgreSQL catalog
    console.log('\n[TEST 2] Verifying License Enums in PostgreSQL...');
    const paymentEnums = await prisma.$queryRaw`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'LicensePaymentType';
    `;
    console.log(' -> LicensePaymentType Enum Labels:', paymentEnums.map((e) => e.enumlabel));

    const statusEnums = await prisma.$queryRaw`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'LicenseStatus';
    `;
    console.log(' -> LicenseStatus Enum Labels:', statusEnums.map((e) => e.enumlabel));

    // 3. Test Attachment Integration with entityType = "license"
    console.log('\n[TEST 3] Testing Attachment integration (entityType: "license")...');
    
    // Fetch a Unit and User
    const unit = await prisma.unit.findFirst();
    const user = await prisma.user.findFirst();

    if (!unit || !user) throw new Error('Unit or User missing for test!');

    // Create a temporary License
    const testLicense = await prisma.license.create({
      data: {
        unitId: unit.id,
        brand: 'JetBrains',
        productInfo: 'WebStorm IDE',
        licenseKey: 'WS-KEY-12345',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        paymentType: 'KREDI_KARTI',
        status: 'YENILENMEDI',
        invoiceNumber: 'INV-2026-001',
        invoiceAmount: 1500.50,
        notes: 'Test lisansı',
        createdById: user.id,
      },
    });

    console.log(' -> Temporary License Created ID:', testLicense.id);
    console.log(' -> License PaymentType:', testLicense.paymentType, '| Status:', testLicense.status);

    // Insert Attachment with entityType = "license"
    const testAttachment = await prisma.attachment.create({
      data: {
        entityType: 'license',
        entityId: testLicense.id,
        fileType: 'invoice',
        filePath: 'storage/invoices/test-license-invoice.pdf',
        originalName: 'test-license-invoice.pdf',
        uploadedById: user.id,
      },
    });

    console.log(' -> Temporary Attachment Created ID:', testAttachment.id);
    console.log(' -> Attachment entityType:', testAttachment.entityType, '| entityId:', testAttachment.entityId);

    // Query Attachment back
    const fetchedAttachment = await prisma.attachment.findFirst({
      where: {
        entityType: 'license',
        entityId: testLicense.id,
      },
    });

    console.log(' -> Queried Attachment Found:', !!fetchedAttachment);
    if (!fetchedAttachment || fetchedAttachment.id !== testAttachment.id) {
      throw new Error('Attachment query for license entityType failed!');
    }

    // Clean up temporary records
    await prisma.attachment.delete({ where: { id: testAttachment.id } });
    await prisma.license.delete({ where: { id: testLicense.id } });
    console.log(' -> Temporary test records cleaned up cleanly.');

    console.log('\n=== ALL LICENSE SCHEMA VERIFICATION TESTS PASSED WITH 100% SUCCESS ===');
  } catch (err) {
    console.error('\n[VERIFICATION ERROR]', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runLicenseSchemaVerification();
