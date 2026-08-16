import * as consumableService from './consumable.service.js';
import { createConsumableSchema, restockSchema } from './consumable.schema.js';
import { z } from 'zod';

const issueSchema = z.object({
  quantity: z.number().int('Miktar tam sayı olmalıdır.').positive('Miktar 1 veya daha büyük olmalıdır.'),
  employeeId: z.string().uuid().optional().nullable(),
  note: z.string().optional(),
});

export const getConsumables = async (req, res, next) => {
  try {
    const { page, pageSize, categoryId, q } = req.query;
    const result = await consumableService.listConsumables({ page, pageSize, categoryId, q });
    res.json({
      success: true,
      data: result.items,
      pagination: {
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createConsumable = async (req, res, next) => {
  try {
    const validatedData = createConsumableSchema.parse(req.body);
    const consumable = await consumableService.createConsumable(validatedData, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Sarf malzeme başarıyla oluşturuldu.',
      data: consumable,
    });
  } catch (error) {
    next(error);
  }
};

export const getConsumableById = async (req, res, next) => {
  try {
    const consumable = await consumableService.getConsumableById(req.params.id);
    res.json({
      success: true,
      data: consumable,
    });
  } catch (error) {
    next(error);
  }
};

export const getConsumableHistory = async (req, res, next) => {
  try {
    const history = await consumableService.getConsumableHistory(req.params.id);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const restockConsumable = async (req, res, next) => {
  try {
    const validatedData = restockSchema.parse(req.body);
    const updatedConsumable = await consumableService.restockConsumable(
      req.params.id,
      validatedData,
      req.user.id
    );
    res.json({
      success: true,
      message: 'Stok ekleme başarılı.',
      data: updatedConsumable,
    });
  } catch (error) {
    next(error);
  }
};

export const issueConsumable = async (req, res, next) => {
  try {
    const validatedData = issueSchema.parse(req.body);
    const updatedConsumable = await consumableService.issueConsumable(
      req.params.id,
      validatedData,
      req.user.id
    );
    res.json({
      success: true,
      message: 'Sarf malzeme düşümü başarıyla yapıldı.',
      data: updatedConsumable,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConsumable = async (req, res, next) => {
  try {
    const result = await consumableService.deleteConsumable(req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const exportConsumables = async (req, res, next) => {
  try {
    const { categoryId, q } = req.query;
    await consumableService.exportConsumables({ categoryId, q }, res);
  } catch (error) {
    next(error);
  }
};


