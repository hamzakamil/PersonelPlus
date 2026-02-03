const RolePermission = require('../models/RolePermission');
const Permission = require('../models/Permission');

/**
 * Yetki kontrolü middleware'i
 * Kullanıcının belirtilen yetkiye sahip olup olmadığını kontrol eder
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ message: 'Yetki gerekli' });
      }

      // Super admin her şeye erişebilir
      if (req.user.role.name === 'super_admin') {
        return next();
      }

      // Yetkiyi bul
      const permission = await Permission.findOne({ name: permissionName });

      if (!permission) {
        return res.status(500).json({ message: 'Yetki tanımı bulunamadı' });
      }

      // Kullanıcının rolüne atanmış yetkileri kontrol et
      const rolePermission = await RolePermission.findOne({
        role: req.user.role._id,
        permission: permission._id
      }).populate('permission');

      if (!rolePermission) {
        return res.status(403).json({ 
          message: `Bu işlem için '${permission.description}' yetkisi gereklidir` 
        });
      }

      // Bayi yetkilisi için şirket bazlı kontrol
      if (req.user.role.name === 'bayi_yetkilisi' && rolePermission.companies && rolePermission.companies.length > 0) {
        const userCompany = req.user.company?.toString();
        const allowedCompanies = rolePermission.companies.map(c => c.toString());
        
        if (userCompany && !allowedCompanies.includes(userCompany)) {
          return res.status(403).json({ 
            message: 'Bu işlem için yetkiniz yok' 
          });
        }
      }

      next();
    } catch (error) {
      console.error('Yetki kontrolü hatası:', error);
      res.status(500).json({ message: 'Yetki kontrolü sırasında hata oluştu' });
    }
  };
};

/**
 * Birden fazla yetkiden birine sahip olma kontrolü
 */
const requireAnyPermission = (...permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ message: 'Yetki gerekli' });
      }

      if (req.user.role.name === 'super_admin') {
        return next();
      }

      const permissions = await Permission.find({ name: { $in: permissionNames } });
      if (permissions.length === 0) {
        return res.status(500).json({ message: 'Yetki tanımları bulunamadı' });
      }

      const permissionIds = permissions.map(p => p._id);
      const rolePermission = await RolePermission.findOne({
        role: req.user.role._id,
        permission: { $in: permissionIds }
      });

      if (!rolePermission) {
        return res.status(403).json({ 
          message: 'Bu işlem için yetkiniz yok' 
        });
      }

      next();
    } catch (error) {
      console.error('Yetki kontrolü hatası:', error);
      res.status(500).json({ message: 'Yetki kontrolü sırasında hata oluştu' });
    }
  };
};

/**
 * Kullanıcının yetkilerini döndürür (helper function)
 */
const getUserPermissions = async (userId, roleId) => {
  try {
    const rolePermissions = await RolePermission.find({ role: roleId })
      .populate('permission')
      .populate('companies');

    return rolePermissions.map(rp => ({
      name: rp.permission.name,
      description: rp.permission.description,
      category: rp.permission.category,
      companies: rp.companies || []
    }));
  } catch (error) {
    console.error('Yetki getirme hatası:', error);
    return [];
  }
};

/**
 * Kullanıcının belirtilen yetkiye sahip olup olmadığını kontrol eder (helper function, middleware değil)
 * Super admin her zaman true döner
 */
const hasPermission = async (user, permissionName) => {
  try {
    if (!user || !user.role) {
      return false;
    }

    // Super admin her şeye erişebilir
    if (user.role.name === 'super_admin') {
      return true;
    }

    const permission = await Permission.findOne({ name: permissionName });
    if (!permission) {
      return false;
    }

    const rolePermission = await RolePermission.findOne({
      role: user.role._id,
      permission: permission._id
    });

    return !!rolePermission;
  } catch (error) {
    console.error('Yetki kontrolü hatası:', error);
    return false;
  }
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  getUserPermissions,
  hasPermission
};

