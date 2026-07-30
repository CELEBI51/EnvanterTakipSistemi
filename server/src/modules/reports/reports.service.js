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
    categoryGroups,
    expiringSoftwareCount,
  ] = await Promise.all([
    prisma.hardware.count(),
    prisma.hardware.count({ where: { status: 'Kullanimda' } }),
    prisma.hardware.count({ where: { status: 'Hazir' } }),
    prisma.hardware.count({ where: { status: { in: ['Arizali', 'Serviste'] } } }),
    prisma.hardware.count({ where: { status: 'KullanimDisi' } }),
    prisma.hardware.groupBy({
      by: ['category'],
      _count: { id: true },
    }),
    prisma.software.count({
      where: {
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

  const categoryDistribution = categoryGroups.map((g) => ({
    category: g.category,
    count: g._count.id,
  }));

  return {
    totalCount,
    assignedCount,
    readyCount,
    faultyCount,
    expiringSoftwareCount,
    statusDistribution,
    categoryDistribution,
  };
};
