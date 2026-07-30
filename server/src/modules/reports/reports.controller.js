import * as reportsService from './reports.service.js';

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await reportsService.getDashboardStats();
    return res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Dashboard istatistikleri alınırken hata oluştu.',
    });
  }
};
