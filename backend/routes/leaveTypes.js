const express = require('express');
const router = express.Router();
const LeaveType = require('../models/LeaveType');
const CompanyLeaveType = require('../models/CompanyLeaveType');
const LeaveSubType = require('../models/LeaveSubType');
const { auth, requireRole } = require('../middleware/auth');
const WorkingPermit = require("../models/WorkingPermit");
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// ========== GLOBAL LEAVE TYPES (Super Admin Only) ==========

// Get all global leave types
router.get('/global', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({ isActive: true })
      .sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, data: leaveTypes });
  } catch (error) {
    return serverError(res, error);
  }
});

// Create global leave type (super admin only)
router.post('/global', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, description, code, defaultDays, isOtherCategory } = req.body;

    if (!name || name.trim() === '') {
      return errorResponse(res, { message: 'İzin türü adı gereklidir' });
    }

    const leaveType = new LeaveType({
      name: name.trim(),
      description: description?.trim() || null,
      code: code?.trim() || null,
      defaultDays: defaultDays || 0,
      isDefault: false, // Yeni eklenenler default değil
      isOtherCategory: isOtherCategory || false,
      isActive: true
    });

    await leaveType.save();
    res.status(201).json({ success: true, data: leaveType });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, { message: 'Bu kod veya isim zaten kullanılıyor' });
    }
    return serverError(res, error);
  }
});

// ========== COMPANY LEAVE TYPES ==========

// Get company leave types
router.get('/', auth, async (req, res) => {
  try {
    let companyId = req.query.companyId;

    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin için companyId zorunlu
      if (!companyId) {
        return errorResponse(res, { message: 'Lütfen işlem yapmak istediğiniz şirketi seçiniz.' });
      }
      // Bayi admin'in bu şirkete erişimi var mı kontrol et
      const Company = require('../models/Company');
      const companyDoc = await Company.findById(companyId);
      if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu şirket için yetkiniz yok.');
      }
    }

    if (!companyId) {
      return errorResponse(res, { message: 'Şirket ID gereklidir' });
    }

    const companyLeaveTypes = await WorkingPermit.find({
      $or: [
        { company: companyId },
        { isDefault: true }
      ],
      active: true,
    })
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, data: companyLeaveTypes });
  } catch (error) {
    return serverError(res, error);
  }
});

// Create company-specific leave type
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, description, customDays, isOtherCategory, parentLeaveType, companies, applyToAll } = req.body;

    if (!name || name.trim() === '') {
      return errorResponse(res, { message: 'İzin türü adı gereklidir' });
    }

    let targetCompanies = [];
    let createdByBayiId = null;

    // Bayi admin kontrolü
    if (req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      createdByBayiId = req.user.dealer;

      // Tüm şirketlere uygula
      if (applyToAll) {
        const Company = require('../models/Company');
        const allCompanies = await Company.find({ dealer: req.user.dealer });
        targetCompanies = allCompanies.map(c => c._id);
      } else if (companies && Array.isArray(companies) && companies.length > 0) {
        // Seçilen şirketlere uygula
        const Company = require('../models/Company');
        // Bayi'nin şirketlerini kontrol et
        const dealerCompanies = await Company.find({ dealer: req.user.dealer });
        const dealerCompanyIds = dealerCompanies.map(c => c._id.toString());
        
        // Seçilen şirketlerin bayi'ye ait olduğunu doğrula
        for (const companyId of companies) {
          if (!dealerCompanyIds.includes(companyId.toString())) {
            return forbidden(res, `Şirket ID ${companyId} bu bayi'ye ait değil`);
          }
        }
        targetCompanies = companies;
      } else {
        return errorResponse(res, { message: 'Lütfen işlem yapmak istediğiniz şirketi seçiniz.' });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // Şirket admini sadece kendi şirketine ekleyebilir
      targetCompanies = [req.user.company];
    } else if (req.user.role.name === 'super_admin') {
      // Super admin için companyId query'den alınır veya body'den
      const companyId = req.query.companyId || req.body.companyId;
      if (!companyId) {
        return errorResponse(res, { message: 'Şirket ID gereklidir' });
      }
      targetCompanies = [companyId];
    }

    if (targetCompanies.length === 0) {
      return errorResponse(res, { message: 'En az bir şirket seçilmelidir' });
    }

    // Eğer alt kategori ekleniyorsa
    if (parentLeaveType) {
      const parentDoc = await CompanyLeaveType.findById(parentLeaveType);
      if (!parentDoc) {
        return notFound(res, 'Üst izin türü bulunamadı');
      }

      const createdSubTypes = [];
      for (const companyId of targetCompanies) {
        // Üst izin türünün bu şirkete ait olduğunu kontrol et
        if (parentDoc.company.toString() !== companyId.toString()) {
          continue; // Bu şirket için atla
        }

        const existingSubType = await LeaveSubType.findOne({ 
          name: name.trim(), 
          parentLeaveType, 
          company: companyId 
        });
        
        if (!existingSubType) {
          const newSubType = await LeaveSubType.create({
            name: name.trim(),
            description: description?.trim() || null,
            parentLeaveType,
            company: companyId,
            isDefault: false,
            createdByBayiId
          });
          createdSubTypes.push(newSubType);
        }
      }

      if (createdSubTypes.length === 0) {
        return errorResponse(res, { message: 'Bu alt izin türü seçilen şirket(ler)de zaten mevcut veya üst izin türü bu şirket(ler)e ait değil.' });
      }

      return res.status(201).json({ 
        success: true, 
        message: `"${name}" başarıyla seçilen şirket(ler)e eklenmiştir.`,
        data: createdSubTypes 
      });
    } else {
      // Ana izin türü ekleniyorsa
      const createdLeaveTypes = [];
      for (const companyId of targetCompanies) {
        const existingCompanyType = await CompanyLeaveType.findOne({ 
          name: name.trim(), 
          company: companyId 
        });
        
        if (!existingCompanyType) {
          const newCompanyLeaveType = await CompanyLeaveType.create({
            company: companyId,
            leaveType: null, // Şirket özel, global referans yok
            name: name.trim(),
            description: description?.trim() || null,
            isActive: true,
            customDays: customDays || null,
            isDefault: false, // Şirket özel
            isOtherCategory: isOtherCategory || false,
            createdByBayiId
          });
          createdLeaveTypes.push(newCompanyLeaveType);
        }
      }

      if (createdLeaveTypes.length === 0) {
        return errorResponse(res, { message: 'Bu izin türü seçilen şirket(ler)de zaten mevcut.' });
      }

      return res.status(201).json({ 
        success: true, 
        message: `"${name}" başarıyla seçilen şirket(ler)e eklenmiştir.`,
        data: createdLeaveTypes 
      });
    }
  } catch (error) {
    return serverError(res, error);
  }
});

