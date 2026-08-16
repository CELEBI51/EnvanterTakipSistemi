import path from 'path';
import * as assignmentsService from './assignments.service.js';
import { createAssignmentSchema } from './assignments.schema.js';

export const createAssignment = async (req, res, next) => {
  try {
    const validatedData = createAssignmentSchema.parse(req.body);
    const result = await assignmentsService.createAssignment(validatedData, req.user);
    return res.status(201).json({
      success: true,
      message: 'Zimmet kaydı başarıyla oluşturuldu.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listAssignments = async (req, res, next) => {
  try {
    const { employeeId, status, unitId, dateFrom, dateTo, q, page, pageSize } = req.query;
    const result = await assignmentsService.listAssignments({
      employeeId,
      status,
      unitId,
      dateFrom,
      dateTo,
      q,
      page,
      pageSize,
    });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await assignmentsService.getAssignmentDetail(id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAssignmentPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pdfPath = await assignmentsService.getAssignmentPdfFile(id);
    return res.download(pdfPath, `Zimmet_Formu_${id}.pdf`);
  } catch (error) {
    next(error);
  }
};

export const uploadSignedForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      const err = new Error('Yüklenecek imzalı belge dosyası seçilmedi.');
      err.statusCode = 400;
      throw err;
    }
    const attachment = await assignmentsService.uploadSignedForm(id, req.file, req.user.id);
    return res.status(201).json({
      success: true,
      message: 'İmzalı zimmet formu başarıyla yüklendi.',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadSignedForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attachment = await assignmentsService.getSignedFormFile(id);
    return res.download(attachment.filePath, attachment.originalName || `Imgali_Zimmet_Formu_${id}.pdf`);
  } catch (error) {
    next(error);
  }
};

export const getAssignmentStats = async (req, res, next) => {
  try {
    const data = await assignmentsService.getAssignmentStats();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportAssignments = async (req, res, next) => {
  try {
    const { employeeId, status, unitId, dateFrom, dateTo, q } = req.query;
    await assignmentsService.exportAssignments({ employeeId, status, unitId, dateFrom, dateTo, q }, res);
  } catch (error) {
    next(error);
  }
};


