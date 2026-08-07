import * as employeesService from './employees.service.js';
import { createEmployeeSchema } from './employees.schema.js';

export const getEmployees = async (req, res, next) => {
  try {
    const { page, pageSize, q } = req.query;
    const result = await employeesService.listEmployees({ page, pageSize, q });
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
