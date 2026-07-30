export const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkisiz erişim.' });
    }

    const userRole = req.user.role?.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.',
      });
    }

    next();
  };
};
