import * as returnsService from './returns.service.js';
import { createReturnSchema } from './returns.schema.js';

const makePdfFileName = (date, personName) => {
  const datePart = new Date(date).toISOString().slice(0, 10);
  const namePart = String(personName || 'Personel')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/gi, 'g').replace(/ş/gi, 's').replace(/ı/gi, 'i')
    .replace(/ç/gi, 'c').replace(/ö/gi, 'o').replace(/ü/gi, 'u')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Personel';
  return `${datePart}_Iade_${namePart}.pdf`;
};

export const createReturn = async (req, res, next) => {
  try {
    const validatedData = createReturnSchema.parse(req.body);
    const result = await returnsService.createReturn(validatedData, req.user.id);
    return res.status(201).json({
      success: true,
      message: 'İade kaydı başarıyla oluşturuldu.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listReturns = async (req, res, next) => {
  try {
    const { assignmentId, employeeId, unitId, status, q, page, pageSize } = req.query;
    const result = await returnsService.listReturns({ assignmentId, employeeId, unitId, status, q, page, pageSize });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};


export const getReturnDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await returnsService.getReturnDetail(id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadReturnPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pdfPath = await returnsService.getReturnPdfFile(id);
    const returnRecord = await returnsService.getReturnDetail(id);
    return res.download(
      pdfPath,
      makePdfFileName(returnRecord.tarih, returnRecord.assignment?.employee?.fullName)
    );
  } catch (error) {
    next(error);
  }
};

export const uploadSignedReturnForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      const err = new Error('Yüklenecek imzalı iade belgesi seçilmedi.');
      err.statusCode = 400;
      throw err;
    }
    const attachment = await returnsService.uploadSignedReturnForm(id, req.file, req.user.id);
    return res.status(201).json({
      success: true,
      message: 'İmzalı iade formu başarıyla yüklendi.',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadSignedReturnForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attachment = await returnsService.getSignedReturnFormFile(id);
    return res.download(attachment.filePath, attachment.originalName || `Imgali_Iade_Formu_${id}.pdf`);
  } catch (error) {
    next(error);
  }
};

export const exportReturns = async (req, res, next) => {
  try {
    const { assignmentId, employeeId, unitId, q } = req.query;
    await returnsService.exportReturns({ assignmentId, employeeId, unitId, q }, res);
  } catch (error) {
    next(error);
  }
};
