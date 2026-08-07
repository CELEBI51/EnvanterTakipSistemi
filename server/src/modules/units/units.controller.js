import * as unitsService from './units.service.js';
import { createUnitSchema, updateUnitSchema } from './units.schema.js';

export const getUnits = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const units = await unitsService.listUnits({ includeInactive });
    return res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await unitsService.getUnitById(id);
    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (req, res, next) => {
  try {
    const validatedData = createUnitSchema.parse(req.body);
    const unit = await unitsService.createUnit(validatedData);
    return res.status(201).json({
      success: true,
      message: 'Birim başarıyla oluşturuldu.',
      data: unit,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateUnitSchema.parse(req.body);
    const updatedUnit = await unitsService.updateUnit(id, validatedData);
    return res.status(200).json({
      success: true,
      message: 'Birim başarıyla güncellendi.',
      data: updatedUnit,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedUnit = await unitsService.deleteUnit(id);
    return res.status(200).json({
      success: true,
      message: 'Birim başarıyla pasife alındı.',
      data: deletedUnit,
    });
  } catch (error) {
    next(error);
  }
};
