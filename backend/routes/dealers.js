const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Dealer = require('../models/Dealer');
const User = require('../models/User');
const Role = require('../models/Role');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const quotaService = require('../services/quotaService');
const { normalizePhone, isValidTurkishPhone } = require('../utils/phoneUtils');
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

    // Zorunlu alan kontrolleri
    if (!name || !name.trim()) {
      return errorResponse(res, { message: 'Bayi adı zorunludur' });
    }
    if (!contactEmail || !contactEmail.trim()) {
      return errorResponse(res, { message: 'İletişim email adresi zorunludur' });
    }
    if (!email || !email.trim()) {
      return errorResponse(res, { message: 'Admin email adresi zorunludur' });
    }
    if (!password) {
      return errorResponse(res, { message: 'Admin şifresi zorunludur' });
    }

    // Telefon numarası varsa normalize et ve doğrula
    if (contactPhone && contactPhone.trim()) {
      const normalized = normalizePhone(contactPhone);
      if (!isValidTurkishPhone(normalized)) {
        return errorResponse(res, { message: 'Geçerli bir telefon numarası giriniz (05XX XXX XX XX)' });
      }
      req.body.contactPhone = normalized;
    }

    // Email mükerrer kontrolü
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return errorResponse(res, { message: 'Bu email adresi zaten kullanılıyor' });
    }

    // bayi_admin rolü kontrolü
    const role = await Role.findOne({ name: 'bayi_admin' });
    if (!role) {
      return errorResponse(res, { message: 'bayi_admin rolü bulunamadı. Lütfen sistem yöneticisine başvurun', statusCode: 500 });
    }

    // Oluşturulan kayıtları takip et (rollback için)
    let createdDealer = null;
    let createdCompany = null;
    let createdWorkplace = null;
    let createdUser = null;

    try {
      // 1. Dealer oluştur
      createdDealer = new Dealer({
        name,
        contactEmail,
        contactPhone: req.body.contactPhone || contactPhone,
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
      await createdDealer.save();

      // 2. Bayinin kendi şirketini oluştur
      createdCompany = new Company({
        name: `${name} (Kendi Şirketim)`,
        dealer: createdDealer._id,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
        address: address,
        isDealerSelfCompany: true,
        isActive: true,
        isActivated: true,
        activatedAt: new Date(),
      });
      await createdCompany.save();

      // 3. Varsayılan Merkez işyeri oluştur
      const Workplace = require('../models/Workplace');
      createdWorkplace = new Workplace({
        name: 'Merkez',
        company: createdCompany._id,
        isDefault: true,
        isActive: true,
      });
      await createdWorkplace.save();

      // 4. Dealer'a selfCompany referansını ekle
      createdDealer.selfCompany = createdCompany._id;
      await createdDealer.save();

      // 5. bayi_admin kullanıcısını oluştur
      const hashedPassword = await bcrypt.hash(password, 10);
      createdUser = new User({
        email,
        password: hashedPassword,
        role: role._id,
        dealer: createdDealer._id,
      });
      await createdUser.save();

      return createdResponse(res, { data: createdDealer, message: 'Bayi oluşturuldu' });
    } catch (innerError) {
      // Rollback: Oluşturulan kayıtları temizle
      console.error('Bayi oluşturma hatası, rollback yapılıyor:', innerError);
      try {
        if (createdUser) await User.findByIdAndDelete(createdUser._id);
        if (createdWorkplace) {
          const Workplace = require('../models/Workplace');
          await Workplace.findByIdAndDelete(createdWorkplace._id);
        }
        if (createdCompany) await Company.findByIdAndDelete(createdCompany._id);
        if (createdDealer) await Dealer.findByIdAndDelete(createdDealer._id);
      } catch (rollbackError) {
        console.error('Rollback hatası:', rollbackError);
      }
      throw innerError;
    }
  } catch (error) {
    // Mongoose validation hatalarını anlaşılır mesajla dön
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return errorResponse(res, { message: messages.join(', ') });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return errorResponse(res, { message: `Bu ${field === 'email' ? 'email adresi' : field} zaten kullanılıyor` });
    }
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

    // Telefon numarası varsa normalize et ve doğrula
    if (contactPhone !== undefined && contactPhone && contactPhone.trim()) {
      const normalized = normalizePhone(contactPhone);
      if (!isValidTurkishPhone(normalized)) {
        return errorResponse(res, { message: 'Geçerli bir telefon numarası giriniz (05XX XXX XX XX)' });
      }
      req.body.contactPhone = normalized;
    }

    if (name !== undefined) dealer.name = name;
    if (contactEmail !== undefined) dealer.contactEmail = contactEmail;
    if (contactPhone !== undefined) dealer.contactPhone = req.body.contactPhone || contactPhone;
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

    // selfCompany varsa, ortak alanları senkronize et
    if (dealer.selfCompany) {
      const companyUpdate = {};
      if (name !== undefined) companyUpdate.name = `${name} (Kendi Şirketim)`;
      if (contactEmail !== undefined) companyUpdate.contactEmail = contactEmail;
      if (contactPhone !== undefined) companyUpdate.contactPhone = contactPhone;
      if (address !== undefined) companyUpdate.address = address;

      if (Object.keys(companyUpdate).length > 0) {
        await Company.findByIdAndUpdate(dealer.selfCompany, companyUpdate);
      }
    }

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

// Deactivate dealer (pasife al) - only super_admin
router.patch('/:id/deactivate', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    // Aktif şirket kontrolü
    const activeCompaniesCount = await Company.countDocuments({
      dealer: req.params.id,
      isActive: true,
    });

    if (activeCompaniesCount > 0) {
      return errorResponse(res, {
        message: `Bu bayinin ${activeCompaniesCount} aktif şirketi var. Önce şirketleri transfer edin veya pasife alın.`,
        statusCode: 400,
        activeCompaniesCount,
      });
    }

    dealer.isActive = false;
    await dealer.save();

    return successResponse(res, { data: dealer, message: 'Bayi pasife alındı' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Activate dealer (aktifleştir) - only super_admin
router.patch('/:id/activate', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    dealer.isActive = true;
    await dealer.save();

    return successResponse(res, { data: dealer, message: 'Bayi aktifleştirildi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Transfer companies to another dealer - only super_admin
router.post('/:id/transfer-companies', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { companyIds, targetDealerId } = req.body;

    // Validation
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return errorResponse(res, {
        message: 'En az bir şirket seçmelisiniz',
        statusCode: 400,
      });
    }

    if (!targetDealerId) {
      return errorResponse(res, {
        message: 'Hedef bayi seçmelisiniz',
        statusCode: 400,
      });
    }

    // Source dealer kontrolü
    const sourceDealer = await Dealer.findById(id);
    if (!sourceDealer) {
      return notFound(res, 'Kaynak bayi bulunamadı');
    }

    // Target dealer kontrolü
    const targetDealer = await Dealer.findById(targetDealerId);
    if (!targetDealer) {
      return notFound(res, 'Hedef bayi bulunamadı');
    }

    if (!targetDealer.isActive) {
      return errorResponse(res, {
        message: 'Hedef bayi pasif durumda. Lütfen aktif bir bayi seçin.',
        statusCode: 400,
      });
    }

    // Şirketleri kontrol et
    const companies = await Company.find({
      _id: { $in: companyIds },
      dealer: id,
    });

    if (companies.length !== companyIds.length) {
      return errorResponse(res, {
        message: 'Seçili şirketlerden bazıları bulunamadı veya bu bayiye ait değil',
        statusCode: 400,
      });
    }

    // selfCompany kontrolü (transfer edilemez)
    const selfCompany = companies.find(c => c.isDealerSelfCompany);
    if (selfCompany) {
      return errorResponse(res, {
        message: 'Bayinin kendi şirketi (selfCompany) transfer edilemez',
        statusCode: 400,
      });
    }

    // maxCompanies limit kontrolü (target dealer için)
    if (targetDealer.maxCompanies !== null && targetDealer.maxCompanies !== undefined) {
      const targetCurrentCompaniesCount = await Company.countDocuments({
        dealer: targetDealerId,
        isActive: true,
      });

      const totalAfterTransfer = targetCurrentCompaniesCount + companies.length;

      if (totalAfterTransfer > targetDealer.maxCompanies) {
        return errorResponse(res, {
          message: `Hedef bayinin şirket limiti aşılacak. Mevcut: ${targetCurrentCompaniesCount}, Limit: ${targetDealer.maxCompanies}, Transfer: ${companies.length}`,
          statusCode: 400,
        });
      }
    }

    // Quota yeterlilik kontrolü (target dealer için)
    const totalQuotaNeeded = companies.reduce((sum, company) => {
      return sum + (company.quota?.allocated || 0);
    }, 0);

    if (targetDealer.maxCompanies !== null) {
      const targetQuotaSummary = await quotaService.getDealerQuotaSummary(targetDealerId);
      const availableQuota = targetQuotaSummary.total - targetQuotaSummary.allocated;

      if (totalQuotaNeeded > availableQuota) {
        return errorResponse(res, {
          message: `Hedef bayinin kullanılabilir kotası yetersiz. Gerekli: ${totalQuotaNeeded}, Mevcut: ${availableQuota}`,
          statusCode: 400,
        });
      }
    }

    // Transfer işlemi (rollback capability ile)
    const transferredCompanyIds = [];
    const updatedUserIds = [];
    let sourceDealerUpdated = false;
    let targetDealerUpdated = false;

    try {
      // 1. Şirketleri transfer et
      for (const company of companies) {
        const oldDealerId = company.dealer;
        company.dealer = targetDealerId;
        await company.save();
        transferredCompanyIds.push(company._id);
      }

      // 2. company_admin kullanıcılarını güncelle (dealer field)
      const companyAdminRole = await Role.findOne({ name: 'company_admin' });
      if (companyAdminRole) {
        const usersToUpdate = await User.find({
          company: { $in: companyIds },
          role: companyAdminRole._id,
        });

        for (const user of usersToUpdate) {
          user.dealer = targetDealerId;
          await user.save();
          updatedUserIds.push(user._id);
        }
      }

      // 3. Source dealer quota güncelle (azalt)
      if (sourceDealer.quota?.allocated) {
        sourceDealer.quota.allocated -= totalQuotaNeeded;
        if (sourceDealer.quota.allocated < 0) sourceDealer.quota.allocated = 0;
        await sourceDealer.save();
        sourceDealerUpdated = true;
      }

      // 4. Target dealer quota güncelle (artır)
      if (targetDealer.quota && totalQuotaNeeded > 0) {
        if (!targetDealer.quota.allocated) targetDealer.quota.allocated = 0;
        targetDealer.quota.allocated += totalQuotaNeeded;
        await targetDealer.save();
        targetDealerUpdated = true;
      }

      return successResponse(res, {
        data: {
          transferredCount: companies.length,
          updatedUsersCount: updatedUserIds.length,
          sourceDealer: { _id: sourceDealer._id, name: sourceDealer.name },
          targetDealer: { _id: targetDealer._id, name: targetDealer.name },
        },
        message: `${companies.length} şirket başarıyla transfer edildi`,
      });
    } catch (innerError) {
      // Rollback: Transfer edilen kayıtları geri al
      console.error('Transfer hatası, rollback yapılıyor:', innerError);
      try {
        // Şirketleri eski dealer'a geri al
        for (const companyId of transferredCompanyIds) {
          await Company.findByIdAndUpdate(companyId, { dealer: id });
        }

        // Kullanıcıları eski dealer'a geri al
        for (const userId of updatedUserIds) {
          await User.findByIdAndUpdate(userId, { dealer: id });
        }

        // Quota'ları geri al
        if (sourceDealerUpdated) {
          sourceDealer.quota.allocated += totalQuotaNeeded;
          await sourceDealer.save();
        }

        if (targetDealerUpdated) {
          targetDealer.quota.allocated -= totalQuotaNeeded;
          await targetDealer.save();
        }
      } catch (rollbackError) {
        console.error('Rollback hatası:', rollbackError);
      }
      throw innerError;
    }
  } catch (error) {
    return serverError(res, error, 'Şirket transferi sırasında bir hata oluştu');
  }
});

// Delete dealer (only super_admin)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    // Aktif şirket kontrolü
    const activeCompaniesCount = await Company.countDocuments({
      dealer: req.params.id,
      isActive: true,
    });

    if (activeCompaniesCount > 0) {
      return errorResponse(res, {
        message: `Bu bayinin ${activeCompaniesCount} aktif şirketi var. Kalıcı silme için önce bayiyi pasife alın ve tüm şirketleri transfer edin.`,
        statusCode: 400,
        activeCompaniesCount,
      });
    }

    // Kullanıcı kontrolü (güvenlik için)
    const userCount = await User.countDocuments({ dealer: req.params.id });
    if (userCount > 0) {
      return errorResponse(res, {
        message: `Bu bayinin ${userCount} kullanıcısı var. Güvenlik nedeniyle silme işlemi engellenmiştir.`,
        statusCode: 400,
        userCount,
      });
    }

    await Dealer.findByIdAndDelete(req.params.id);
    return successResponse(res, { message: 'Bayi kalıcı olarak silindi' });
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
