const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { auth, requireRole } = require('../middleware/auth');
const campaignService = require('../services/campaignService');
const { errorResponse, notFound, serverError } = require('../utils/responseHelper');

// GET /api/campaigns - Tüm kampanyaları listele (super_admin)
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = {};

    if (status === 'active') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.endDate = { $lt: new Date() };
    } else if (status === 'upcoming') {
      query.startDate = { $gt: new Date() };
    }

    const campaigns = await Campaign.find(query)
      .populate('applicablePackages', 'name')
      .populate('createdBy', 'email')
      .select('-usageHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Campaign.countDocuments(query);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Kampanya listesi hatası:', error);
    return serverError(res, error, 'Kampanyalar yüklenirken bir hata oluştu');
  }
});

// GET /api/campaigns/active - Aktif kampanyaları getir (bayi için)
router.get('/active', auth, async (req, res) => {
  try {
    const campaigns = await campaignService.getActiveCampaigns();

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Aktif kampanya hatası:', error);
    return serverError(res, error, 'Kampanyalar yüklenirken bir hata oluştu');
  }
});

// POST /api/campaigns/validate - Kampanya kodunu doğrula (bayi için)
router.post('/validate', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const { code, packageId, billingType, amount } = req.body;
    const dealerId = req.user.dealer;

    if (!code || !packageId || !billingType || !amount) {
      return errorResponse(res, { message: 'Kod, paket, fatura tipi ve tutar zorunludur' });
    }

    const result = await campaignService.validateCampaignCode(
      code,
      dealerId,
      packageId,
      billingType,
      amount
    );

    res.json({
      success: result.valid,
      data: result
    });
  } catch (error) {
    console.error('Kampanya doğrulama hatası:', error);
    return serverError(res, error, 'Kampanya doğrulanırken bir hata oluştu');
  }
});

// GET /api/campaigns/:id - Kampanya detayı
router.get('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('applicablePackages', 'name code')
      .populate('createdBy', 'email')
      .populate('usageHistory.dealer', 'name contactEmail');

    if (!campaign) {
      return notFound(res, 'Kampanya bulunamadı');
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Kampanya detay hatası:', error);
    return serverError(res, error, 'Kampanya yüklenirken bir hata oluştu');
  }
});

// GET /api/campaigns/:id/stats - Kampanya istatistikleri
router.get('/:id/stats', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const stats = await campaignService.getCampaignStats(req.params.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Kampanya istatistik hatası:', error);
    return serverError(res, error, error.message || 'İstatistikler yüklenirken bir hata oluştu');
  }
});

// POST /api/campaigns - Yeni kampanya oluştur (super_admin)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      code,
      type,
      discountPercent,
      discountAmount,
      trialDays,
      startDate,
      endDate,
      maxUses,
      maxUsesPerDealer,
      applicablePackages,
      applicableBillingTypes,
      minBillingMonths,
      minOrderAmount
    } = req.body;

    if (!name || !type || !startDate || !endDate) {
      return errorResponse(res, { message: 'Ad, tip, başlangıç ve bitiş tarihi zorunludur' });
    }

    // Kod yoksa otomatik oluştur
    const campaignCode = code || await campaignService.generateCampaignCode();

    // Kod benzersizlik kontrolü
    const existingCampaign = await Campaign.findOne({ code: campaignCode.toUpperCase() });
    if (existingCampaign) {
      return errorResponse(res, { message: 'Bu kampanya kodu zaten kullanımda' });
    }

    const campaign = new Campaign({
      name,
      description,
      code: campaignCode.toUpperCase(),
      type,
      discountPercent: type === 'percentage' ? discountPercent : 0,
      discountAmount: type === 'fixed' ? discountAmount : 0,
      trialDays: type === 'trial' ? trialDays : 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxUses: maxUses || null,
      maxUsesPerDealer: maxUsesPerDealer || 1,
      applicablePackages: applicablePackages || [],
      applicableBillingTypes: applicableBillingTypes || [],
      minBillingMonths: minBillingMonths || 1,
      minOrderAmount: minOrderAmount || 0,
      createdBy: req.user._id
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Kampanya oluşturuldu',
      data: campaign
    });
  } catch (error) {
    console.error('Kampanya oluşturma hatası:', error);
    return serverError(res, error, 'Kampanya oluşturulurken bir hata oluştu');
  }
});

