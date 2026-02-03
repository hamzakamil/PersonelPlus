const express = require('express');
const router = express.Router();
const CompanyPaymentType = require('../models/CompanyPaymentType');
const AdditionalPaymentType = require('../models/AdditionalPaymentType');
const { auth, requireRole } = require('../middleware/auth');
const { notFound, serverError } = require('../utils/responseHelper');

// ==================== ŞİRKET ÖDEME TÜRLERİ ====================

/**
 * GET /api/companies/:companyId/payment-types
 * Şirketin ödeme türlerini listele (aktif global türlerle birlikte)
 */
router.get('/:companyId/payment-types', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { includeInactive } = req.query;

    // Tüm aktif global ödeme türlerini al
    const globalTypes = await AdditionalPaymentType.find({ isActive: true })
      .sort({ displayOrder: 1 });

    // Şirketin kayıtlı ödeme türlerini al
    const companyTypesQuery = { company: companyId };
    if (!includeInactive || includeInactive !== 'true') {
      companyTypesQuery.isActive = true;
    }

    const companyTypes = await CompanyPaymentType.find(companyTypesQuery)
      .populate('paymentType')
      .sort({ 'paymentType.displayOrder': 1 });

    // Global türleri şirket ayarlarıyla birleştir
    const result = globalTypes.map(globalType => {
      const companyType = companyTypes.find(
        ct => ct.paymentType && ct.paymentType._id.toString() === globalType._id.toString()
      );

      return {
        paymentType: globalType,
        companySettings: companyType || null,
        isEnabled: !!companyType,
        defaultAmount: companyType ? companyType.defaultAmount : null,
        customName: companyType ? companyType.customName : null
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Şirket ödeme türleri alınamadı:', error);
    return serverError(res, error, 'Ödeme türleri alınamadı');
  }
});

/**
 * GET /api/companies/:companyId/payment-types/enabled
 * Şirketin aktif ettiği ödeme türlerini listele
 */
router.get('/:companyId/payment-types/enabled', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const companyTypes = await CompanyPaymentType.find({
      company: companyId,
      isActive: true
    })
      .populate('paymentType')
      .sort({ 'paymentType.displayOrder': 1 });

    // Sadece paymentType'ı aktif olanları filtrele
    const activeTypes = companyTypes.filter(ct =>
      ct.paymentType && ct.paymentType.isActive
    );

    res.json(activeTypes);
  } catch (error) {
    console.error('Aktif ödeme türleri alınamadı:', error);
    return serverError(res, error, 'Ödeme türleri alınamadı');
  }
});

/**
 * POST /api/companies/:companyId/payment-types
 * Şirket için ödeme türü aktifleştir
 */
router.post('/:companyId/payment-types', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { paymentTypeId, defaultAmount, customName, settings } = req.body;

    // Ödeme türünün varlığını kontrol et
    const paymentType = await AdditionalPaymentType.findById(paymentTypeId);
    if (!paymentType) {
      return notFound(res, 'Ödeme türü bulunamadı');
    }

    // Zaten aktif mi kontrol et
    const existing = await CompanyPaymentType.findOne({
      company: companyId,
      paymentType: paymentTypeId
    });

    if (existing) {
      // Varsa güncelle
      existing.isActive = true;
      if (defaultAmount !== undefined) existing.defaultAmount = defaultAmount;
      if (customName !== undefined) existing.customName = customName;
      if (settings) {
        existing.settings = { ...existing.settings, ...settings };
      }
      await existing.save();

      const populated = await CompanyPaymentType.findById(existing._id)
        .populate('paymentType');

      return res.json(populated);
    }

    // Yeni kayıt oluştur
    const companyPaymentType = await CompanyPaymentType.create({
      company: companyId,
      paymentType: paymentTypeId,
      defaultAmount: defaultAmount || 0,
      customName: customName || null,
      settings: settings || {},
      createdBy: req.user._id
    });

    const populated = await CompanyPaymentType.findById(companyPaymentType._id)
      .populate('paymentType');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Şirket ödeme türü oluşturulamadı:', error);
    return serverError(res, error, 'Ödeme türü aktifleştirilemedi');
  }
});

/**
 * PUT /api/companies/:companyId/payment-types/:id
 * Şirket ödeme türü ayarlarını güncelle
 */
router.put('/:companyId/payment-types/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId, id } = req.params;
    const { defaultAmount, customName, settings, isActive } = req.body;

    const companyPaymentType = await CompanyPaymentType.findOne({
      _id: id,
      company: companyId
    });

    if (!companyPaymentType) {
      return notFound(res, 'Şirket ödeme türü bulunamadı');
    }

    // Alanları güncelle
    if (defaultAmount !== undefined) companyPaymentType.defaultAmount = defaultAmount;
    if (customName !== undefined) companyPaymentType.customName = customName;
    if (isActive !== undefined) companyPaymentType.isActive = isActive;
    if (settings) {
      companyPaymentType.settings = { ...companyPaymentType.settings, ...settings };
    }

    await companyPaymentType.save();

    const populated = await CompanyPaymentType.findById(companyPaymentType._id)
      .populate('paymentType');

    res.json(populated);
  } catch (error) {
    console.error('Şirket ödeme türü güncellenemedi:', error);
    return serverError(res, error, 'Ödeme türü güncellenemedi');
  }
});

/**
 * DELETE /api/companies/:companyId/payment-types/:id
 * Şirket ödeme türünü deaktif et
 */
router.delete('/:companyId/payment-types/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId, id } = req.params;

    const companyPaymentType = await CompanyPaymentType.findOne({
      _id: id,
      company: companyId
    });

    if (!companyPaymentType) {
      return notFound(res, 'Şirket ödeme türü bulunamadı');
    }

    // Silmek yerine deaktif et
    companyPaymentType.isActive = false;
    await companyPaymentType.save();

    res.json({ message: 'Ödeme türü deaktif edildi' });
  } catch (error) {
    console.error('Şirket ödeme türü deaktif edilemedi:', error);
    return serverError(res, error, 'Ödeme türü deaktif edilemedi');
  }
});

/**
 * POST /api/companies/:companyId/payment-types/bulk-enable
 * Birden fazla ödeme türünü toplu aktifleştir
 */
router.post('/:companyId/payment-types/bulk-enable', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { paymentTypes } = req.body; // [{ paymentTypeId, defaultAmount, customName }]

    const results = [];

    for (const item of paymentTypes) {
      const { paymentTypeId, defaultAmount, customName } = item;

      // Mevcut kaydı kontrol et
      let companyType = await CompanyPaymentType.findOne({
        company: companyId,
        paymentType: paymentTypeId
      });

      if (companyType) {
        // Varsa güncelle
        companyType.isActive = true;
        if (defaultAmount !== undefined) companyType.defaultAmount = defaultAmount;
        if (customName !== undefined) companyType.customName = customName;
        await companyType.save();
      } else {
        // Yoksa oluştur
        companyType = await CompanyPaymentType.create({
          company: companyId,
          paymentType: paymentTypeId,
          defaultAmount: defaultAmount || 0,
          customName: customName || null,
          createdBy: req.user._id
        });
      }

      results.push(companyType);
    }

    res.json({
      message: `${results.length} ödeme türü aktifleştirildi`,
      results
    });
  } catch (error) {
    console.error('Toplu aktifleştirme başarısız:', error);
    return serverError(res, error, 'Toplu aktifleştirme başarısız');
  }
});

module.exports = router;
