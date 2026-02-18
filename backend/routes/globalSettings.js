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

// GET /api/global-settings/trial-settings - Deneme hesabı ayarlarını getir
router.get('/trial-settings', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    return successResponse(res, {
      data: {
        trialDays: settings.trialSettings?.trialDays ?? 14,
        trialEmployeeQuota: settings.trialSettings?.trialEmployeeQuota ?? 1,
      },
    });
  } catch (error) {
    console.error('Deneme ayarları getirme hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/global-settings/trial-settings - Deneme hesabı ayarlarını güncelle
router.put('/trial-settings', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { trialDays, trialEmployeeQuota } = req.body;

    const days = parseInt(trialDays);
    const quota = parseInt(trialEmployeeQuota);

    if (isNaN(days) || days < 1 || days > 365) {
      return errorResponse(res, { message: 'Deneme süresi 1-365 gün arasında olmalıdır' });
    }
    if (isNaN(quota) || quota < 1 || quota > 1000) {
      return errorResponse(res, { message: 'Çalışan kotası 1-1000 arasında olmalıdır' });
    }

    const settings = await Settings.getSettings();
    if (!settings.trialSettings) settings.trialSettings = {};
    settings.trialSettings.trialDays = days;
    settings.trialSettings.trialEmployeeQuota = quota;
    await settings.save();

    return successResponse(res, {
      data: { trialDays: days, trialEmployeeQuota: quota },
      message: `Deneme ayarları güncellendi: ${days} gün, ${quota} çalışan`,
    });
  } catch (error) {
    console.error('Deneme ayarları güncelleme hatası:', error);
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

// GET /api/global-settings/activation-mode - Aktivasyon modunu getir
router.get('/activation-mode', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    return successResponse(res, {
      data: { activationMode: settings.activationMode || 'email' },
    });
  } catch (error) {
    console.error('Aktivasyon modu getirme hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/global-settings/activation-mode - Aktivasyon modunu güncelle
router.put('/activation-mode', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { activationMode } = req.body;

    if (!['email', 'sms', 'both'].includes(activationMode)) {
      return errorResponse(res, { message: 'Geçersiz aktivasyon modu' });
    }

    const settings = await Settings.getSettings();
    settings.activationMode = activationMode;
    await settings.save();

    const labels = { email: 'Email', sms: 'SMS', both: 'Email + SMS' };
    return successResponse(res, {
      data: { activationMode: settings.activationMode },
      message: `Aktivasyon modu: ${labels[activationMode]} olarak ayarlandı`,
    });
  } catch (error) {
    console.error('Aktivasyon modu güncelleme hatası:', error);
    return serverError(res, error);
  }
});

// GET /api/global-settings/sms-config - SMS yapılandırmasını getir
router.get('/sms-config', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const smsConfig = settings.smsConfig || {};

    return successResponse(res, {
      data: {
        enabled: smsConfig.enabled || false,
        username: smsConfig.username || '',
        password: smsConfig.password ? '********' : '', // Şifreyi maskele
        sourceAddr: smsConfig.sourceAddr || 'PersonelPlus',
        mockSms: smsConfig.mockSms || false,
        hasPassword: !!smsConfig.password,
      },
    });
  } catch (error) {
    console.error('SMS config getirme hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/global-settings/sms-config - SMS yapılandırmasını güncelle
router.put('/sms-config', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { enabled, username, password, sourceAddr, mockSms } = req.body;

    const settings = await Settings.getSettings();
    if (!settings.smsConfig) settings.smsConfig = {};

    if (typeof enabled === 'boolean') settings.smsConfig.enabled = enabled;
    if (username !== undefined) settings.smsConfig.username = username;
    // Şifre sadece gerçek değer gönderildiğinde güncelle (maskelenmiş değeri atla)
    if (password && password !== '********') settings.smsConfig.password = password;
    if (sourceAddr !== undefined) settings.smsConfig.sourceAddr = sourceAddr;
    if (typeof mockSms === 'boolean') settings.smsConfig.mockSms = mockSms;

    await settings.save();

    // SMS servisinin config cache'ini temizle
    try {
      const smsService = require('../services/smsService');
      smsService.clearConfigCache();
    } catch (e) {
      // smsService yüklenemezse devam et
    }

    return successResponse(res, {
      data: {
        enabled: settings.smsConfig.enabled,
        username: settings.smsConfig.username,
        password: settings.smsConfig.password ? '********' : '',
        sourceAddr: settings.smsConfig.sourceAddr,
        mockSms: settings.smsConfig.mockSms,
        hasPassword: !!settings.smsConfig.password,
      },
      message: 'SMS ayarları güncellendi',
    });
  } catch (error) {
    console.error('SMS config güncelleme hatası:', error);
    return serverError(res, error);
  }
});

// POST /api/global-settings/sms-config/test - Test SMS gönder
router.post('/sms-config/test', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return errorResponse(res, { message: 'Telefon numarası gereklidir' });
    }

    const smsService = require('../services/smsService');

    // Cache'i temizle ki güncel ayarları kullansın
    smsService.clearConfigCache();

    const result = await smsService.sendSms(
      phone,
      'PersonelPlus - Bu bir test SMS mesajidir. SMS yapilandirmaniz basariyla calisiyor!'
    );

    return successResponse(res, {
      data: { mock: result.mock || false, campaignId: result.campaignId },
      message: result.mock
        ? 'Test SMS gönderildi (Mock mod - gerçek SMS gönderilmedi, konsol loglarını kontrol edin)'
        : 'Test SMS başarıyla gönderildi',
    });
  } catch (error) {
    console.error('Test SMS gönderme hatası:', error);
    return errorResponse(res, { message: error.message || 'Test SMS gönderilemedi' });
  }
});

module.exports = router;
