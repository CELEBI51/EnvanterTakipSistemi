import * as maintenanceService from './maintenance.service.js';
import {
  createMaintenanceSchema,
  addComponentSchema,
  completeMaintenanceSchema,
} from './maintenance.schema.js';

export const createMaintenance = async (req, res, next) => {
  try {
    const validatedData = createMaintenanceSchema.parse(req.body);
    const result = await maintenanceService.createMaintenance(validatedData, req.user.id);
    return res.status(201).json({
      success: true,
      message: 'Bakım kaydı başarıyla oluşturuldu.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listMaintenance = async (req, res, next) => {
  try {
    const { hardwareId, status, page, pageSize } = req.query;
    const result = await maintenanceService.listMaintenance({ hardwareId, status, page, pageSize });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await maintenanceService.getMaintenanceDetail(id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const addComponentToMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = addComponentSchema.parse(req.body);
    const result = await maintenanceService.addComponentToMaintenance(
      id,
      validatedData.componentId,
      validatedData.quantityUsed,
      req.user.id
    );
    return res.status(201).json({
      success: true,
      message: 'Bileşen bakıma başarıyla eklendi.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const completeMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = completeMaintenanceSchema.parse(req.body);
    const result = await maintenanceService.completeMaintenance(
      id,
      validatedData.endDate,
      validatedData.resultStatus
    );
    return res.status(200).json({
      success: true,
      message: 'Bakım tamamlandı olarak güncellendi.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
