const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Dealer = require('../models/Dealer');
const User = require('../models/User');
const Role = require('../models/Role');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const quotaService = require('../services/quotaService');
const {
  successResponse,
  errorResponse,
  notFound,
  forbidden,
  serverError,
  createdResponse,
} = require('../utils/responseHelper');

// Get all dealers (only super_admin)
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const dealers = await Dealer.find().sort({ createdAt: -1 });
    return successResponse(res, { data: dealers });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get single dealer
router.get('/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    // Check if user has access (dealer is populated object)
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    if (req.user.role.name === 'bayi_admin' && userDealerId !== req.params.id) {
      return forbidden(res);
    }

    return successResponse(res, { data: dealer });
  } catch (error) {
    return serverError(res, error);
  }
});

// Create dealer (only super_admin)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      contactEmail,
      contactPhone,
      contactPerson,
      address,
      city,
      zipCode,
      taxNumber,
      maxCompanies,
      startDate,
      endDate,
      email,
      password,
    } = req.body;

    const dealer = new Dealer({
      name,
      contactEmail,
      contactPhone,
      contactPerson,
      address,
      city,
      zipCode,
      taxNumber,
      maxCompanies:
        maxCompanies !== undefined && maxCompanies !== null && maxCompanies !== ''
          ? parseInt(maxCompanies)
          : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
    });
    await dealer.save();

    // Bayinin kendi şirketini oluştur (çalışanları için)
    const selfCompany = new Company({
      name: `${name} (Kendi Şirketim)`,
      dealer: dealer._id,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      address: address,
      isDealerSelfCompany: true,
      isActive: true,
      isActivated: true,
      activatedAt: new Date(),
    });
    await selfCompany.save();

    // Varsayılan Merkez işyeri oluştur
    const Workplace = require('../models/Workplace');
    const defaultWorkplace = new Workplace({
      name: 'Merkez',
      company: selfCompany._id,
      isDefault: true,
      isActive: true,
    });
    await defaultWorkplace.save();

    // Dealer'a selfCompany referansını ekle
    dealer.selfCompany = selfCompany._id;
    await dealer.save();

    // Create bayi_admin user
    const role = await Role.findOne({ name: 'bayi_admin' });
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      role: role._id,
      dealer: dealer._id,
    });
    await user.save();

    return createdResponse(res, { data: dealer, message: 'Bayi oluşturuldu' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update dealer
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    // Check if user has access (dealer is populated object)
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    if (req.user.role.name === 'bayi_admin' && userDealerId !== req.params.id) {
      return forbidden(res);
    }

    // Update fields (maxCompanies can be set to null for unlimited)
    const {
      name,
      contactEmail,
      contactPhone,
      contactPerson,
      address,
      city,
      zipCode,
      taxNumber,
      maxCompanies,
      startDate,
      endDate,
      ikDisplayName,
    } = req.body;

    if (name !== undefined) dealer.name = name;
    if (contactEmail !== undefined) dealer.contactEmail = contactEmail;
    if (contactPhone !== undefined) dealer.contactPhone = contactPhone;
    if (contactPerson !== undefined) dealer.contactPerson = contactPerson;
    if (address !== undefined) dealer.address = address;
    if (city !== undefined) dealer.city = city;
    if (zipCode !== undefined) dealer.zipCode = zipCode;
    if (taxNumber !== undefined) dealer.taxNumber = taxNumber;
    if (maxCompanies !== undefined) {
      dealer.maxCompanies =
        maxCompanies !== null && maxCompanies !== '' ? parseInt(maxCompanies) : null;
    }
    if (startDate !== undefined) dealer.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dealer.endDate = endDate ? new Date(endDate) : null;
    if (ikDisplayName !== undefined) {
      dealer.ikDisplayName = ikDisplayName || null;
    }

    await dealer.save();

    return successResponse(res, { data: dealer, message: 'Bayi güncellendi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Promote company to dealer (only super_admin)
router.post('/promote-from-company', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { companyId, startDate, endDate, maxCompanies } = req.body;

    if (!companyId) {
      return errorResponse(res, 'Şirket ID gereklidir', 400);
    }

    // 1. Şirketi bul
    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // 2. Zaten selfCompany ise reddet
    if (company.isDealerSelfCompany) {
      return errorResponse(res, 'Bu şirket zaten bir bayinin kendi şirketi olarak tanımlı', 400);
    }

    // 3. Şirketin company_admin kullanıcısını bul
    const companyAdminRole = await Role.findOne({ name: 'company_admin' });
    const companyAdminUser = await User.findOne({
      company: company._id,
      role: companyAdminRole._id,
      isActive: true,
    });

    if (!companyAdminUser) {
      return errorResponse(
        res,
        'Bu şirket için aktif bir company_admin kullanıcısı bulunamadı',
        400
      );
    }

    // 4. bayi_admin rolünü bul
    const bayiAdminRole = await Role.findOne({ name: 'bayi_admin' });
    if (!bayiAdminRole) {
      return serverError(res, new Error('bayi_admin rolü bulunamadı'));
    }

    // 5. Eski dealer ID'sini sakla (rollback için)
    const originalDealerId = company.dealer;

    // 6. Yeni Dealer kaydı oluştur
    const dealer = new Dealer({
      name: company.name,
      contactEmail:
        company.authorizedPerson?.email || company.contactEmail || companyAdminUser.email,
      contactPhone: company.authorizedPerson?.phone || company.contactPhone || '',
      contactPerson: company.authorizedPerson?.fullName || '',
      address: company.address || '',
      taxNumber: company.taxNumber || '',
      maxCompanies:
        maxCompanies !== undefined && maxCompanies !== null && maxCompanies !== ''
          ? parseInt(maxCompanies)
          : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
      selfCompany: company._id,
    });
    await dealer.save();

    try {
      // 7. Şirketi güncelle
      company.dealer = dealer._id;
      company.isDealerSelfCompany = true;
      company.isActivated = true;
      if (!company.activatedAt) {
        company.activatedAt = new Date();
      }
      await company.save();

      // 8. Kullanıcıyı güncelle
      companyAdminUser.role = bayiAdminRole._id;
      companyAdminUser.dealer = dealer._id;
      companyAdminUser.company = null;
      await companyAdminUser.save();
    } catch (innerError) {
      // Rollback: dealer'ı sil, şirketi eski haline getir
      try {
        await Dealer.findByIdAndDelete(dealer._id);
        company.dealer = originalDealerId;
        company.isDealerSelfCompany = false;
        await company.save();
      } catch (rollbackError) {
        console.error('Rollback hatası:', rollbackError);
      }
      throw innerError;
    }

    return createdResponse(res, {
      data: {
        dealer,
        company,
        user: { _id: companyAdminUser._id, email: companyAdminUser.email },
      },
      message: 'Şirket başarıyla bayiye yükseltildi',
    });
  } catch (error) {
    return serverError(res, error, 'Bayiye yükseltme sırasında bir hata oluştu');
  }
});

// Delete dealer (only super_admin)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    await Dealer.findByIdAndDelete(req.params.id);
    return successResponse(res, { message: 'Bayi silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// ==================== KOTA YÖNETİMİ ====================

// GET /api/dealers/:id/quota - Bayi kota durumu
router.get('/:id/quota', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' && req.user.dealer?.toString() !== id) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    const quotaSummary = await quotaService.getDealerQuotaSummary(id);

    return successResponse(res, { data: quotaSummary });
  } catch (error) {
    console.error('Kota durumu hatası:', error);
    return serverError(res, error, 'Kota bilgisi yüklenirken bir hata oluştu');
  }
});

// POST /api/dealers/:id/quota/sync - Kota senkronizasyonu (super_admin veya bayi_admin)
router.post('/:id/quota/sync', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' && req.user.dealer?.toString() !== id) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Bayi kotasını senkronize et
    const actualCount = await quotaService.syncDealerQuota(id);

    // Tüm şirket kotalarını senkronize et
    await quotaService.syncAllCompanyQuotas(id);

    return successResponse(res, {
      data: { usedQuota: actualCount },
      message: 'Kota senkronizasyonu tamamlandı',
    });
  } catch (error) {
    console.error('Kota senkronizasyonu hatası:', error);
    return serverError(res, error, 'Kota senkronizasyonu sırasında bir hata oluştu');
  }
});

