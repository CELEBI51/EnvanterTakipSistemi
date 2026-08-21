import * as settingsService from './settings.service.js';
import path from 'path';
import fs from 'fs';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json({
      success: true,
      data: {
        companyName: settings.companyName || 'DİTAŞ Otomotiv',
        companyAddress: settings.companyAddress || null,
        companyPhone: settings.companyPhone || null,
        companyEmail: settings.companyEmail || null,
        logoPath: settings.logoPath || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const {
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyTaxNo,
      logoPath,
      criticalStockThreshold,
      licenseWarningDays,
    } = req.body;

    if (companyName !== undefined && (!companyName || companyName.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Şirket adı zorunludur.',
      });
    }

    if (criticalStockThreshold !== undefined) {
      const val = Number(criticalStockThreshold);
      if (isNaN(val) || val < 1 || val > 100) {
        return res.status(400).json({
          success: false,
          message: 'Kritik stok eşiği 1 ile 100 arasında bir tam sayı olmalıdır.',
        });
      }
    }

    if (licenseWarningDays !== undefined) {
      const val = Number(licenseWarningDays);
      if (isNaN(val) || val < 1 || val > 90) {
        return res.status(400).json({
          success: false,
          message: 'Lisans uyarı süresi 1 ile 90 gün arasında bir tam sayı olmalıdır.',
        });
      }
    }

    const updated = await settingsService.updateSettings({
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyTaxNo,
      logoPath,
      criticalStockThreshold,
      licenseWarningDays,
    });

    return res.status(200).json({
      success: true,
      message: 'Sistem ayarları başarıyla güncellendi.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir logo dosyası seçiniz.',
      });
    }

    const relativePath = path.join('storage', 'logo', req.file.filename).replace(/\\/g, '/');
    const updated = await settingsService.updateSettings({ logoPath: relativePath });

    return res.status(200).json({
      success: true,
      message: 'Logo başarıyla yüklendi.',
      data: {
        logoPath: relativePath,
        settings: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLogo = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const logoInfo = await settingsService.getLogoInfo();

    if (!logoInfo) {
      return res.status(404).json({
        success: false,
        message: 'Logo bulunamadı veya henüz yüklenmedi.',
      });
    }

    const { format } = req.query;
    if (format === 'base64') {
      return res.status(200).json({
        success: true,
        data: {
          base64: logoInfo.base64,
          mimeType: logoInfo.mimeType,
        },
      });
    }

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', logoInfo.mimeType);
    return res.send(logoInfo.buffer);
  } catch (error) {
    next(error);
  }
};

export const getEmailTemplates = async (req, res, next) => {
  try {
    const templates = await settingsService.listEmailTemplates();
    return res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailTemplateByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const template = await settingsService.getEmailTemplateByType(type);
    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmailTemplate = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { subject, bodyText } = req.body;

    const updated = await settingsService.updateEmailTemplate(type, { subject, bodyText });
    return res.status(200).json({
      success: true,
      message: 'E-posta şablonu başarıyla güncellendi.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestEmail = async (req, res, next) => {
  try {
    const { type } = req.params;
    const adminEmail = req.user?.email || 'admin@firma.com';

    const result = await settingsService.sendTestEmail(type, adminEmail);
    return res.status(200).json({
      success: true,
      message: `Test e-postası '${adminEmail}' adresine gönderildi.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBackupCounts = async (req, res, next) => {
  try {
    const backupService = await import('./backup.service.js');
    const counts = await backupService.getBackupCounts();
    return res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadBackup = async (req, res, next) => {
  try {
    const backupService = await import('./backup.service.js');
    const { modules } = req.query;
    const selectedModules = modules ? modules.split(',').map((m) => m.trim()) : [];

    const workbook = await backupService.generateBackupWorkbook(selectedModules);

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `ditas-yedek-${todayStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);

    try {
      const { createLog } = await import('../../services/log.service.js');
      await createLog({
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        action: 'EXPORT',
        module: 'backup',
        description: `Yedek indirildi (Modüller: ${selectedModules.length > 0 ? selectedModules.join(', ') : 'Tüm Modüller'})`,
        statusCode: 200,
      });
    } catch (lErr) {}

    res.end();
  } catch (error) {
    next(error);
  }
};

export const restoreBackup = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir Excel (.xlsx) yedeği seçiniz.',
      });
    }

    const backupService = await import('./backup.service.js');
    let strategies = {};
    if (req.body.strategies) {
      try {
        strategies = typeof req.body.strategies === 'string'
          ? JSON.parse(req.body.strategies)
          : req.body.strategies;
      } catch {
        strategies = {};
      }
    }

    const result = await backupService.restoreBackupFromBuffer(req.file.buffer, strategies);

    try {
      const { createLog } = await import('../../services/log.service.js');
      const importedMods = Object.keys(result.imported || {}).join(', ');
      await createLog({
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        action: 'RESTORE',
        module: 'backup',
        description: `Yedek yüklendi (İşlenen Modüller: ${importedMods || 'Tümü'})`,
        statusCode: 200,
      });
    } catch (lErr) {}

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSystemLogs = async (req, res, next) => {
  try {
    const { module: mod, action, userId, userEmail, dateFrom, dateTo, page, limit } = req.query;
    const result = await settingsService.getSystemLogs({
      module: mod,
      action,
      userId,
      userEmail,
      dateFrom,
      dateTo,
      page,
      limit,
    });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const exportSystemLogs = async (req, res, next) => {
  try {
    const { module: mod, action, userId, userEmail, dateFrom, dateTo } = req.query;
    const workbook = await settingsService.exportSystemLogs({
      module: mod,
      action,
      userId,
      userEmail,
      dateFrom,
      dateTo,
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `sistem-loglari-${todayStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};


