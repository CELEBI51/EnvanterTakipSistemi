import { createLicenseSchema, updateLicenseSchema, updateLicenseStatusSchema } from './license.schema.js';
import * as licenseService from './license.service.js';

export const getLicenses = async (req, res, next) => {
  try {
    const { page, pageSize, limit, unitId, status, paymentType, endDateFrom, endDateTo, q } = req.query;
    const result = await licenseService.listLicenses({
      page,
      pageSize: limit || pageSize,
      unitId,
      status,
      paymentType,
      endDateFrom,
      endDateTo,
      q,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const getLicenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await licenseService.getLicenseById(id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const createLicense = async (req, res, next) => {
  try {
    const parsed = createLicenseSchema.parse(req.body);
    const data = await licenseService.createLicense(parsed, req.user?.id);
    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Geçersiz parametreler.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const updateLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateLicenseSchema.parse(req.body);
    const data = await licenseService.updateLicense(id, parsed);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Geçersiz parametreler.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const updateLicenseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateLicenseStatusSchema.parse(req.body);
    const data = await licenseService.updateLicenseStatus(id, parsed);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Geçersiz durum parametresi.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const getLicenseStats = async (req, res, next) => {
  try {
    const data = await licenseService.getLicenseStats();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const getExpiringLicenses = async (req, res, next) => {
  try {
    const { days } = req.query;
    const data = await licenseService.getExpiringLicenses(days);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
