import * as hardwareService from './hardware.service.js';
import { createHardwareSchema, updateHardwareSchema } from './hardware.schema.js';

export const createHardware = async (req, res) => {
  try {
    const validatedData = createHardwareSchema.parse(req.body);
    const newItem = await hardwareService.createHardware(validatedData, req.user.id);
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
      message: error.message || 'Ürün oluşturulurken bir hata oluştu.',
    });
  }
};

export const listHardware = async (req, res) => {
  try {
    const { page, category, status, q } = req.query;
    const result = await hardwareService.listHardware({
      page,
      category,
      status,
      q,
    });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Ürünler listelenirken bir hata oluştu.',
    });
  }
};

export const getHardwareById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await hardwareService.getHardwareById(id);
    return res.status(200).json({
      status: 'success',
      data: item,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Ürün detayı alınırken hata oluştu.',
    });
  }
};

export const updateHardware = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateHardwareSchema.parse(req.body);
    const updated = await hardwareService.updateHardware(id, validatedData);
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
      message: error.message || 'Ürün güncellenirken hata oluştu.',
    });
  }
};

export const deleteHardware = async (idReq, res) => {
  try {
    const { id } = idReq.params;
    const result = await hardwareService.deleteHardware(id);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Ürün silinirken hata oluştu.',
    });
  }
};

export const getHardwareHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await hardwareService.getHardwareHistory(id);
    return res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Ürün geçmişi alınırken hata oluştu.',
    });
  }
};

export const getHardwareStats = async (req, res, next) => {
  try {
    const data = await hardwareService.getHardwareStats();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('getHardwareStats controller error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const exportHardware = async (req, res, next) => {
  try {
    const { category, status, q } = req.query;
    await hardwareService.exportHardware({ category, status, q }, res);
  } catch (error) {
    next(error);
  }
};

export const generateBarcodesPdf = async (req, res, next) => {
  try {
    const { hardwareIds } = req.body || {};
    const pdfBuffer = await hardwareService.generateBarcodesPdf(hardwareIds);

    const todayStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="barkodlar-${todayStr}.pdf"`);
    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};


