const express = require('express');
const router = express.Router();
const SgkMeslekKodu = require('../models/SgkMeslekKodu');
const { auth } = require('../middleware/auth');
const { successResponse, notFound, serverError } = require('../utils/responseHelper');

/**
 * @route   GET /api/sgk-meslek-kodlari
 * @desc    SGK meslek kodlarını ara/listele
 * @access  Private
 * @query   search - Arama terimi (kod veya ad içinde arar)
 * @query   limit - Maksimum sonuç sayısı (varsayılan: 20, max: 100)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 20, 100);

    let query = {};

    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Türkçe karakterleri normalize et
      const normalizedSearch = searchTerm
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/Ç/g, 'c');

      // Regex ile arama (hem kod hem de ad içinde)
      query = {
        $or: [
          { kod: { $regex: searchTerm, $options: 'i' } },
          { ad: { $regex: searchTerm, $options: 'i' } },
          { adNormalized: { $regex: normalizedSearch, $options: 'i' } }
        ]
      };
    }

    const results = await SgkMeslekKodu.find(query)
      .select('kod ad')
      .limit(maxLimit)
      .sort({ kod: 1 })
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('SGK meslek kodları arama hatası:', error);
    return serverError(res, error, 'Meslek kodları aranırken bir hata oluştu');
  }
});

/**
 * @route   GET /api/sgk-meslek-kodlari/stats/count
 * @desc    Toplam meslek kodu sayısını getir
 * @access  Private
 * NOTE: Bu route /:kod'dan ÖNCE tanımlanmalı, yoksa Express 'stats' yi :kod olarak yakalar
 */
router.get('/stats/count', auth, async (req, res) => {
  try {
    const count = await SgkMeslekKodu.countDocuments();

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('SGK meslek kodları sayısı hatası:', error);
    return serverError(res, error, 'Meslek kodu sayısı alınırken bir hata oluştu');
  }
});

/**
 * @route   GET /api/sgk-meslek-kodlari/:kod
 * @desc    Belirli bir meslek kodunu getir
 * @access  Private
 */
router.get('/:kod', auth, async (req, res) => {
  try {
    const meslek = await SgkMeslekKodu.findOne({ kod: req.params.kod })
      .select('kod ad')
      .lean();

    if (!meslek) {
      return notFound(res, 'Meslek kodu bulunamadı');
    }

    res.json({
      success: true,
      data: meslek
    });
  } catch (error) {
    console.error('SGK meslek kodu getirme hatası:', error);
    return serverError(res, error, 'Meslek kodu getirilirken bir hata oluştu');
  }
});

module.exports = router;
