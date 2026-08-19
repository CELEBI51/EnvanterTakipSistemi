import prisma from '../../config/db.js';

export const getNotificationSummary = async () => {
  let criticalStockThreshold = 5;
  let licenseWarningDays = 15;

  try {
    const { getSettings } = await import('../settings/settings.service.js');
    const settings = await getSettings();
    if (settings) {
      if (typeof settings.criticalStockThreshold === 'number') {
        criticalStockThreshold = settings.criticalStockThreshold;
      }
      if (typeof settings.licenseWarningDays === 'number') {
        licenseWarningDays = settings.licenseWarningDays;
      }
    }
  } catch (err) {
    console.error('[NotificationsService] Ayarlar okunamadı, varsayılan değerler kullanılıyor:', err);
  }

  const now = new Date();
  const thresholdDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + licenseWarningDays,
    23,
    59,
    59,
    999
  );

  // 1. Expiring Licenses (status != IPTAL_EDILDI and endDate <= licenseWarningDays)
  const licenseWhere = {
    status: { not: 'IPTAL_EDILDI' },
    endDate: { lte: thresholdDate },
  };

  // 2. Critical Accessories (availableQuantity <= criticalStockThreshold)
  const accessoryWhere = {
    availableQuantity: { lte: criticalStockThreshold },
  };

  // 3. Critical Consumables (availableQuantity <= criticalStockThreshold)
  const consumableWhere = {
    availableQuantity: { lte: criticalStockThreshold },
  };

  // 4. Expired Licenses (status == SURESI_DOLDU)
  const expiredLicenseWhere = {
    status: 'SURESI_DOLDU',
  };

  const [
    expiringLicenseTotalCount,
    expiringLicensesList,
    criticalAccessoryTotalCount,
    criticalAccessoriesList,
    criticalConsumableTotalCount,
    criticalConsumablesList,
    expiredLicenseTotalCount,
    expiredLicensesList,
  ] = await Promise.all([
    prisma.license.count({ where: licenseWhere }),
    prisma.license.findMany({
      where: licenseWhere,
      take: 10,
      orderBy: { endDate: 'asc' },
      select: {
        id: true,
        brand: true,
        productInfo: true,
        endDate: true,
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.accessory.count({ where: accessoryWhere }),
    prisma.accessory.findMany({
      where: accessoryWhere,
      take: 10,
      orderBy: { availableQuantity: 'asc' },
      select: {
        id: true,
        name: true,
        brand: true,
        availableQuantity: true,
      },
    }),
    prisma.consumable.count({ where: consumableWhere }),
    prisma.consumable.findMany({
      where: consumableWhere,
      take: 10,
      orderBy: { availableQuantity: 'asc' },
      select: {
        id: true,
        name: true,
        availableQuantity: true,
      },
    }),
    prisma.license.count({ where: expiredLicenseWhere }),
    prisma.license.findMany({
      where: expiredLicenseWhere,
      take: 10,
      orderBy: { endDate: 'desc' },
      select: {
        id: true,
        brand: true,
        productInfo: true,
        endDate: true,
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const formattedLicenses = expiringLicensesList.map((lic) => {
    const end = new Date(lic.endDate);
    const diffTime = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      id: lic.id,
      brand: lic.brand,
      productInfo: lic.productInfo,
      endDate: lic.endDate,
      unit: lic.unit || null,
      daysRemaining,
    };
  });

  const formattedExpiredLicenses = expiredLicensesList.map((lic) => {
    const end = new Date(lic.endDate);
    const diffTime = now.getTime() - end.getTime();
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return {
      id: lic.id,
      brand: lic.brand,
      productInfo: lic.productInfo,
      endDate: lic.endDate,
      unit: lic.unit || null,
      daysPassed,
    };
  });

  const formattedAccessories = criticalAccessoriesList.map((acc) => ({
    id: acc.id,
    name: acc.name,
    brand: acc.brand || null,
    available: acc.availableQuantity,
  }));

  const formattedConsumables = criticalConsumablesList.map((con) => ({
    id: con.id,
    name: con.name,
    available: con.availableQuantity,
  }));

  const totalUnread =
    expiringLicenseTotalCount + criticalAccessoryTotalCount + criticalConsumableTotalCount + expiredLicenseTotalCount;

  return {
    expiringLicenses: {
      totalCount: expiringLicenseTotalCount,
      items: formattedLicenses,
    },
    expiredLicenses: {
      totalCount: expiredLicenseTotalCount,
      items: formattedExpiredLicenses,
    },
    criticalAccessories: {
      totalCount: criticalAccessoryTotalCount,
      items: formattedAccessories,
    },
    criticalConsumables: {
      totalCount: criticalConsumableTotalCount,
      items: formattedConsumables,
    },
    totalUnread,
  };
};
