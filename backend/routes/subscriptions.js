const express = require('express');
const router = express.Router();
const DealerSubscription = require('../models/DealerSubscription');
const Dealer = require('../models/Dealer');
const Package = require('../models/Package');
const { auth, requireRole } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const quotaService = require('../services/quotaService');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// GET /api/subscriptions - Tüm abonelikleri listele (super_admin)
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { status, dealerId, page = 1, limit = 20 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (dealerId) {
      query.dealer = dealerId;
    }

    const subscriptions = await DealerSubscription.find(query)
      .populate('dealer', 'name contactEmail contactPhone')
      .populate('package', 'name code employeeLimit monthlyPrice yearlyPrice')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await DealerSubscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Abonelik listesi hatası:', error);
    return serverError(res, error, 'Abonelikler yüklenirken bir hata oluştu');
  }
});

// GET /api/subscriptions/my - Kendi aboneliğimi görüntüle (bayi_admin)
router.get('/my', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const dealerId = req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    const subscription = await DealerSubscription.findOne({
      dealer: dealerId,
      status: 'active'
    })
      .populate('package', 'name code employeeLimit monthlyPrice yearlyPrice features')
      .populate('dealer', 'name contactEmail');

    const quotaSummary = await quotaService.getDealerQuotaSummary(dealerId);

    res.json({
      success: true,
      data: {
        subscription,
        quota: quotaSummary
      }
    });
  } catch (error) {
    console.error('Abonelik görüntüleme hatası:', error);
    return serverError(res, error, 'Abonelik bilgisi yüklenirken bir hata oluştu');
  }
});

// GET /api/subscriptions/dealer/:dealerId - Bayi abonelik geçmişi (super_admin veya kendi bayisi)
router.get('/dealer/:dealerId', auth, async (req, res) => {
  try {
    const { dealerId } = req.params;

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' &&
        req.user.dealer?.toString() !== dealerId) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    const subscriptions = await DealerSubscription.find({ dealer: dealerId })
      .populate('package', 'name code employeeLimit monthlyPrice yearlyPrice')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 });

    const dealer = await Dealer.findById(dealerId).select('name contactEmail subscriptionStatus employeeQuota usedEmployeeQuota');

    res.json({
      success: true,
      data: {
        dealer,
        subscriptions
      }
    });
  } catch (error) {
    console.error('Bayi abonelik geçmişi hatası:', error);
    return serverError(res, error, 'Abonelik geçmişi yüklenirken bir hata oluştu');
  }
});

// GET /api/subscriptions/:id - Tek abonelik detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const subscription = await DealerSubscription.findById(req.params.id)
      .populate('dealer', 'name contactEmail contactPhone')
      .populate('package', 'name code employeeLimit monthlyPrice yearlyPrice features')
      .populate('createdBy', 'email')
      .populate('history.performedBy', 'email');

    if (!subscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' &&
        subscription.dealer._id.toString() !== req.user.dealer?.toString()) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Abonelik detay hatası:', error);
    return serverError(res, error, 'Abonelik yüklenirken bir hata oluştu');
  }
});

// POST /api/subscriptions - Yeni abonelik oluştur (super_admin - manuel)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { dealerId, packageId, billingType, notes } = req.body;

    // Validasyon
    if (!dealerId || !packageId || !billingType) {
      return errorResponse(res, { message: 'Bayi, paket ve ödeme tipi zorunludur' });
    }

    if (!['monthly', 'yearly'].includes(billingType)) {
      return errorResponse(res, { message: 'Geçersiz ödeme tipi' });
    }

    const result = await paymentService.createManualSubscription(
      { dealerId, packageId, billingType, notes },
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Abonelik oluşturuldu',
      data: result
    });
  } catch (error) {
    console.error('Abonelik oluşturma hatası:', error);
    return serverError(res, error, 'Abonelik oluşturulurken bir hata oluştu');
  }
});

