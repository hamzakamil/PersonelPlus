const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const RolePermission = require('../models/RolePermission');
const Permission = require('../models/Permission');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { successResponse, errorResponse, notFound, forbidden, serverError, createdResponse } = require('../utils/responseHelper');

// Tüm rolleri listele
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    let userDealer = null;

    // Super admin tüm rolleri görür
    if (req.user.role.name === 'super_admin') {
      // Tüm rolleri getir
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin: Sistem rolleri (dealer: null) ve kendi bayisine ait rolleri görür
      userDealer = req.user.dealer;
      query = {
        $or: [
          { isSystemRole: true, dealer: null }, // Sistem rolleri (global)
          { dealer: userDealer } // Kendi bayisine ait tüm roller
        ]
      };
    } else if (req.user.role.name === 'company_admin') {
      // Company admin: Sistem rolleri (dealer: null) ve kendi bayisine ait tüm şirketlerin rolleri
      // Önce kullanıcının şirketinden bayi bilgisini al
      const userCompany = await Company.findById(req.user.company);
      if (!userCompany || !userCompany.dealer) {
        return forbidden(res, 'Şirket veya bayi bilgisi bulunamadı');
      }
      userDealer = userCompany.dealer;

      query = {
        $or: [
          { isSystemRole: true, dealer: null }, // Sistem rolleri (global)
          { dealer: userDealer } // Kendi bayisine ait tüm roller (tüm şirketler dahil)
        ]
      };
    } else {
      // Diğer kullanıcılar sadece sistem rolleri (global) görür
      query = { isSystemRole: true, dealer: null };
    }

    const roles = await Role.find(query)
      .populate('dealer', 'name')
      .populate('company', 'name')
      .populate('createdBy', 'email')
      // Priority bazlı sıralama: Düşük priority = daha yetkili (önce -1, sonra küçükten büyüğe)
      // Priority null olanlar en sonda
      .sort({
        priority: 1, // -1 en önce, sonra küçükten büyüğe
        isSystemRole: -1,
        name: 1
      });

    return successResponse(res, { data: roles });
  } catch (error) {
    return serverError(res, error);
  }
});

// Rol detayını getir (yetkileriyle birlikte)
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('dealer', 'name')
      .populate('company', 'name')
      .populate('createdBy', 'email');

    if (!role) {
      return notFound(res, 'Rol bulunamadı');
    }

    // Bayi bazlı görünürlük kontrolü
    if (req.user.role.name === 'super_admin') {
      // Super admin tüm rolleri görebilir
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin: Sistem rolleri (dealer: null) veya kendi bayisine ait rolleri görebilir
      if (role.isSystemRole && role.dealer === null) {
        // Sistem rolü (global), görülebilir
      } else if (role.dealer?.toString() === req.user.dealer?.toString()) {
        // Kendi bayisine ait rol, görülebilir
      } else {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'company_admin') {
      // Company admin: Sistem rolleri (dealer: null) veya kendi bayisine ait tüm rolleri görebilir
      // Önce kullanıcının şirketinden bayi bilgisini al
      const userCompany = await Company.findById(req.user.company);
      if (!userCompany || !userCompany.dealer) {
        return forbidden(res, 'Şirket veya bayi bilgisi bulunamadı');
      }
      
      if (role.isSystemRole && role.dealer === null) {
        // Sistem rolü (global), görülebilir
      } else if (role.dealer?.toString() === userCompany.dealer.toString()) {
        // Kendi bayisine ait rol (hangi şirkete ait olursa olsun), görülebilir
      } else {
        return forbidden(res);
      }
    } else {
      // Diğer kullanıcılar sadece sistem rolleri (global) görebilir
      if (!role.isSystemRole || role.dealer !== null) {
        return forbidden(res);
      }
    }

    // Role atanmış yetkileri getir
    const rolePermissions = await RolePermission.find({ role: role._id })
      .populate('permission')
      .populate('companies', 'name')
      .populate('assignedBy', 'email');

    res.json({ 
      success: true, 
      data: {
        role,
        permissions: rolePermissions.map(rp => ({
          id: rp._id,
          permission: rp.permission,
          companies: rp.companies,
          assignedBy: rp.assignedBy
        }))
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Yeni rol oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, dealer, company, priority } = req.body;

    if (!name || !description) {
      return errorResponse(res, { message: 'Rol adı ve açıklama gereklidir' });
    }

    // Priority kontrolü: -1 sadece super_admin tarafından atanabilir
    if (priority === -1 && req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Süper yetki seviyesi (-1) sadece super_admin tarafından atanabilir');
    }

    // Super admin her rolü oluşturabilir
    // Bayi admin sadece kendi bayiine özel roller oluşturabilir
    // Company admin sadece kendi bayisine özel roller oluşturabilir (kendi şirketine veya aynı bayinin diğer şirketlerine)
    let finalCompany = null;
    let finalDealer = null;
    let finalPriority = priority !== undefined ? priority : null;

    if (req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      finalDealer = req.user.dealer;
      
      // Şirket belirtilmişse, bayi kontrolü yap
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer?.toString() !== req.user.dealer?.toString()) {
          return forbidden(res, 'Bu şirkete rol oluşturma yetkiniz yok');
        }
        finalCompany = company;
      }
    } else if (req.user.role.name === 'company_admin') {
      if (!req.user.company) {
        return forbidden(res, 'Şirket bilgisi bulunamadı');
      }
      // Company admin: Kendi bayisine ait şirketlere rol oluşturabilir
      const userCompany = await Company.findById(req.user.company);
      if (!userCompany || !userCompany.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      finalDealer = userCompany.dealer;
      
      // Şirket belirtilmişse, aynı bayi kontrolü yap
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer?.toString() !== finalDealer.toString()) {
          return forbidden(res, 'Bu şirkete rol oluşturma yetkiniz yok');
        }
        finalCompany = company;
      } else {
        // Şirket belirtilmemişse, kullanıcının şirketini kullan
        finalCompany = req.user.company;
      }
      
      // Priority belirtilmişse kontrol et (company admin -1 atayamaz)
      if (finalPriority === -1) {
        return forbidden(res, 'Süper yetki seviyesi atayamazsınız');
      }
    } else if (req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Rol oluşturma yetkiniz yok');
    } else {
      // Super admin
      finalDealer = dealer || null;
      finalCompany = company || null;
    }

    const role = new Role({
      name,
      description,
      isSystemRole: req.user.role.name === 'super_admin' && !dealer && !company,
      priority: finalPriority,
      company: finalCompany,
      dealer: finalDealer,
      createdBy: req.user._id
    });

    await role.save();
    return createdResponse(res, { data: role });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, { message: 'Bu rol adı zaten kullanılıyor' });
    }
    return serverError(res, error);
  }
});

