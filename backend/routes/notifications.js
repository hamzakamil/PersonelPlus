const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const DeviceToken = require('../models/DeviceToken');
const NotificationPreference = require('../models/NotificationPreference');
const { auth } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, serverError } = require('../utils/responseHelper');

// ============================================
// BİLDİRİM LİSTESİ VE YÖNETİMİ
// ============================================

/**
 * @route GET /api/notifications
 * @desc Kullanıcının bildirimlerini listele
 * @access Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { page, limit, type, unreadOnly } = req.query;
    const result = await notificationService.getNotifications(req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
      unreadOnly: unreadOnly === 'true'
    });

    return successResponse(res, {
      data: result,
      message: 'Bildirimler başarıyla getirildi'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirimler getirilemedi');
  }
});

/**
 * @route GET /api/notifications/unread-count
 * @desc Okunmamış bildirim sayısını getir
 * @access Private
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    return successResponse(res, {
      data: { count },
      message: 'Okunmamış bildirim sayısı'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirim sayısı alınamadı');
  }
});

/**
 * @route GET /api/notifications/:id
 * @desc Tek bir bildirimi getir
 * @access Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      isDeleted: false
    });

    if (!notification) {
      return notFound(res, 'Bildirim bulunamadı');
    }

    return successResponse(res, {
      data: notification,
      message: 'Bildirim detayı'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirim getirilemedi');
  }
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Bildirimi okundu olarak işaretle
 * @access Private
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);

    if (!notification) {
      return notFound(res, 'Bildirim bulunamadı');
    }

    return successResponse(res, {
      data: notification,
      message: 'Bildirim okundu olarak işaretlendi'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirim güncellenemedi');
  }
});

/**
 * @route PUT /api/notifications/read-all
 * @desc Tüm bildirimleri okundu olarak işaretle
 * @access Private
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    return successResponse(res, {
      data: result,
      message: 'Tüm bildirimler okundu olarak işaretlendi'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirimler güncellenemedi');
  }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Bildirimi sil (soft delete)
 * @access Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await notificationService.deleteNotification(req.params.id, req.user._id);

    if (!notification) {
      return notFound(res, 'Bildirim bulunamadı');
    }

    return successResponse(res, {
      data: notification,
      message: 'Bildirim silindi'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirim silinemedi');
  }
});

/**
 * @route DELETE /api/notifications
 * @desc Tüm bildirimleri sil
 * @access Private
 */
router.delete('/', auth, async (req, res) => {
  try {
    const result = await notificationService.deleteAllNotifications(req.user._id);
    return successResponse(res, {
      data: result,
      message: 'Tüm bildirimler silindi'
    });
  } catch (error) {
    return serverError(res, error, 'Bildirimler silinemedi');
  }
});

// ============================================
// CİHAZ TOKEN YÖNETİMİ (MOBİL APP İÇİN)
// ============================================

/**
 * @route POST /api/notifications/device-token
 * @desc Cihaz push token'ı kaydet
 * @access Private
 */
router.post('/device-token', auth, async (req, res) => {
  try {
    const { token, platform, deviceId, deviceName, appVersion, osVersion, provider } = req.body;

    if (!token || !platform || !provider) {
      return errorResponse(res, {
        message: 'Token, platform ve provider zorunludur',
        statusCode: 400
      });
    }

    // Aynı token varsa güncelle
    let deviceToken = await DeviceToken.findOne({ token });

    if (deviceToken) {
      // Mevcut token'ı güncelle
      deviceToken.user = req.user._id;
      deviceToken.platform = platform;
      deviceToken.deviceId = deviceId;
      deviceToken.deviceName = deviceName;
      deviceToken.appVersion = appVersion;
      deviceToken.osVersion = osVersion;
      deviceToken.provider = provider;
      deviceToken.lastUsedAt = new Date();
      deviceToken.isActive = true;
      deviceToken.failureCount = 0;
      deviceToken.lastError = null;
      await deviceToken.save();
    } else {
      // Yeni token oluştur
      deviceToken = await DeviceToken.create({
        user: req.user._id,
        token,
        platform,
        deviceId,
        deviceName,
        appVersion,
        osVersion,
        provider
      });
    }

    return successResponse(res, {
      data: deviceToken,
      message: 'Cihaz token kaydedildi'
    });
  } catch (error) {
    return serverError(res, error, 'Cihaz token kaydedilemedi');
  }
});

/**
 * @route GET /api/notifications/device-tokens
 * @desc Kullanıcının kayıtlı cihazlarını listele
 * @access Private
 */
router.get('/device-tokens', auth, async (req, res) => {
  try {
    const tokens = await DeviceToken.find({
      user: req.user._id,
      isActive: true
    }).select('-token'); // Token'ı güvenlik için gizle

    return successResponse(res, {
      data: tokens,
      message: 'Kayıtlı cihazlar'
    });
  } catch (error) {
    return serverError(res, error, 'Cihazlar getirilemedi');
  }
});

/**
 * @route DELETE /api/notifications/device-token/:token
 * @desc Cihaz token'ı sil (çıkış yaparken)
 * @access Private
 */
