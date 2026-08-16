import * as componentService from './component.service.js';
import { createComponentSchema, restockSchema } from './component.schema.js';

export const getComponents = async (req, res, next) => {
  try {
    const { page, pageSize, categoryId, q } = req.query;
    const result = await componentService.listComponents({ page, pageSize, categoryId, q });
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

export const createComponent = async (req, res, next) => {
  try {
    const validatedData = createComponentSchema.parse(req.body);
    const component = await componentService.createComponent(validatedData, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Bileşen başarıyla oluşturuldu.',
      data: component,
    });
  } catch (error) {
    next(error);
  }
};

export const getComponentById = async (req, res, next) => {
  try {
    const component = await componentService.getComponentById(req.params.id);
    res.json({
      success: true,
      data: component,
    });
  } catch (error) {
    next(error);
  }
};

export const getComponentHistory = async (req, res, next) => {
  try {
    const history = await componentService.getComponentHistory(req.params.id);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const restockComponent = async (req, res, next) => {
  try {
    const validatedData = restockSchema.parse(req.body);
    const updatedComponent = await componentService.restockComponent(
      req.params.id,
      validatedData,
      req.user.id
    );
    res.json({
      success: true,
      message: 'Stok ekleme başarılı.',
      data: updatedComponent,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComponent = async (req, res, next) => {
  try {
    const result = await componentService.deleteComponent(req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getComponentStats = async (req, res, next) => {
  try {
    const data = await componentService.getComponentStats();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportComponents = async (req, res, next) => {
  try {
    const { categoryId, q } = req.query;
    await componentService.exportComponents({ categoryId, q }, res);
  } catch (error) {
    next(error);
  }
};


