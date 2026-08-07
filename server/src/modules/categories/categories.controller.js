import { createCategorySchema } from './categories.schema.js';
import * as categoriesService from './categories.service.js';

export const getCategories = async (req, res, next) => {
  try {
    const { parentType } = req.query;
    const data = await categoriesService.listCategories(parentType);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const parsed = createCategorySchema.parse(req.body);
    const data = await categoriesService.createCategory(parsed.parentType, parsed.name);
    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Geçersiz veri.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await categoriesService.deleteCategory(id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
