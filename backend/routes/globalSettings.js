const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, serverError } = require('../utils/responseHelper');

// GET /api/global-settings/minimum-wages - Tüm yıllık asgari ücretleri getir
router.get('/minimum-wages', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: {
        minimumWages: settings.minimumWages.sort((a, b) => b.year - a.year), // Yeni → eski
        currentYear: settings.currentYear,
      },
    });
  } catch (error) {
    console.error('Asgari ücretler getirme hatası:', error);
    return serverError(res, error);
  }
});

// POST /api/global-settings/minimum-wages - Yeni yıllık asgari ücret ekle
router.post('/minimum-wages', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { year, net, brut } = req.body;

    if (!year || !net || !brut) {
      return errorResponse(res, { message: 'Yıl, net ve brüt asgari ücret değerleri zorunludur' });
    }

    const parsedYear = parseInt(year);
    const parsedNet = parseFloat(net);
    const parsedBrut = parseFloat(brut);

    if (isNaN(parsedYear) || isNaN(parsedNet) || isNaN(parsedBrut)) {
      return errorResponse(res, {
        message: 'Yıl, net ve brüt değerleri geçerli sayılar olmalıdır',
      });
    }

    if (parsedNet <= 0 || parsedBrut <= 0) {
      return errorResponse(res, { message: 'Asgari ücret değerleri pozitif olmalıdır' });
    }

    const settings = await Settings.getSettings();

    // Aynı yıl için kayıt var mı kontrol et
    const existingIndex = settings.minimumWages.findIndex(w => w.year === parsedYear);

    if (existingIndex !== -1) {
      // Güncelle
      settings.minimumWages[existingIndex].net = parsedNet;
      settings.minimumWages[existingIndex].brut = parsedBrut;
      settings.minimumWages[existingIndex].effectiveDate = new Date();
    } else {
      // Yeni ekle
      settings.minimumWages.push({
        year: parsedYear,
        net: parsedNet,
        brut: parsedBrut,
        effectiveDate: new Date(),
      });
    }

    await settings.save();

    res.json({
      success: true,
      message: existingIndex !== -1 ? 'Asgari ücret güncellendi' : 'Asgari ücret eklendi',
      data: settings.minimumWages.find(w => w.year === parsedYear),
    });
  } catch (error) {
    console.error('Asgari ücret ekleme/güncelleme hatası:', error);
    return serverError(res, error);
  }
});

// DELETE /api/global-settings/minimum-wages/:year - Yıllık asgari ücret sil
router.delete(
  '/minimum-wages/:year',
  auth,
  requireRole('super_admin', 'bayi_admin'),
  async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const settings = await Settings.getSettings();

      settings.minimumWages = settings.minimumWages.filter(w => w.year !== year);
      await settings.save();

      res.json({
        success: true,
        message: 'Asgari ücret silindi',
      });
    } catch (error) {
      console.error('Asgari ücret silme hatası:', error);
      return serverError(res, error);
    }
  }
);

// GET /api/global-settings/minimum-wage/:year? - Belirli yıl için asgari ücret getir
router.get('/minimum-wage/:year?', auth, async (req, res) => {
  try {
    const year = req.params.year ? parseInt(req.params.year) : null;
    const wageData = await Settings.getMinimumWage(year);

    res.json({
      success: true,
      data: wageData,
    });
  } catch (error) {
    console.error('Asgari ücret getirme hatası:', error);
    return serverError(res, error);
  }
});

// GET /api/global-settings/registration-mode - Kayıt modunu getir
router.get('/registration-mode', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    return successResponse(res, {
      data: { registrationMode: settings.registrationMode || 'manual_approval' },
    });
  } catch (error) {
    console.error('Kayıt modu getirme hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/global-settings/registration-mode - Kayıt modunu güncelle
router.put('/registration-mode', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { registrationMode } = req.body;

    if (!['email_verification', 'manual_approval'].includes(registrationMode)) {
      return errorResponse(res, { message: 'Geçersiz kayıt modu' });
    }

    const settings = await Settings.getSettings();
    settings.registrationMode = registrationMode;
    await settings.save();

    return successResponse(res, {
      data: { registrationMode: settings.registrationMode },
      message:
        registrationMode === 'email_verification'
          ? 'Kayıt modu: Email doğrulama olarak ayarlandı'
          : 'Kayıt modu: Manuel onay olarak ayarlandı',
    });
  } catch (error) {
    console.error('Kayıt modu güncelleme hatası:', error);
    return serverError(res, error);
  }
});

// GET /api/global-settings/support-info - Destek bilgilerini getir (public - auth gerekmez)
router.get('/support-info', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    return successResponse(res, {
      data: {
        supportEmail: settings.supportEmail || 'destek@personelplus.com',
        supportPhone: settings.supportPhone || '0555 123 45 67',
      },
    });
  } catch (error) {
    console.error('Destek bilgileri getirme hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/global-settings/support-info - Destek bilgilerini güncelle
router.put('/support-info', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { supportEmail, supportPhone } = req.body;

    if (!supportEmail || !supportPhone) {
      return errorResponse(res, { message: 'Email ve telefon bilgileri zorunludur' });
    }

    const settings = await Settings.getSettings();
    settings.supportEmail = supportEmail;
    settings.supportPhone = supportPhone;
    await settings.save();

    return successResponse(res, {
      data: {
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
      },
      message: 'Destek bilgileri güncellendi',
    });
  } catch (error) {
    console.error('Destek bilgileri güncelleme hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;
