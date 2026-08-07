import * as notificationsService from './notifications.service.js';

export const getNotificationSummary = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationSummary();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
