const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Dealer = require('../models/Dealer');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, forbidden, serverError, createdResponse } = require('../utils/responseHelper');

/**
 * Rol hiyerarşisi kontrolü
 * Kullanıcı sadece kendinden düşük seviyedeki rollere işlem yapabilir
 *
 * Hiyerarşi:
 * - super_admin (1): En üst yetki
 * - bayi_admin (2): Bayi yöneticisi
 * - bayi_yetkilisi (3): Bayi admin'in alt kullanıcısı
 * - resmi_muhasebe_ik (3): Bayi admin'in alt kullanıcısı (bayi seviyesinde çalışır)
 * - company_admin (4): Şirket yöneticisi
 * - employee (5): Çalışan
 */
const getRoleHierarchy = () => {
  return {
    'super_admin': 1,
    'bayi_admin': 2,
    'bayi_yetkilisi': 3,
    'resmi_muhasebe_ik': 3, // bayi_admin'in alt kullanıcısı, bayi seviyesinde çalışır
    'company_admin': 4,
    'employee': 5
  };
};

const canManageRole = (currentUserRole, targetRoleName) => {
  const hierarchy = getRoleHierarchy();
  const currentLevel = hierarchy[currentUserRole] || 999;
  const targetLevel = hierarchy[targetRoleName] || 999;
  
  // Kendinden düşük seviyedeki rollere işlem yapabilir
  return targetLevel > currentLevel;
};

/**
 * Kullanıcı listesi - Rol bazlı filtreleme
 * Super Admin: Tüm kullanıcılar (hierarchical tree)
 * Bayi Admin: Kendi bayiine bağlı kullanıcılar
 * Company Admin: Kendi şirketine bağlı kullanıcılar
 */