// POST /api/dealers/:id/companies/:companyId/quota - Şirkete kota ata (bayi_admin)
router.post(
  '/:id/companies/:companyId/quota',
  auth,
  requireRole('bayi_admin', 'super_admin'),
  async (req, res) => {
    try {
      const { id, companyId } = req.params;
      const { quota, isUnlimited } = req.body;

      // Yetki kontrolü
      if (req.user.role.name === 'bayi_admin' && req.user.dealer?.toString() !== id) {
        return forbidden(res, 'Bu işlem için yetkiniz yok');
      }

      // Sınırsız kota ataması
      if (isUnlimited) {
        await Company.findByIdAndUpdate(companyId, {
          'quota.isUnlimited': true,
          'quota.allocated': 0,
        });

        return successResponse(res, { message: 'Şirkete sınırsız kota atandı' });
      }

      if (quota === undefined || quota < 0) {
        return errorResponse(res, { message: 'Geçerli bir kota değeri giriniz' });
      }

      const result = await quotaService.allocateQuotaToCompany(companyId, quota, id);

      return successResponse(res, { data: result, message: 'Kota başarıyla atandı' });
    } catch (error) {
      console.error('Kota atama hatası:', error);
      return serverError(res, error, 'Kota atanırken bir hata oluştu');
    }
  }
);

