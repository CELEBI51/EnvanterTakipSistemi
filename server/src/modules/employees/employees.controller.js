import * as employeesService from './employees.service.js';
import { createEmployeeSchema } from './employees.schema.js';

export const getEmployees = async (req, res, next) => {
  try {
    const { page, pageSize, q, isActive } = req.query;
    const result = await employeesService.listEmployees({ page, pageSize, q, isActive });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body);
    const employee = await employeesService.createEmployee(validatedData);
    return res.status(201).json({
      success: true,
      message: 'Personel başarıyla oluşturuldu.',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeesService.getEmployeeById(id);
    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, terminationDate } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Lütfen geçerli bir isActive boolean değeri gönderin.',
      });
    }

    const updatedEmployee = await employeesService.updateEmployeeStatus(id, {
      isActive,
      terminationDate,
    });

    return res.status(200).json({
      success: true,
      message: isActive ? 'Personel yeniden aktif edildi.' : 'Personel durum pasife (işten çıkarıldı) alındı.',
      data: updatedEmployee,
    });
  } catch (error) {
    if (error.statusCode === 400 && error.activeAssignmentCount !== undefined) {
      return res.status(400).json({
        success: false,
        message: error.message,
        activeAssignmentCount: error.activeAssignmentCount,
      });
    }
    next(error);
  }
};

export const getEmployeeStats = async (req, res, next) => {
  try {
    const stats = await employeesService.getEmployeeStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const exportEmployees = async (req, res, next) => {
  try {
    const { q, isActive } = req.query;
    await employeesService.exportEmployees({ q, isActive }, res);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await employeesService.updateEmployee(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Personel bilgileri başarıyla güncellendi.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};


