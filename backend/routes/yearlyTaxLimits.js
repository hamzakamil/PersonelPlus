const express = require('express');
const router = express.Router();
const YearlyTaxLimits = require('../models/YearlyTaxLimits');
const { auth, requireRole } = require('../middleware/auth');
const { initializeYearlyTaxLimits } = require('../scripts/initYearlyTaxLimits');
const { errorResponse, notFound, serverError } = require('../utils/responseHelper');

/**
 * GET /api/yearly-tax-limits
 * Tüm yıllık limitleri listele
 */
router.get('/', auth, async (req, res) => {
  try {
    const limits = await YearlyTaxLimits.find()
      .sort({ year: -1 });

    res.json(limits);
  } catch (error) {
    console.error('Yıllık limitler alınamadı:', error);
    return serverError(res, error, 'Limitler alınamadı');
  }
});

/**
 * GET /api/yearly-tax-limits/active
 * Aktif yılın limitlerini getir
 */
router.get('/active', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Önce aktif olanı ara, yoksa mevcut yılı ara
    let limits = await YearlyTaxLimits.findOne({ isActive: true });

    if (!limits) {
      limits = await YearlyTaxLimits.findOne({ year: currentYear });
    }

    if (!limits) {
      return notFound(res, 'Aktif yıl limitleri bulunamadı');
    }

    res.json(limits);
  } catch (error) {
    console.error('Aktif limitler alınamadı:', error);
    return serverError(res, error, 'Limitler alınamadı');
  }
});

/**
 * GET /api/yearly-tax-limits/:year
 * Belirli yılın limitlerini getir
 */
router.get('/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;

    const limits = await YearlyTaxLimits.findOne({ year: parseInt(year) });

    if (!limits) {
      return notFound(res, `${year} yılı limitleri bulunamadı`);
    }

    res.json(limits);
  } catch (error) {
    console.error('Yıl limitleri alınamadı:', error);
    return serverError(res, error, 'Limitler alınamadı');
  }
});

/**
 * POST /api/yearly-tax-limits
 * Yeni yıl limiti ekle (Sadece super_admin)
 */
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { year, yemekLimits, yolLimits, sgkLimits, isActive, notes } = req.body;

    // Yıl kontrolü
    const existing = await YearlyTaxLimits.findOne({ year });
    if (existing) {
      return errorResponse(res, { message: `${year} yılı limitleri zaten mevcut` });
    }

    // Eğer aktif olarak işaretleniyorsa, diğerlerini pasif yap
    if (isActive) {
      await YearlyTaxLimits.updateMany({}, { isActive: false });
    }

    const limits = await YearlyTaxLimits.create({
      year,
      yemekLimits,
      yolLimits,
      sgkLimits,
      isActive: isActive || false,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json(limits);
  } catch (error) {
    console.error('Yıl limiti oluşturulamadı:', error);
    return serverError(res, error, 'Limit oluşturulamadı');
  }
});

/**
 * PUT /api/yearly-tax-limits/:year
 * Yıl limitlerini güncelle (Sadece super_admin)
 */
router.put('/:year', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { year } = req.params;
    const { yemekLimits, yolLimits, sgkLimits, isActive, notes } = req.body;

    const limits = await YearlyTaxLimits.findOne({ year: parseInt(year) });

    if (!limits) {
      return notFound(res, `${year} yılı limitleri bulunamadı`);
    }

    // Eğer aktif olarak işaretleniyorsa, diğerlerini pasif yap
    if (isActive) {
      await YearlyTaxLimits.updateMany(
        { year: { $ne: parseInt(year) } },
        { isActive: false }
      );
    }

    // Alanları güncelle
    if (yemekLimits) {
      limits.yemekLimits = { ...limits.yemekLimits, ...yemekLimits };
    }
    if (yolLimits) {
      limits.yolLimits = { ...limits.yolLimits, ...yolLimits };
    }
    if (sgkLimits) {
      limits.sgkLimits = { ...limits.sgkLimits, ...sgkLimits };
    }
    if (isActive !== undefined) {
      limits.isActive = isActive;
    }
    if (notes !== undefined) {
      limits.notes = notes;
    }

    await limits.save();

    res.json(limits);
  } catch (error) {
    console.error('Yıl limitleri güncellenemedi:', error);
    return serverError(res, error, 'Güncelleme başarısız');
  }
});

/**
 * DELETE /api/yearly-tax-limits/:year
 * Yıl limitlerini sil (Sadece super_admin)
 */
router.delete('/:year', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { year } = req.params;

    const limits = await YearlyTaxLimits.findOne({ year: parseInt(year) });

    if (!limits) {
      return notFound(res, `${year} yılı limitleri bulunamadı`);
    }

    // Aktif yıl silinemez
    if (limits.isActive) {
      return errorResponse(res, { message: 'Aktif yıl limitleri silinemez. Önce başka bir yılı aktif yapın.' });
    }

    await YearlyTaxLimits.findByIdAndDelete(limits._id);

    res.json({ message: `${year} yılı limitleri silindi` });
  } catch (error) {
    console.error('Yıl limitleri silinemedi:', error);
    return serverError(res, error, 'Silme başarısız');
  }
});

/**
 * POST /api/yearly-tax-limits/init
 * Varsayılan limitleri başlat (Sadece super_admin)
 */
router.post('/init', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const result = await initializeYearlyTaxLimits();
    res.json(result);
  } catch (error) {
    console.error('Varsayılan limitler oluşturulamadı:', error);
    return serverError(res, error, 'Başlatma başarısız');
  }
});

module.exports = router;
