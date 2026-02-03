const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, serverError } = require('../utils/responseHelper');

// GET /api/packages - Tüm paketleri listele (public + auth)
router.get('/', async (req, res) => {
  try {
    let query = {};

    // Auth olmayan kullanıcılar sadece aktif paketleri görsün
    if (!req.headers.authorization) {
      query.isActive = true;
    }

    const packages = await Package.find(query)
      .sort({ sortOrder: 1, employeeLimit: 1 });

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Paket listesi hatası:', error);
    return serverError(res, error, 'Paketler yüklenirken bir hata oluştu');
  }
});

// GET /api/packages/active - Sadece aktif paketler (public)
router.get('/active', async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true })
      .sort({ sortOrder: 1, employeeLimit: 1 });

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Aktif paket listesi hatası:', error);
    return serverError(res, error, 'Paketler yüklenirken bir hata oluştu');
  }
});

// GET /api/packages/:id - Tekil paket
router.get('/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return notFound(res, 'Paket bulunamadı');
    }

    res.json({
      success: true,
      data: pkg
    });
  } catch (error) {
    console.error('Paket detay hatası:', error);
    return serverError(res, error, 'Paket yüklenirken bir hata oluştu');
  }
});

// POST /api/packages - Yeni paket oluştur (super_admin only)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      code,
      employeeLimit,
      monthlyPrice,
      yearlyPrice,
      pricePerEmployee,
      features,
      description,
      highlightText,
      sortOrder,
      isActive
    } = req.body;

    // Validasyon
    if (!name || !code || !employeeLimit || !monthlyPrice || !yearlyPrice) {
      return errorResponse(res, { message: 'Ad, kod, çalışan limiti, aylık ve yıllık fiyat zorunludur' });
    }

    // Kod benzersizliği kontrolü
    const existingPackage = await Package.findOne({ code });
    if (existingPackage) {
      return errorResponse(res, { message: 'Bu kod zaten kullanılıyor' });
    }

    const pkg = new Package({
      name,
      code,
      employeeLimit,
      monthlyPrice,
      yearlyPrice,
      pricePerEmployee: pricePerEmployee || Math.round(monthlyPrice / employeeLimit),
      features: features || [],
      description,
      highlightText,
      sortOrder: sortOrder || 0,
      isActive: isActive !== false
    });

    await pkg.save();

    res.status(201).json({
      success: true,
      message: 'Paket oluşturuldu',
      data: pkg
    });
  } catch (error) {
    console.error('Paket oluşturma hatası:', error);

    if (error.code === 11000) {
      return errorResponse(res, { message: 'Bu kod zaten kullanılıyor' });
    }

    return serverError(res, error, 'Paket oluşturulurken bir hata oluştu');
  }
});

// PUT /api/packages/:id - Paket güncelle (super_admin only)
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      code,
      employeeLimit,
      monthlyPrice,
      yearlyPrice,
      pricePerEmployee,
      features,
      description,
      highlightText,
      sortOrder,
      isActive
    } = req.body;

    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return notFound(res, 'Paket bulunamadı');
    }

    // Kod değiştiriliyorsa benzersizlik kontrolü
    if (code && code !== pkg.code) {
      const existingPackage = await Package.findOne({ code, _id: { $ne: req.params.id } });
      if (existingPackage) {
        return errorResponse(res, { message: 'Bu kod zaten kullanılıyor' });
      }
    }

    // Güncelle
    if (name) pkg.name = name;
    if (code) pkg.code = code;
    if (employeeLimit) pkg.employeeLimit = employeeLimit;
    if (monthlyPrice) pkg.monthlyPrice = monthlyPrice;
    if (yearlyPrice) pkg.yearlyPrice = yearlyPrice;
    if (pricePerEmployee !== undefined) pkg.pricePerEmployee = pricePerEmployee;
    if (features !== undefined) pkg.features = features;
    if (description !== undefined) pkg.description = description;
    if (highlightText !== undefined) pkg.highlightText = highlightText;
    if (sortOrder !== undefined) pkg.sortOrder = sortOrder;
    if (isActive !== undefined) pkg.isActive = isActive;

    await pkg.save();

    res.json({
      success: true,
      message: 'Paket güncellendi',
      data: pkg
    });
  } catch (error) {
    console.error('Paket güncelleme hatası:', error);

    if (error.code === 11000) {
      return errorResponse(res, { message: 'Bu kod zaten kullanılıyor' });
    }

    return serverError(res, error, 'Paket güncellenirken bir hata oluştu');
  }
});

// DELETE /api/packages/:id - Paket sil (super_admin only)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return notFound(res, 'Paket bulunamadı');
    }

    // Aktif abonelik kontrolü
    const DealerSubscription = require('../models/DealerSubscription');
    const activeSubscriptions = await DealerSubscription.countDocuments({
      package: req.params.id,
      status: 'active'
    });

    if (activeSubscriptions > 0) {
      return errorResponse(res, {
        message: `Bu pakete ait ${activeSubscriptions} aktif abonelik var. Önce abonelikleri iptal edin veya paketi pasif yapın.`
      });
    }

    await Package.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Paket silindi'
    });
  } catch (error) {
    console.error('Paket silme hatası:', error);
    return serverError(res, error, 'Paket silinirken bir hata oluştu');
  }
});

// POST /api/packages/:id/toggle-active - Paket aktif/pasif toggle (super_admin only)
router.post('/:id/toggle-active', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return notFound(res, 'Paket bulunamadı');
    }

    pkg.isActive = !pkg.isActive;
    await pkg.save();

    res.json({
      success: true,
      message: pkg.isActive ? 'Paket aktif edildi' : 'Paket pasif edildi',
      data: pkg
    });
  } catch (error) {
    console.error('Paket toggle hatası:', error);
    return serverError(res, error, 'İşlem sırasında bir hata oluştu');
  }
});

module.exports = router;