// Rol güncelle
router.put('/:id', auth, async (req, res) => {
  try {
    const { description, priority } = req.body;

    const role = await Role.findById(req.params.id);

    if (!role) {
      return notFound(res, 'Rol bulunamadı');
    }

    // Priority -1 olan roller değiştirilemez (süper yetki seviyesi)
    if (role.priority === -1) {
      return forbidden(res, 'Süper yetki seviyesi (-1) olan roller değiştirilemez');
    }

    // Sistem rolleri sadece super_admin tarafından güncellenebilir
    if (role.isSystemRole && req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Sistem rolleri güncellenemez');
    }

    // Bayi bazlı yetki kontrolü
    if (req.user.role.name === 'bayi_admin') {
      // Bayi admin: Sistem rolleri (dealer: null) veya kendi bayisine ait rolleri güncelleyebilir
      if (role.isSystemRole && role.dealer === null) {
        // Sistem rolü, sadece super_admin güncelleyebilir (yukarıda kontrol edildi)
      } else if (role.dealer?.toString() !== req.user.dealer?.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'company_admin') {
      // Company admin: Kendi bayisine ait rolleri güncelleyebilir
      const userCompany = await Company.findById(req.user.company);
      if (!userCompany || !userCompany.dealer) {
        return forbidden(res, 'Şirket veya bayi bilgisi bulunamadı');
      }
      
      if (role.isSystemRole && role.dealer === null) {
        // Sistem rolü, sadece super_admin güncelleyebilir (yukarıda kontrol edildi)
      } else if (role.dealer?.toString() !== userCompany.dealer.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name !== 'super_admin') {
      return forbidden(res);
    }

    // Priority güncelleme kontrolü
    if (priority !== undefined) {
      // -1 sadece super_admin tarafından atanabilir
      if (priority === -1 && req.user.role.name !== 'super_admin') {
        return forbidden(res, 'Süper yetki seviyesi (-1) sadece super_admin tarafından atanabilir');
      }
      role.priority = priority;
    }

    role.description = description || role.description;
    await role.save();

    return successResponse(res, { data: role });
  } catch (error) {
    return serverError(res, error);
  }
});

// Rol sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return notFound(res, 'Rol bulunamadı');
    }

    // Sistem rolleri silinemez
    if (role.isSystemRole) {
      return forbidden(res, 'Sistem rolleri silinemez');
    }

    // Priority -1 olan roller silinemez
    if (role.priority === -1) {
      return forbidden(res, 'Süper yetki seviyesi (-1) olan roller silinemez');
    }

    // Bayi bazlı yetki kontrolü
    if (req.user.role.name === 'bayi_admin') {
      // Bayi admin: Sistem rolleri (dealer: null) silinemez, kendi bayisine ait rolleri silebilir
      if (role.dealer?.toString() !== req.user.dealer?.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'company_admin') {
      // Company admin: Kendi bayisine ait rolleri silebilir
      const userCompany = await Company.findById(req.user.company);
      if (!userCompany || !userCompany.dealer) {
        return forbidden(res, 'Şirket veya bayi bilgisi bulunamadı');
      }
      
      if (role.dealer?.toString() !== userCompany.dealer.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name !== 'super_admin') {
      return forbidden(res);
    }

    // Bu role sahip kullanıcı var mı kontrol et
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return errorResponse(res, { message: 'Bu role sahip kullanıcılar var. Önce kullanıcıların rolleri değiştirilmelidir.' });
    }

    // İlişkili RolePermission kayıtlarını sil
    await RolePermission.deleteMany({ role: role._id });

    await role.deleteOne();
    return successResponse(res, { message: 'Rol silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Role yetki ata/kaldır
// Bayi Admin: Kendi bayisine bağlı şirketlerin kullanıcılarının rolleri için yetki atayabilir
// Company Admin: Kendi şirketine bağlı kullanıcıların rolleri için yetki atayabilir
router.post('/:id/permissions', auth, async (req, res) => {
  try {
    const { permissionId, action, companies } = req.body; // action: 'add' veya 'remove'

    const role = await Role.findById(req.params.id);
    if (!role) {
      return notFound(res, 'Rol bulunamadı');
    }

    const userRole = req.user.role.name;

    if (role.isSystemRole && userRole !== 'super_admin') {
      return forbidden(res, 'Sistem Rolleri Değiştirilemez!')
    }
    // Yetki kontrolü
    if (role.isSystemRole && userRole !== 'super_admin') {
      // Sistem rolleri için: Bayi admin ve company admin kendi kullanıcıları için yetki atayabilir
      if (userRole === 'bayi_admin') {
        // Bayi admin: Kendi bayisine bağlı şirketlerin kullanıcıları için yetki atayabilir
        // Şirket kontrolü companies array'inde yapılacak
      } else if (userRole === 'company_admin') {
        // Company admin: Sadece kendi şirketine bağlı kullanıcılar için yetki atayabilir
        if (!req.user.company) {
          return forbidden(res, 'Şirket bilgisi bulunamadı');
        }
        // Company admin sadece kendi şirketini companies array'ine ekleyebilir
        if (companies && companies.length > 0) {
          const userCompanyStr = req.user.company.toString();
          const hasOtherCompanies = companies.some(c => c.toString() !== userCompanyStr);
          if (hasOtherCompanies) {
            return forbidden(res, 'Sadece kendi şirketinize yetki atayabilirsiniz');
          }
        }
      } else {
        return forbidden(res, 'Sistem rolleri sadece super_admin, bayi_admin veya company_admin tarafından yönetilebilir');
      }
    } else {
      // Özel roller için
      if (userRole === 'bayi_admin') {
        if (role.dealer?.toString() !== req.user.dealer?.toString()) {
          return forbidden(res);
        }
      } else if (userRole !== 'super_admin') {
        return forbidden(res);
      }
    }

    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return notFound(res, 'Yetki bulunamadı');
    }

    if (action === 'add') {
      // Bayi admin ve company admin için şirket bazlı yetki ataması
      let finalCompanies = companies || [];
      
      // Company admin sadece kendi şirketini atayabilir
      if (userRole === 'company_admin') {
        if (!req.user.company) {
          return forbidden(res, 'Şirket bilgisi bulunamadı');
        }
        finalCompanies = [req.user.company];
      } else if (userRole === 'bayi_admin' && companies && companies.length > 0) {
        // Bayi admin sadece kendi bayisine ait şirketleri atayabilir
        const Company = require('../models/Company');
        const validCompanies = await Company.find({ 
          _id: { $in: companies },
          dealer: req.user.dealer 
        });
        finalCompanies = validCompanies.map(c => c._id);
      }
      
      const rolePermissionData = {
        role: role._id,
        permission: permission._id,
        assignedBy: (userRole === 'bayi_admin' || userRole === 'company_admin') ? req.user._id : null,
        companies: finalCompanies
      };

      // Aynı kombinasyon varsa güncelle, yoksa oluştur
      await RolePermission.findOneAndUpdate(
        { role: role._id, permission: permission._id, assignedBy: rolePermissionData.assignedBy },
        rolePermissionData,
        { upsert: true, new: true }
      );
    } else if (action === 'remove') {
      // Yetki kaldırma: Sadece atayan kişi veya super_admin kaldırabilir
      const deleteQuery = {
        role: role._id,
        permission: permission._id
      };
      
      // Eğer bayi_admin veya company_admin tarafından atanmışsa, sadece onlar kaldırabilir
      if (userRole === 'bayi_admin' || userRole === 'company_admin') {
        deleteQuery.assignedBy = req.user._id;
      } else if (userRole !== 'super_admin') {
        return forbidden(res, 'Yetkiniz yok');
      }
      
      await RolePermission.deleteOne(deleteQuery);
    }

    res.json({ success: true, message: `Yetki ${action === 'add' ? 'atandı' : 'kaldırıldı'}` });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