// GET /api/dealers/:id/companies/quotas - Tüm şirketlerin kota durumu
router.get('/:id/companies/quotas', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' && req.user.dealer?.toString() !== id) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    const companies = await Company.find({ dealer: id, isActive: true })
      .select('name quota isActive')
      .sort({ name: 1 });

    // Her şirketin gerçek kullanımını hesapla
    const companiesWithActualUsage = await Promise.all(
      companies.map(async company => {
        const actualUsed = await quotaService.calculateCompanyUsedQuota(company._id);
        return {
          _id: company._id,
          name: company.name,
          allocated: company.quota?.allocated || 0,
          used: actualUsed,
          isUnlimited: company.quota?.isUnlimited || false,
          percentage: company.quota?.allocated
            ? Math.round((actualUsed / company.quota.allocated) * 100)
            : 0,
        };
      })
    );

    return successResponse(res, { data: companiesWithActualUsage });
  } catch (error) {
    console.error('Şirket kotaları hatası:', error);
    return serverError(res, error, 'Şirket kotaları yüklenirken bir hata oluştu');
  }
});

// GET /api/dealers/my/quota - Kendi kota durumum (bayi_admin)
router.get('/my/quota', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const dealerId = req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    const quotaSummary = await quotaService.getDealerQuotaSummary(dealerId);

    return successResponse(res, { data: quotaSummary });
  } catch (error) {
    console.error('Kota durumu hatası:', error);
    return serverError(res, error, 'Kota bilgisi yüklenirken bir hata oluştu');
  }
});

// POST /api/dealers/:id/quota/check - Kota kontrolü (işe giriş öncesi)
router.post('/:id/quota/check', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' && req.user.dealer?.toString() !== id) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Önce şirket kotasını kontrol et
    if (companyId) {
      const companyQuota = await quotaService.checkCompanyQuota(companyId);
      return successResponse(res, { data: companyQuota });
    }

    // Bayi kotasını kontrol et
    const dealerQuota = await quotaService.checkDealerQuota(id);

    return successResponse(res, { data: dealerQuota });
  } catch (error) {
    console.error('Kota kontrolü hatası:', error);
    return serverError(res, error, 'Kota kontrolü sırasında bir hata oluştu');
  }
});

module.exports = router;
