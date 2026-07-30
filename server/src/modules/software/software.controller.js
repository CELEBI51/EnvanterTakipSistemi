import * as softwareService from './software.service.js';
import { createSoftwareSchema, updateSoftwareSchema } from './software.schema.js';

export const createSoftware = async (req, res) => {
  try {
    const validatedData = createSoftwareSchema.parse(req.body);
    const newItem = await softwareService.createSoftware(validatedData);
    return res.status(201).json({
      status: 'success',
      data: newItem,
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
      message: error.message || 'Yazılım eklenirken bir hata oluştu.',
    });
  }
};

export const listSoftware = async (req, res) => {
  try {
    const { page, pageSize, q, expiring } = req.query;
    const result = await softwareService.listSoftware({
      page,
      pageSize,
      q,
      expiring,
    });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Yazılımlar listelenirken bir hata oluştu.',
    });
  }
};

export const getExpiringSoftware = async (req, res) => {
  try {
    const { days } = req.query;
    const items = await softwareService.getExpiringSoftware(days);
    return res.status(200).json({
      status: 'success',
      data: items,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Süresi yaklaşan yazılımlar alınırken bir hata oluştu.',
    });
  }
};

export const getSoftwareById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await softwareService.getSoftwareById(id);
    return res.status(200).json({
      status: 'success',
      data: item,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Yazılım detayı alınırken hata oluştu.',
    });
  }
};

export const updateSoftware = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateSoftwareSchema.parse(req.body);
    const updated = await softwareService.updateSoftware(id, validatedData);
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
      message: error.message || 'Yazılım güncellenirken hata oluştu.',
    });
  }
};

export const deleteSoftware = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await softwareService.deleteSoftware(id);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Yazılım silinirken hata oluştu.',
    });
  }
};