// PUT /api/subscriptions/:id - Abonelik güncelle (super_admin)
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { status, autoRenew, notes, employeeQuota } = req.body;

    const subscription = await DealerSubscription.findById(req.params.id);

    if (!subscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    const historyEntry = {
      action: 'updated',
      date: new Date(),
      note: '',
      performedBy: req.user._id
    };

    // Durum değişikliği
    if (status && status !== subscription.status) {
      const oldStatus = subscription.status;
      subscription.status = status;
      historyEntry.note += `Durum: ${oldStatus} -> ${status}. `;

      // Dealer'ı güncelle
      await Dealer.findByIdAndUpdate(subscription.dealer, {
        subscriptionStatus: status === 'active' ? 'active' : status
      });
    }

    // Kota değişikliği
    if (employeeQuota !== undefined && employeeQuota !== subscription.employeeQuota) {
      const oldQuota = subscription.employeeQuota;
      subscription.employeeQuota = employeeQuota;
      historyEntry.note += `Kota: ${oldQuota} -> ${employeeQuota}. `;

      // Dealer'ı güncelle
      await Dealer.findByIdAndUpdate(subscription.dealer, {
        employeeQuota
      });
    }

    if (autoRenew !== undefined) {
      subscription.autoRenew = autoRenew;
    }

    if (notes) {
      subscription.notes = notes;
    }

    if (historyEntry.note) {
      subscription.history.push(historyEntry);
    }

    await subscription.save();

    res.json({
      success: true,
      message: 'Abonelik güncellendi',
      data: subscription
    });
  } catch (error) {
    console.error('Abonelik güncelleme hatası:', error);
    return serverError(res, error, 'Abonelik güncellenirken bir hata oluştu');
  }
});

// POST /api/subscriptions/:id/renew - Abonelik yenile (super_admin)
router.post('/:id/renew', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { billingType } = req.body;

    const oldSubscription = await DealerSubscription.findById(req.params.id)
      .populate('package')
      .populate('dealer');

    if (!oldSubscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    const newBillingType = billingType || oldSubscription.billingType;

    // Mevcut aboneliği iptal et
    oldSubscription.status = 'expired';
    oldSubscription.history.push({
      action: 'expired',
      date: new Date(),
      note: 'Yenileme için kapatıldı',
      performedBy: req.user._id
    });
    await oldSubscription.save();

    // Yeni abonelik oluştur
    const result = await paymentService.createManualSubscription(
      {
        dealerId: oldSubscription.dealer._id,
        packageId: oldSubscription.package._id,
        billingType: newBillingType,
        notes: `Önceki abonelikten yenilendi: ${oldSubscription._id}`
      },
      req.user._id
    );

    // Yenileme kaydını ekle
    result.subscription.history.push({
      action: 'renewed',
      date: new Date(),
      note: `Önceki abonelik: ${oldSubscription._id}`,
      performedBy: req.user._id
    });
    await result.subscription.save();

    res.json({
      success: true,
      message: 'Abonelik yenilendi',
      data: result
    });
  } catch (error) {
    console.error('Abonelik yenileme hatası:', error);
    return serverError(res, error, 'Abonelik yenilenirken bir hata oluştu');
  }
});