// PUT /api/campaigns/:id - Kampanya güncelle (super_admin)
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      discountPercent,
      discountAmount,
      trialDays,
      startDate,
      endDate,
      maxUses,
      maxUsesPerDealer,
      applicablePackages,
      applicableBillingTypes,
      minBillingMonths,
      minOrderAmount,
      isActive
    } = req.body;

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return notFound(res, 'Kampanya bulunamadı');
    }

    // Güncelleme
    if (name !== undefined) campaign.name = name;
    if (description !== undefined) campaign.description = description;
    if (type !== undefined) {
      campaign.type = type;
      campaign.discountPercent = type === 'percentage' ? discountPercent : 0;
      campaign.discountAmount = type === 'fixed' ? discountAmount : 0;
      campaign.trialDays = type === 'trial' ? trialDays : 0;
    } else {
      if (discountPercent !== undefined) campaign.discountPercent = discountPercent;
      if (discountAmount !== undefined) campaign.discountAmount = discountAmount;
      if (trialDays !== undefined) campaign.trialDays = trialDays;
    }
    if (startDate !== undefined) campaign.startDate = new Date(startDate);
    if (endDate !== undefined) campaign.endDate = new Date(endDate);
    if (maxUses !== undefined) campaign.maxUses = maxUses;
    if (maxUsesPerDealer !== undefined) campaign.maxUsesPerDealer = maxUsesPerDealer;
    if (applicablePackages !== undefined) campaign.applicablePackages = applicablePackages;
    if (applicableBillingTypes !== undefined) campaign.applicableBillingTypes = applicableBillingTypes;
    if (minBillingMonths !== undefined) campaign.minBillingMonths = minBillingMonths;
    if (minOrderAmount !== undefined) campaign.minOrderAmount = minOrderAmount;
    if (isActive !== undefined) campaign.isActive = isActive;

    await campaign.save();

    res.json({
      success: true,
      message: 'Kampanya güncellendi',
      data: campaign
    });
  } catch (error) {
    console.error('Kampanya güncelleme hatası:', error);
    return serverError(res, error, 'Kampanya güncellenirken bir hata oluştu');
  }
});

// DELETE /api/campaigns/:id - Kampanya sil (super_admin)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return notFound(res, 'Kampanya bulunamadı');
    }

    // Kullanılmış kampanya silinemez, sadece deaktif edilebilir
    if (campaign.usedCount > 0) {
      return errorResponse(res, {
        message: 'Kullanılmış kampanya silinemez. Kampanyayı deaktif edebilirsiniz.'
      });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Kampanya silindi'
    });
  } catch (error) {
    console.error('Kampanya silme hatası:', error);
    return serverError(res, error, 'Kampanya silinirken bir hata oluştu');
  }
});

// POST /api/campaigns/:id/toggle - Kampanya aktif/pasif yap
router.post('/:id/toggle', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return notFound(res, 'Kampanya bulunamadı');
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    res.json({
      success: true,
      message: campaign.isActive ? 'Kampanya aktif edildi' : 'Kampanya pasif edildi',
      data: { isActive: campaign.isActive }
    });
  } catch (error) {
    console.error('Kampanya toggle hatası:', error);
    return serverError(res, error, 'İşlem sırasında bir hata oluştu');
  }
});

// POST /api/campaigns/generate-code - Rastgele kod oluştur
router.post('/generate-code', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const code = await campaignService.generateCampaignCode();

    res.json({
      success: true,
      data: { code }
    });
  } catch (error) {
    console.error('Kod oluşturma hatası:', error);
    return serverError(res, error, 'Kod oluşturulurken bir hata oluştu');
  }
});

module.exports = router;
