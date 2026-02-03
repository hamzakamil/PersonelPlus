const express = require('express');
const router = express.Router();
const AdditionalPaymentType = require('../models/AdditionalPaymentType');
const { auth, requireRole } = require('../middleware/auth');
const { initializeAdditionalPaymentTypes } = require('../scripts/initAdditionalPaymentTypes');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// ==================== ÖDEME TÜRLERİ ====================

/**
 * GET /api/additional-payment-types
 * Tüm ödeme türlerini listele
 */
router.get('/', auth, async (req, res) => {
  try {
    const { category, active, includeInactive } = req.query;

    // Query oluştur
    const query = {};

    if (category) {
      query.category = category.toUpperCase();
    }

    // Varsayılan olarak sadece aktif türleri getir
    if (!includeInactive || includeInactive !== 'true') {
      query.isActive = true;
    }

    const paymentTypes = await AdditionalPaymentType.find(query)
      .sort({ displayOrder: 1, name: 1 });

    res.json(paymentTypes);
  } catch (error) {
    console.error('Ödeme türleri listelenemedi:', error);
    return serverError(res, error, 'Ödeme türleri alınamadı');
  }
});

/**
 * GET /api/additional-payment-types/:id
 * Tek bir ödeme türünü getir
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const paymentType = await AdditionalPaymentType.findById(req.params.id);

    if (!paymentType) {
      return notFound(res, 'Ödeme türü bulunamadı');
    }

    res.json(paymentType);
  } catch (error) {
    console.error('Ödeme türü alınamadı:', error);
    return serverError(res, error, 'Ödeme türü alınamadı');
  }
});

/**
 * POST /api/additional-payment-types
 * Yeni ödeme türü oluştur (Sadece super_admin)
 */
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      category,
      paymentFrequency,
      isTaxExempt,
      taxExemptLimit,
      displayOrder
    } = req.body;

    // Kod benzersizliğini kontrol et
    const existingCode = await AdditionalPaymentType.findOne({
      code: code.toUpperCase()
    });
    if (existingCode) {
      return errorResponse(res, { message: 'Bu kod zaten kullanılıyor' });
    }

    const paymentType = await AdditionalPaymentType.create({
      name,
      code: code.toUpperCase(),
      description,
      category,
      paymentFrequency: paymentFrequency || 'MONTHLY',
      isTaxExempt: isTaxExempt || false,
      taxExemptLimit: taxExemptLimit || 0,
      isDefault: false, // Kullanıcı tarafından oluşturulanlar varsayılan değil
      displayOrder: displayOrder || 99
    });

    res.status(201).json(paymentType);
  } catch (error) {
    console.error('Ödeme türü oluşturulamadı:', error);
    return serverError(res, error, 'Ödeme türü oluşturulamadı');
  }
});

/**
 * PUT /api/additional-payment-types/:id
 * Ödeme türünü güncelle (Sadece super_admin)
 */
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const paymentType = await AdditionalPaymentType.findById(req.params.id);

    if (!paymentType) {
      return notFound(res, 'Ödeme türü bulunamadı');
    }

    const {
      name,
      code,
      description,
      category,
      paymentFrequency,
      isTaxExempt,
      taxExemptLimit,
      displayOrder,
      isActive
    } = req.body;

    // Kod değişiyorsa benzersizliği kontrol et
    if (code && code.toUpperCase() !== paymentType.code) {
      const existingCode = await AdditionalPaymentType.findOne({
        code: code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingCode) {
        return errorResponse(res, { message: 'Bu kod zaten kullanılıyor' });
      }
      paymentType.code = code.toUpperCase();
    }

    // Diğer alanları güncelle
    if (name !== undefined) paymentType.name = name;
    if (description !== undefined) paymentType.description = description;
    if (category !== undefined) paymentType.category = category;
    if (paymentFrequency !== undefined) paymentType.paymentFrequency = paymentFrequency;
    if (isTaxExempt !== undefined) paymentType.isTaxExempt = isTaxExempt;
    if (taxExemptLimit !== undefined) paymentType.taxExemptLimit = taxExemptLimit;
    if (displayOrder !== undefined) paymentType.displayOrder = displayOrder;
    if (isActive !== undefined) paymentType.isActive = isActive;

    await paymentType.save();

    res.json(paymentType);
  } catch (error) {
    console.error('Ödeme türü güncellenemedi:', error);
    return serverError(res, error, 'Ödeme türü güncellenemedi');
  }
});

/**
 * DELETE /api/additional-payment-types/:id
 * Ödeme türünü deaktif et (Sadece super_admin)
 * Not: Varsayılan türler silinemez, sadece deaktif edilebilir
 */
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const paymentType = await AdditionalPaymentType.findById(req.params.id);

    if (!paymentType) {
      return notFound(res, 'Ödeme türü bulunamadı');
    }

    // Varsayılan türler silinmez, sadece deaktif edilir
    if (paymentType.isDefault) {
      paymentType.isActive = false;
      await paymentType.save();
      return res.json({ message: 'Varsayılan ödeme türü deaktif edildi', paymentType });
    }

    // Varsayılan olmayan türler tamamen silinebilir
    await AdditionalPaymentType.findByIdAndDelete(req.params.id);

    res.json({ message: 'Ödeme türü silindi' });
  } catch (error) {
    console.error('Ödeme türü silinemedi:', error);
    return serverError(res, error, 'Ödeme türü silinemedi');
  }
});

/**
 * POST /api/additional-payment-types/init
 * Varsayılan ödeme türlerini başlat (Sadece super_admin)
 */
router.post('/init', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const result = await initializeAdditionalPaymentTypes();
    res.json(result);
  } catch (error) {
    console.error('Varsayılan ödeme türleri oluşturulamadı:', error);
    return serverError(res, error, 'Ödeme türleri başlatılamadı');
  }
});

/**
 * GET /api/additional-payment-types/categories
 * Tüm kategorileri listele
 */
router.get('/meta/categories', auth, async (req, res) => {
  try {
    const categories = [
      { code: 'TRANSPORTATION', name: 'Ulaşım' },
      { code: 'FOOD', name: 'Yemek' },
      { code: 'FAMILY', name: 'Aile' },
      { code: 'CLOTHING', name: 'Giyim' },
      { code: 'BONUS', name: 'Prim' },
      { code: 'OTHER', name: 'Diğer' }
    ];

    res.json(categories);
  } catch (error) {
    return serverError(res, error, 'Kategoriler alınamadı');
  }
});

/**
 * GET /api/additional-payment-types/frequencies
 * Tüm ödeme sıklıklarını listele
 */
router.get('/meta/frequencies', auth, async (req, res) => {
  try {
    const frequencies = [
      { code: 'MONTHLY', name: 'Aylık' },
      { code: 'YEARLY', name: 'Yıllık' },
      { code: 'ONE_TIME', name: 'Tek Seferlik' }
    ];

    res.json(frequencies);
  } catch (error) {
    return serverError(res, error, 'Sıklıklar alınamadı');
  }
});

module.exports = router;