router.get('/', auth, async (req, res) => {
  try {
    const { dealerId, companyId, role, search, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role.name;

    let query = {};
    let populateOptions = [
      { path: 'role', select: 'name description' },
      { path: 'dealer', select: 'name' },
      { path: 'company', select: 'name' }
    ];

    // Super Admin: Tüm kullanıcıları görebilir
    if (userRole === 'super_admin') {
      if (dealerId) {
        query.dealer = dealerId;
      }
      if (companyId) {
        query.company = companyId;
      }
      if (role) {
        const roleDoc = await Role.findOne({ name: role });
        if (roleDoc) {
          query.role = roleDoc._id;
        }
      }
    }
    // Bayi Admin: Sadece kendi bayiine bağlı kullanıcıları görebilir
    else if (userRole === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      query.dealer = req.user.dealer;

      if (companyId) {
        // Şirketin bu bayiye ait olduğunu kontrol et
        const company = await Company.findById(companyId);
        if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
          return forbidden(res);
        }
        query.company = companyId;
      }
    }
    // Company Admin: Sadece kendi şirketine bağlı kullanıcıları görebilir
    else if (userRole === 'company_admin') {
      if (!req.user.company) {
        return forbidden(res, 'Şirket bilgisi bulunamadı');
      }
      query.company = req.user.company;
    }
    else {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Arama filtresi
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Sayfalama
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Super Admin için hierarchical yapı
    let hierarchicalData = null;
    if (userRole === 'super_admin' && !dealerId && !companyId) {
      const dealers = await Dealer.find({ isActive: true }).sort({ name: 1 });
      hierarchicalData = await Promise.all(
        dealers.map(async (dealer) => {
          const companies = await Company.find({ dealer: dealer._id, isActive: true }).sort({ name: 1 });
          const dealerUsers = await User.find({ dealer: dealer._id })
            .populate(populateOptions)
            .sort({ createdAt: -1 });
          
          const companyUsers = await Promise.all(
            companies.map(async (company) => {
              const users = await User.find({ company: company._id })
                .populate(populateOptions)
                .sort({ createdAt: -1 });
              return {
                company: {
                  _id: company._id,
                  name: company.name
                },
                users
              };
            })
          );

          return {
            dealer: {
              _id: dealer._id,
              name: dealer.name
            },
            dealerUsers,
            companies: companyUsers
          };
        })
      );
    }

    return successResponse(res, {
      data: users,
      meta: {
        hierarchical: hierarchicalData,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Kullanıcı listesi hatası:', error);
    return serverError(res, error, 'Kullanıcılar yüklenemedi');
  }
});

/**
 * Kullanıcı detayı
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('role', 'name description')
      .populate('dealer', 'name')
      .populate('company', 'name');

    if (!user) {
      return notFound(res, 'Kullanıcı bulunamadı');
    }

    // Erişim kontrolü
    const userRole = req.user.role.name;
    if (userRole === 'bayi_admin') {
      if (!user.dealer || user.dealer._id.toString() !== req.user.dealer.toString()) {
        return forbidden(res);
      }
    } else if (userRole === 'company_admin') {
      if (!user.company || user.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res);
      }
    } else if (userRole !== 'super_admin') {
      return forbidden(res);
    }

    return successResponse(res, { data: user });
  } catch (error) {
    console.error('Kullanıcı detay hatası:', error);
    return serverError(res, error, 'Kullanıcı yüklenemedi');
  }
});

/**
 * Yeni kullanıcı oluştur
 */
router.post('/', auth, async (req, res) => {
  try {
    const { email, password, roleName, dealerId, companyId, isActive = true } = req.body;
    const currentUserRole = req.user.role.name;

    // Erişim kontrolü
    if (!['super_admin', 'bayi_admin', 'company_admin'].includes(currentUserRole)) {
      return forbidden(res, 'Kullanıcı oluşturma yetkiniz yok');
    }

    // Email kontrolü
    if (!email) {
      return errorResponse(res, { message: 'Email gereklidir' });
    }

    // Rol kontrolü
    const targetRole = await Role.findOne({ name: roleName });
    if (!targetRole) {
      return errorResponse(res, { message: 'Geçersiz rol' });
    }

    // Rol hiyerarşisi kontrolü
    if (!canManageRole(currentUserRole, roleName)) {
      return forbidden(res, 'Bu rolü atama yetkiniz yok. Sadece kendinizden düşük seviyedeki rollere işlem yapabilirsiniz.');
    }

    // Bayi/Şirket kontrolü
    let finalDealerId = null;
    let finalCompanyId = null;

    if (currentUserRole === 'super_admin') {
      finalDealerId = dealerId || null;
      finalCompanyId = companyId || null;
    } else if (currentUserRole === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      finalDealerId = req.user.dealer;

      if (companyId) {
        const company = await Company.findById(companyId);
        if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
          return forbidden(res, 'Bu şirket sizin bayinize ait değil');
        }
        finalCompanyId = companyId;
      }
    } else if (currentUserRole === 'company_admin') {
      if (!req.user.company) {
        return forbidden(res, 'Şirket bilgisi bulunamadı');
      }
      finalCompanyId = req.user.company;

      // Company admin sadece employee rolü oluşturabilir
      if (roleName !== 'employee') {
        return forbidden(res, 'Sadece çalışan (employee) rolü oluşturabilirsiniz');
      }
    }

    // Email benzersizlik kontrolü
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return errorResponse(res, { message: 'Bu email adresi zaten kullanılıyor' });
    }

    // Şifre hash'leme
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Kullanıcı oluştur
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: targetRole._id,
      dealer: finalDealerId,
      company: finalCompanyId,
      isActive: isActive !== false
    });

    await user.save();

    // Employee rolü için Employee kaydı oluştur (eğer company varsa)
    if (roleName === 'employee' && finalCompanyId) {
      // Employee kaydı zaten varsa oluşturma (email ile eşleşen)
      const existingEmployee = await Employee.findOne({ 
        email: email.toLowerCase().trim(),
        company: finalCompanyId
      });
      
      if (!existingEmployee) {
        // Employee kaydı oluşturulabilir (isteğe bağlı)
        // Şimdilik sadece User kaydı oluşturuluyor
      }
    }

    const populatedUser = await User.findById(user._id)
      .populate('role', 'name description')
      .populate('dealer', 'name')
      .populate('company', 'name');

    return createdResponse(res, { data: populatedUser, message: 'Kullanıcı başarıyla oluşturuldu' });
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error);
    return serverError(res, error, 'Kullanıcı oluşturulamadı');
  }
});

