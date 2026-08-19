import prisma from '../config/db.js';

export const createLog = async ({
  userId,
  userEmail,
  action,
  module,
  description,
  entityId,
  ipAddress,
  statusCode,
}) => {
  try {
    await prisma.systemLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action: action || 'INFO',
        module: module || 'system',
        description: description || '',
        entityId: entityId ? String(entityId) : null,
        ipAddress: ipAddress || null,
        statusCode: statusCode ? Number(statusCode) : null,
      },
    });
  } catch (err) {
    // CRITICAL RULE: Log failure MUST NOT stop or break the main operation
    console.error('[SystemLog Error] Log kaydı yazılırken hata oluştu:', err.message);
  }
};