// Update company leave type
router.put('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const companyLeaveType = await CompanyLeaveType.findById(req.params.id);
    if (!companyLeaveType) {
      return notFound(res, 'İzin türü bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== companyLeaveType.company.toString()) {
      return forbidden(res);
    }

    // Varsayılan izinler değiştirilemez (sadece customDays güncellenebilir)
    if (companyLeaveType.isDefault) {
      if (req.body.name !== undefined || req.body.description !== undefined || req.body.isActive !== undefined) {
        return errorResponse(res, { message: 'Bu izin türü sistem varsayılanıdır. Sadece gün sayısı özelleştirilebilir.' });
      }
    }

    if (req.body.customDays !== undefined) {
      companyLeaveType.customDays = req.body.customDays || null;
    }
    if (req.body.name !== undefined && !companyLeaveType.isDefault) {
      companyLeaveType.name = req.body.name.trim();
    }
    if (req.body.description !== undefined && !companyLeaveType.isDefault) {
      companyLeaveType.description = req.body.description?.trim() || null;
    }
    if (req.body.isActive !== undefined && !companyLeaveType.isDefault) {
      companyLeaveType.isActive = req.body.isActive;
    }

    await companyLeaveType.save();

    const populated = await CompanyLeaveType.findById(companyLeaveType._id)
      .populate('leaveType', 'name description defaultDays code');

    res.json({ success: true, data: populated });
  } catch (error) {
    return serverError(res, error);
  }
});

// Delete company leave type
router.delete('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const companyLeaveType = await CompanyLeaveType.findById(req.params.id);
    if (!companyLeaveType) {
      return notFound(res, 'İzin türü bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== companyLeaveType.company.toString()) {
      return forbidden(res);
    }

    // Varsayılan izinler silinemez
    if (companyLeaveType.isDefault) {
      return errorResponse(res, { message: 'Bu izin türü sistem varsayılanıdır ve silinemez.' });
    }

    await CompanyLeaveType.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'İzin türü silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== LEAVE SUB TYPES ==========

// Get all leave sub types (for "Diğer" category)
router.get('/sub-types', auth, async (req, res) => {
  try {
    let query = {};
    
    // Company ID filter
    if (req.query.companyId) {
      query.company = req.query.companyId;
    } else if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      query.company = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin için companyId query'den gelmeli
      if (!req.query.companyId) {
        return errorResponse(res, { message: 'companyId gerekli' });
      }
      query.company = req.query.companyId;
    }
    
    // Parent leave type filter
    if (req.query.parentLeaveType) {
      query.parentLeaveType = req.query.parentLeaveType;
    }
    
    const subTypes = await LeaveSubType.find(query)
      .populate('parentLeaveType', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subTypes });
  } catch (error) {
    return serverError(res, error);
  }
});

// Test endpoint: Check if company has leave types
router.get('/check/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Check global leave types
    const globalCount = await LeaveType.countDocuments({ isDefault: true, isActive: true });
    
    // Check company leave types
    const companyCount = await CompanyLeaveType.countDocuments({ 
      company: companyId,
      isActive: true 
    });
    
    // Check if company exists
    const Company = require('../models/Company');
    const company = await Company.findById(companyId);
    
    res.json({
      success: true,
      data: {
        companyExists: !!company,
        globalLeaveTypesCount: globalCount,
        companyLeaveTypesCount: companyCount,
        companyId: companyId
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Initialize leave types for a company (admin only)
router.post('/initialize/:companyId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Check access
    if (req.user.role.name === 'bayi_admin') {
      const Company = require('../models/Company');
      const company = await Company.findById(companyId);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu şirket için yetkiniz yok.');
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== companyId) {
      return forbidden(res);
    }

    const { initializeCompanyLeaveTypes } = require('../services/leaveTypeInitializer');
    await initializeCompanyLeaveTypes(companyId);
    
    res.json({ 
      success: true, 
      message: 'Şirket izin türleri başarıyla oluşturuldu' 
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