/**
 * Kullanıcı güncelle
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { roleName, dealerId, companyId, isActive, password } = req.body;
    const currentUserRole = req.user.role.name;

    const user = await User.findById(req.params.id)
      .populate('role', 'name')
      .populate('dealer')
      .populate('company');

    if (!user) {
      return notFound(res, 'Kullanıcı bulunamadı');
    }

    // Erişim kontrolü
    if (currentUserRole === 'bayi_admin') {
      if (!user.dealer || user.dealer._id.toString() !== req.user.dealer.toString()) {
        return forbidden(res);
      }
    } else if (currentUserRole === 'company_admin') {
      if (!user.company || user.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res);
      }
    } else if (currentUserRole !== 'super_admin') {
      return forbidden(res);
    }

    // Rol değişikliği kontrolü
    if (roleName && roleName !== user.role.name) {
      const targetRole = await Role.findOne({ name: roleName });
      if (!targetRole) {
        return errorResponse(res, { message: 'Geçersiz rol' });
      }

      // Rol hiyerarşisi kontrolü
      if (!canManageRole(currentUserRole, roleName)) {
        return forbidden(res, 'Bu rolü atama yetkiniz yok. Sadece kendinizden düşük seviyedeki rollere işlem yapabilirsiniz.');
      }

      user.role = targetRole._id;
    }

    // Bayi/Şirket atama kontrolü
    if (dealerId !== undefined && currentUserRole === 'super_admin') {
      if (dealerId) {
        const dealer = await Dealer.findById(dealerId);
        if (!dealer) {
          return errorResponse(res, { message: 'Bayi bulunamadı' });
        }
        user.dealer = dealerId;
      } else {
        user.dealer = null;
      }
    }

    if (companyId !== undefined) {
      if (currentUserRole === 'super_admin') {
        if (companyId) {
          const company = await Company.findById(companyId);
          if (!company) {
            return errorResponse(res, { message: 'Şirket bulunamadı' });
          }
          user.company = companyId;
        } else {
          user.company = null;
        }
      } else if (currentUserRole === 'bayi_admin') {
        if (companyId) {
          const company = await Company.findById(companyId);
          if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
            return forbidden(res, 'Bu şirket sizin bayinize ait değil');
          }
          user.company = companyId;
        } else {
          user.company = null;
        }
      } else if (currentUserRole === 'company_admin') {
        // Company admin sadece kendi şirketini atayabilir
        user.company = req.user.company;
      }
    }

    // Aktif/Pasif durumu
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    // Şifre değişikliği
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.mustChangePassword = false;
    }

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('role', 'name description')
      .populate('dealer', 'name')
      .populate('company', 'name');

    return successResponse(res, { data: populatedUser, message: 'Kullanıcı başarıyla güncellendi' });
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    return serverError(res, error, 'Kullanıcı güncellenemedi');
  }
});

/**
 * Kullanıcı sil
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const currentUserRole = req.user.role.name;

    const user = await User.findById(req.params.id)
      .populate('role', 'name')
      .populate('dealer')
      .populate('company');

    if (!user) {
      return notFound(res, 'Kullanıcı bulunamadı');
    }

    // Kendini silme kontrolü
    if (user._id.toString() === req.user._id.toString()) {
      return errorResponse(res, { message: 'Kendi hesabınızı silemezsiniz' });
    }

    // Erişim kontrolü
    if (currentUserRole === 'bayi_admin') {
      if (!user.dealer || user.dealer._id.toString() !== req.user.dealer.toString()) {
        return forbidden(res);
      }
    } else if (currentUserRole === 'company_admin') {
      if (!user.company || user.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res);
      }
    } else if (currentUserRole !== 'super_admin') {
      return forbidden(res);
    }

    // Rol hiyerarşisi kontrolü
    if (!canManageRole(currentUserRole, user.role.name)) {
      return forbidden(res, 'Bu kullanıcıyı silme yetkiniz yok. Sadece kendinizden düşük seviyedeki rollere işlem yapabilirsiniz.');
    }

    await user.deleteOne();

    return successResponse(res, { message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    return serverError(res, error, 'Kullanıcı silinemedi');
  }
});

/**
 * Kullanıcıya rol ve yetki atama
 * Bayi Admin: Kendi bayisine bağlı şirketlerin kullanıcıları için
 * Company Admin: Kendi şirketine bağlı kullanıcılar için
 */
