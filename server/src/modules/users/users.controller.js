import {
  createUserSchema,
  updateUserRoleSchema,
} from './users.schema.js';
import * as userService from './users.service.js';

export const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Kullanıcılar alınırken hata oluştu.' });
  }
};

export const createUser = async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const result = await userService.createUser(validatedData);
    return res.status(201).json({
      status: 'success',
      message: 'Kullanıcı başarıyla oluşturuldu. Geçici şifreyi lütfen kopyalayın.',
      data: result,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Form doğrulama hatası.',
        errors: error.errors.map((e) => e.message),
      });
    }
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserRoleSchema.parse(req.body);
    const updatedUser = await userService.updateUserRole(id, validatedData.role, validatedData.permissions, req.user.id);
    return res.status(200).json({
      status: 'success',
      message: 'Kullanıcı rolü/yetkileri güncellendi.',
      data: updatedUser,
    });
  } catch (error) {

    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Form doğrulama hatası.',
        errors: error.errors.map((e) => e.message),
      });
    }
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.resetPassword(id);
    return res.status(200).json({
      status: 'success',
      message: 'Geçici şifre oluşturuldu. Lütfen kopyalayın.',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id, req.user.id);
    return res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};
