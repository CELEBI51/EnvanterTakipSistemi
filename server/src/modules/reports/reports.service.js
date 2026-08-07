import prisma from '../../config/db.js';

export const getDashboardStats = async () => {
  const now = new Date();
  const threshold15Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15, 23, 59, 59, 999);

  const [
    totalCount,
    assignedCount,
    readyCount,
    faultyCount,
    disusedCount,
    hardwareList,
    expiringLicenseCount,
  ] = await Promise.all([
    prisma.hardware.count(),
    prisma.hardware.count({ where: { status: 'Kullanimda' } }),
    prisma.hardware.count({ where: { status: 'Hazir' } }),
    prisma.hardware.count({ where: { status: { in: ['Arizali', 'Serviste'] } } }),
    prisma.hardware.count({ where: { status: 'KullanimDisi' } }),
    prisma.hardware.findMany({
      select: {
        category: {
          select: { name: true },
        },
      },
    }),
    prisma.license.count({
      where: {
        status: { not: 'IPTAL_EDILDI' },
        endDate: {
          lte: threshold15Days,
        },
      },
    }),
  ]);

  const arizaliOnlyCount = await prisma.hardware.count({ where: { status: 'Arizali' } });
  const servisteOnlyCount = await prisma.hardware.count({ where: { status: 'Serviste' } });

  const statusDistribution = [
    { status: 'Hazır', count: readyCount, key: 'Hazir' },
    { status: 'Kullanımda', count: assignedCount, key: 'Kullanimda' },
    { status: 'Arızalı', count: arizaliOnlyCount, key: 'Arizali' },
    { status: 'Serviste', count: servisteOnlyCount, key: 'Serviste' },
    { status: 'Kullanım Dışı', count: disusedCount, key: 'KullanimDisi' },
  ];

  const categoryMap = {};
  for (const item of hardwareList) {
    const catName = item.category?.name || 'Diğer';
    categoryMap[catName] = (categoryMap[catName] || 0) + 1;
  }

  const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    count,
  }));

  return {
    totalCount,
    assignedCount,
    readyCount,
    faultyCount,
    expiringLicenseCount,
    expiringSoftwareCount: expiringLicenseCount, // Backward compatibility
    statusDistribution,
    categoryDistribution,
  };
};
