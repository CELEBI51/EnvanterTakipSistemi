import * as accessoryService from './accessories.service.js';
import {
  createAccessorySchema,
  restockSchema,
  markDefectiveSchema,
} from './accessories.schema.js';

export const createAccessory = async (req, res) => {
  try {
    const validatedData = createAccessorySchema.parse(req.body);
    const newAccessory = await accessoryService.createAccessory(validatedData, req.user.id);
    return res.status(201).json({
      status: 'success',
      data: newAccessory,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validasyon hatası.',
        errors: error.errors.map((e) => e.message),
      });
    }
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Aksesuar oluşturulurken bir hata oluştu.',
    });
  }
};

export const listAccessories = async (req, res) => {
  try {
    const { page, pageSize, category, q } = req.query;
    const result = await accessoryService.listAccessories({
      page,
      pageSize,
      category,
      q,
    });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Aksesuarlar listelenirken bir hata oluştu.',
    });
  }
};

export const getAccessoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await accessoryService.getAccessoryById(id);
    return res.status(200).json({
      status: 'success',
      data: item,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Aksesuar bilgisi alınamadı.',
    });
  }
};

export const restockAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = restockSchema.parse(req.body);
    const updated = await accessoryService.restockAccessory(id, validatedData, req.user.id);
    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validasyon hatası.',
        errors: error.errors.map((e) => e.message),
      });
    }
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Stok takviyesi yapılırken bir hata oluştu.',
    });
  }
};

export const markDefective = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = markDefectiveSchema.parse(req.body);
    const updated = await accessoryService.markDefective(id, validatedData, req.user.id);
    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validasyon hatası.',
        errors: error.errors.map((e) => e.message),
      });
    }
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Arızalı stok ayrılırken bir hata oluştu.',
    });
  }
};

export const getAccessoryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await accessoryService.getAccessoryHistory(id);
    return res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Stok hareket geçmişi alınamadı.',
    });
  }
};

export const deleteAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await accessoryService.deleteAccessory(id);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Aksesuar silinirken bir hata oluştu.',
    });
  }
};