// POST /api/subscriptions/:id/upgrade - Paket yükselt (super_admin)
router.post('/:id/upgrade', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { newPackageId, prorateRefund } = req.body;

    if (!newPackageId) {
      return errorResponse(res, { message: 'Yeni paket zorunludur' });
    }

    const oldSubscription = await DealerSubscription.findById(req.params.id)
      .populate('package')
      .populate('dealer');

    if (!oldSubscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    const newPackage = await Package.findById(newPackageId);

    if (!newPackage) {
      return notFound(res, 'Yeni paket bulunamadı');
    }

    if (newPackage.employeeLimit <= oldSubscription.package.employeeLimit) {
      return errorResponse(res, { message: 'Yükseltme için daha yüksek limitli bir paket seçin' });
    }

    // Mevcut aboneliği güncelle
    oldSubscription.status = 'cancelled';
    oldSubscription.history.push({
      action: 'upgraded',
      date: new Date(),
      note: `${newPackage.name} paketine yükseltildi`,
      performedBy: req.user._id
    });
    await oldSubscription.save();

    // Kalan süreyi hesapla ve yeni abonelik oluştur
    const remainingDays = Math.max(0, Math.ceil((new Date(oldSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

    const result = await paymentService.createManualSubscription(
      {
        dealerId: oldSubscription.dealer._id,
        packageId: newPackageId,
        billingType: oldSubscription.billingType,
        notes: `Yükseltme - Önceki paket: ${oldSubscription.package.name}, Kalan gün: ${remainingDays}`
      },
      req.user._id
    );

    // Kalan süreyi ekle (opsiyonel)
    if (remainingDays > 0) {
      result.subscription.endDate = new Date(result.subscription.endDate);
      result.subscription.endDate.setDate(result.subscription.endDate.getDate() + remainingDays);
      await result.subscription.save();
    }

    res.json({
      success: true,
      message: 'Paket yükseltildi',
      data: {
        oldSubscription,
        newSubscription: result.subscription,
        remainingDays
      }
    });
  } catch (error) {
    console.error('Paket yükseltme hatası:', error);
    return serverError(res, error, 'Paket yükseltilirken bir hata oluştu');
  }
});

// POST /api/subscriptions/:id/cancel - Abonelik iptal (super_admin)
router.post('/:id/cancel', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { reason, refund } = req.body;

    const subscription = await DealerSubscription.findById(req.params.id);

    if (!subscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    if (subscription.status === 'cancelled') {
      return errorResponse(res, { message: 'Abonelik zaten iptal edilmiş' });
    }

    subscription.status = 'cancelled';
    subscription.history.push({
      action: 'cancelled',
      date: new Date(),
      note: reason || 'Manuel iptal',
      performedBy: req.user._id
    });
    await subscription.save();

    // Dealer'ı güncelle
    await Dealer.findByIdAndUpdate(subscription.dealer, {
      activeSubscription: null,
      subscriptionStatus: 'none',
      employeeQuota: 0,
      quotaExpiresAt: null
    });

    // İade işlemi (opsiyonel)
    if (refund) {
      const Payment = require('../models/Payment');
      const payment = await Payment.findOne({
        subscription: subscription._id,
        status: 'completed'
      });

      if (payment) {
        await paymentService.refundPayment(payment._id, reason, req.user._id);
      }
    }

    res.json({
      success: true,
      message: 'Abonelik iptal edildi',
      data: subscription
    });
  } catch (error) {
    console.error('Abonelik iptal hatası:', error);
    return serverError(res, error, 'Abonelik iptal edilirken bir hata oluştu');
  }
});

// POST /api/subscriptions/:id/suspend - Abonelik askıya al (super_admin)
router.post('/:id/suspend', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const subscription = await DealerSubscription.findById(req.params.id);

    if (!subscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    if (subscription.status !== 'active') {
      return errorResponse(res, { message: 'Sadece aktif abonelikler askıya alınabilir' });
    }

    subscription.status = 'suspended';
    subscription.history.push({
      action: 'suspended',
      date: new Date(),
      note: reason || 'Askıya alındı',
      performedBy: req.user._id
    });
    await subscription.save();

    // Dealer'ı güncelle
    await Dealer.findByIdAndUpdate(subscription.dealer, {
      subscriptionStatus: 'suspended'
    });

    res.json({
      success: true,
      message: 'Abonelik askıya alındı',
      data: subscription
    });
  } catch (error) {
    console.error('Abonelik askıya alma hatası:', error);
    return serverError(res, error, 'Abonelik askıya alınırken bir hata oluştu');
  }
});

// POST /api/subscriptions/:id/activate - Askıdaki aboneliği aktifleştir (super_admin)
router.post('/:id/activate', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const subscription = await DealerSubscription.findById(req.params.id)
      .populate('package');

    if (!subscription) {
      return notFound(res, 'Abonelik bulunamadı');
    }

    if (subscription.status !== 'suspended') {
      return errorResponse(res, { message: 'Sadece askıdaki abonelikler aktifleştirilebilir' });
    }

    // Süre kontrolü
    if (new Date() > subscription.endDate) {
      return errorResponse(res, { message: 'Abonelik süresi dolmuş. Yenileme yapmanız gerekiyor.' });
    }

    subscription.status = 'active';
    subscription.history.push({
      action: 'activated',
      date: new Date(),
      note: 'Askıdan aktifleştirildi',
      performedBy: req.user._id
    });
    await subscription.save();

    // Dealer'ı güncelle
    await Dealer.findByIdAndUpdate(subscription.dealer, {
      activeSubscription: subscription._id,
      subscriptionStatus: 'active',
      employeeQuota: subscription.employeeQuota,
      quotaExpiresAt: subscription.endDate
    });

    res.json({
      success: true,
      message: 'Abonelik aktifleştirildi',
      data: subscription
    });
  } catch (error) {
    console.error('Abonelik aktifleştirme hatası:', error);
    return serverError(res, error, 'Abonelik aktifleştirilirken bir hata oluştu');
  }
});

// GET /api/subscriptions/stats/overview - Abonelik istatistikleri (super_admin)
router.get('/stats/overview', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const [
      totalActive,
      totalExpired,
      totalSuspended,
      totalRevenue,
      expiringThisMonth
    ] = await Promise.all([
      DealerSubscription.countDocuments({ status: 'active' }),
      DealerSubscription.countDocuments({ status: 'expired' }),
      DealerSubscription.countDocuments({ status: 'suspended' }),
      DealerSubscription.aggregate([
        { $match: { status: { $in: ['active', 'expired'] }, isPaid: true } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]),
      DealerSubscription.countDocuments({
        status: 'active',
        endDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        active: totalActive,
        expired: totalExpired,
        suspended: totalSuspended,
        totalRevenue: totalRevenue[0]?.total || 0,
        expiringThisMonth
      }
    });
  } catch (error) {
    console.error('Abonelik istatistik hatası:', error);
    return serverError(res, error, 'İstatistikler yüklenirken bir hata oluştu');
  }
});

module.exports = router;
