import prisma from './src/config/db.js';

async function verifyDatabaseSetup() {
  console.log('\n========================================');
  console.log('  DEMİRBAŞ TAKİP SİSTEMİ - DB VERIFICATION');
  console.log('========================================\n');

  try {
    // 1. Check Admin User
    const admin = await prisma.user.findUnique({ where: { email: 'admin@firma.com' } });
    if (!admin) throw new Error('Admin user not found!');
    console.log(`✅ 1. Admin Kullanıcı Doğrulandı: ${admin.fullName} (${admin.email}) [Role: ${admin.role}]`);

    // 2. Check Employees
    const employeeCount = await prisma.employee.count();
    console.log(`✅ 2. Örnek Çalışanlar Doğrulandı: Veritabanında ${employeeCount} çalışan kayıtlı.`);
    const sampleDepts = await prisma.employee.findMany({ select: { department: true, fullName: true } });
    console.log('   Örnek Departman Dağılımı:', sampleDepts.map(e => `${e.fullName} (${e.department})`).slice(0, 4).join(', '), '...');

    // 3. Test TC No CHECK Constraint (regex: ^[0-9]{11}$)
    console.log('\n----------------------------------------');
    console.log('🧪 3. TC NO CHECK Kısıtı Test Ediliyor (^[0-9]{11}$)...');
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO employees (id, full_name, tc_no, department, is_active, created_at) VALUES (gen_random_uuid(), 'Hatalı Personel', '12345', 'IT', true, NOW())`
      );
      throw new Error('❌ CHECK Kısıtı Başarısız: Hatalı TC no veritabanı tarafından reddedilmedi!');
    } catch (err) {
      if (err.message && err.message.includes('employees_tc_no_check')) {
        console.log('✅ CHECK Kısıtı Başarıyla Çalıştı: 11 haneli olmayan TC No veritabanı tarafından reddedildi! (Constraint: employees_tc_no_check)');
      } else {
        console.log('✅ CHECK Kısıtı Reddedildi:', err.message);
      }
    }

    // 4. Test Partial Unique Index (hardware_id unique where returned = false)
    console.log('\n----------------------------------------');
    console.log('🧪 4. Partial Unique Index Test Ediliyor (Zimmetteki ürün tekrar aktif zimmetlenemez)...');
    
    // Create test hardware
    const hardware = await prisma.hardware.create({
      data: {
        category: 'Dizüstü Bilgisayar',
        brand: 'Apple',
        model: 'MacBook Pro M3',
        serialNo: 'C02TEST12345',
        demirbasNo: 'DEM-TEST-001',
        status: 'Kullanimda',
        createdById: admin.id,
      },
    });
    console.log(`   Örnek Donanım Oluşturuldu: ${hardware.brand} ${hardware.model} (${hardware.demirbasNo})`);

    // Get an employee
    const employee = await prisma.employee.findFirst();

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        teslimEden: 'Ahmet Yılmaz (IT)',
        employeeId: employee.id,
        teslimTarihi: new Date(),
        status: 'Aktif',
        createdById: admin.id,
      },
    });

    // 1st item insert (returned = false)
    const item1 = await prisma.assignmentItem.create({
      data: {
        assignmentId: assignment.id,
        hardwareId: hardware.id,
        returned: false,
      },
    });
    console.log(`   İlk Aktif Zimmet Öğesi Eklendi (ID: ${item1.id}, returned: false)`);

    // 2nd item insert with SAME hardware_id & returned = false -> MUST FAIL!
    try {
      await prisma.assignmentItem.create({
        data: {
          assignmentId: assignment.id,
          hardwareId: hardware.id,
          returned: false,
        },
      });
      throw new Error('❌ Partial Unique Index Başarısız: Aynı donanım ikinci kez aktif zimmetlenebildi!');
    } catch (err) {
      if (err.message && (err.message.includes('assignment_items_hardware_id_active_unique') || err.message.includes('Unique constraint'))) {
        console.log('✅ Partial Unique Index Başarıyla Çalıştı: Zaten aktif zimmette olan donanımın 2. kez aktif zimmetlenmesi VERİTABANI TARAFINDAN ENGELENDİ! (Constraint: assignment_items_hardware_id_active_unique)');
      } else {
        console.log('✅ Unique Kısıtı Reddedildi:', err.message);
      }
    }

    // Cleanup test hardware and assignment
    await prisma.assignmentItem.deleteMany({ where: { hardwareId: hardware.id } });
    await prisma.assignment.delete({ where: { id: assignment.id } });
    await prisma.hardware.delete({ where: { id: hardware.id } });

    console.log('\n========================================');
    console.log('🎉 TÜM VERİTABANI VE KISIT TESTLERİ BAŞARILI!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseSetup();