router.delete('/device-token/:token', auth, async (req, res) => {
  try {
    await DeviceToken.findOneAndUpdate(
      { token: req.params.token, user: req.user._id },
      { isActive: false }
    );

    return successResponse(res, {
      message: 'Cihaz kaydı silindi'
    });
  } catch (error) {
    return serverError(res, error, 'Cihaz kaydı silinemedi');
  }
});

/**
 * @route DELETE /api/notifications/device-tokens/all
 * @desc Tüm cihaz token'larını sil
 * @access Private
 */
router.delete('/device-tokens/all', auth, async (req, res) => {
  try {
    await DeviceToken.updateMany(
      { user: req.user._id },
      { isActive: false }
    );

    return successResponse(res, {
      message: 'Tüm cihaz kayıtları silindi'
    });
  } catch (error) {
    return serverError(res, error, 'Cihaz kayıtları silinemedi');
  }
});

// ============================================
// BİLDİRİM TERCİHLERİ
// ============================================

/**
 * @route GET /api/notifications/preferences
 * @desc Kullanıcının bildirim tercihlerini getir
 * @access Private
 */
router.get('/preferences', auth, async (req, res) => {
  try {
    const prefs = await notificationService.getUserPreferences(req.user._id);
    return successResponse(res, {
      data: prefs,
      message: 'Bildirim tercihleri'
    });
  } catch (error) {
    return serverError(res, error, 'Tercihler getirilemedi');
  }
});

/**
 * @route PUT /api/notifications/preferences
 * @desc Kullanıcının bildirim tercihlerini güncelle
 * @access Private
 */
router.put('/preferences', auth, async (req, res) => {
  try {
    const { channels, types, quietHours, timezone, language } = req.body;

    const updateData = {};
    if (channels) updateData.channels = channels;
    if (types) updateData.types = types;
    if (quietHours) updateData.quietHours = quietHours;
    if (timezone) updateData.timezone = timezone;
    if (language) updateData.language = language;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return successResponse(res, {
      data: prefs,
      message: 'Bildirim tercihleri güncellendi'
    });
  } catch (error) {
    return serverError(res, error, 'Tercihler güncellenemedi');
  }
});

/**
 * @route PUT /api/notifications/preferences/channel/:channel
 * @desc Tek bir kanalı aç/kapat
 * @access Private
 */
router.put('/preferences/channel/:channel', auth, async (req, res) => {
  try {
    const { channel } = req.params;
    const { enabled } = req.body;

    if (!['push', 'email', 'inApp'].includes(channel)) {
      return errorResponse(res, {
        message: 'Geçersiz kanal',
        statusCode: 400
      });
    }

    // inApp her zaman açık kalmalı
    if (channel === 'inApp' && enabled === false) {
      return errorResponse(res, {
        message: 'Uygulama içi bildirimler kapatılamaz',
        statusCode: 400
      });
    }

    const prefs = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      { $set: { [`channels.${channel}`]: enabled } },
      { new: true, upsert: true }
    );

    return successResponse(res, {
      data: prefs,
      message: `${channel} bildirimleri ${enabled ? 'açıldı' : 'kapatıldı'}`
    });
  } catch (error) {
    return serverError(res, error, 'Kanal güncellenemedi');
  }
});

/**
 * @route PUT /api/notifications/preferences/type/:type
 * @desc Belirli bir bildirim tipinin ayarlarını güncelle
 * @access Private
 */
router.put('/preferences/type/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { push, email } = req.body;

    const validTypes = [
      'LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
      'ADVANCE_REQUEST', 'ADVANCE_APPROVED', 'ADVANCE_REJECTED',
      'OVERTIME_REQUEST', 'OVERTIME_APPROVED', 'OVERTIME_REJECTED',
      'MESSAGE_RECEIVED', 'EMPLOYMENT_STATUS',
      'EXPENSE_REQUEST', 'EXPENSE_APPROVED',
      'SYSTEM', 'REMINDER', 'ANNOUNCEMENT'
    ];

    if (!validTypes.includes(type)) {
      return errorResponse(res, {
        message: 'Geçersiz bildirim tipi',
        statusCode: 400
      });
    }

    const updateData = {};
    if (push !== undefined) updateData[`types.${type}.push`] = push;
    if (email !== undefined) updateData[`types.${type}.email`] = email;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return successResponse(res, {
      data: prefs,
      message: `${type} bildirim ayarları güncellendi`
    });
  } catch (error) {
    return serverError(res, error, 'Ayarlar güncellenemedi');
  }
});

/**
 * @route PUT /api/notifications/preferences/quiet-hours
 * @desc Sessiz saatleri güncelle
 * @access Private
 */
router.put('/preferences/quiet-hours', auth, async (req, res) => {
  try {
    const { enabled, start, end, weekendsQuiet } = req.body;

    const updateData = { quietHours: {} };
    if (enabled !== undefined) updateData.quietHours.enabled = enabled;
    if (start) updateData.quietHours.start = start;
    if (end) updateData.quietHours.end = end;
    if (weekendsQuiet !== undefined) updateData.quietHours.weekendsQuiet = weekendsQuiet;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return successResponse(res, {
      data: prefs,
      message: 'Sessiz saatler güncellendi'
    });
  } catch (error) {
    return serverError(res, error, 'Sessiz saatler güncellenemedi');
  }
});

module.exports = router;