router.post('/:id/assign-role-permissions', auth, async (req, res) => {
  try {
    const { roleId, permissionIds, companies } = req.body;
    const currentUserRole = req.user.role.name;

    const user = await User.findById(req.params.id)
      .populate('role', 'name')
      .populate('dealer')
      .populate('company');

    if (!user) {
      return notFound(res, 'Kullanıcı bulunamadı');
    }

    // Erişim kontrolü
    if (currentUserRole === 'bayi_admin') {
      if (!user.dealer || user.dealer._id.toString() !== req.user.dealer.toString()) {
        return forbidden(res);
      }
    } else if (currentUserRole === 'company_admin') {
      if (!user.company || user.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res);
      }
    } else if (currentUserRole !== 'super_admin') {
      return forbidden(res);
    }

    // Rol atama
    if (roleId) {
      const targetRole = await Role.findById(roleId);
      if (!targetRole) {
        return errorResponse(res, { message: 'Geçersiz rol' });
      }

      // Rol hiyerarşisi kontrolü
      if (!canManageRole(currentUserRole, targetRole.name)) {
        return forbidden(res, 'Bu rolü atama yetkiniz yok');
      }

      user.role = roleId;
      await user.save();
    }

    // Yetki atama (RolePermission üzerinden)
    if (permissionIds && permissionIds.length > 0) {
      const RolePermission = require('../models/RolePermission');
      const userRole = await Role.findById(user.role);
      
      for (const permissionId of permissionIds) {
        const permission = await require('../models/Permission').findById(permissionId);
        if (!permission) continue;

        // Company admin için şirket kontrolü
        let finalCompanies = companies || [];
        if (currentUserRole === 'company_admin') {
          finalCompanies = [req.user.company];
        } else if (currentUserRole === 'bayi_admin' && companies) {
          // Bayi admin sadece kendi bayisine ait şirketleri atayabilir
          const Company = require('../models/Company');
          const validCompanies = await Company.find({ 
            _id: { $in: companies },
            dealer: req.user.dealer 
          });
          finalCompanies = validCompanies.map(c => c._id);
        }

        const rolePermissionData = {
          role: userRole._id,
          permission: permissionId,
          assignedBy: currentUserRole !== 'super_admin' ? req.user._id : null,
          companies: finalCompanies
        };

        await RolePermission.findOneAndUpdate(
          { role: userRole._id, permission: permissionId, assignedBy: rolePermissionData.assignedBy },
          rolePermissionData,
          { upsert: true, new: true }
        );
      }
    }

    const populatedUser = await User.findById(user._id)
      .populate('role', 'name description')
      .populate('dealer', 'name')
      .populate('company', 'name');

    return successResponse(res, { data: populatedUser, message: 'Rol ve yetkiler başarıyla atandı' });
  } catch (error) {
    console.error('Rol ve yetki atama hatası:', error);
    return serverError(res, error, 'Rol ve yetkiler atanamadı');
  }
});

module.exports = router;

