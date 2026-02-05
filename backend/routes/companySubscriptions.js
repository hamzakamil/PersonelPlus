/**
 * Şirket Abonelik Yönetimi Route'ları
 *
 * Bayi → Şirket arası abonelik yönetimi için API endpoint'leri
 *
 * Roller:
 * - bayi_admin: Kendi şirketlerinin aboneliklerini yönetir
 * - super_admin: Tüm şirket aboneliklerini görüntüleyebilir
 */

const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Dealer = require('../models/Dealer');
const { auth: authMiddleware } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require('../utils/responseHelper');

/**
 * Bayinin şirketlerinin abonelik listesi
 * GET /api/company-subscriptions
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, dealer: userDealer } = req.user;
    const roleName = role?.name || role; // role obje veya string olabilir
    const { status, billingType, expiringDays, page = 1, limit = 20 } = req.query;

    let query = {};

    // Rol bazlı filtreleme
    if (roleName === 'super_admin') {
      // Super admin tüm şirketleri görebilir
      if (req.query.dealer) {
        query.dealer = req.query.dealer;
      }
    } else if (roleName === 'bayi_admin') {
      // Bayi sadece kendi şirketlerini görebilir
      query.dealer = userDealer;
    } else {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    // Durum filtresi
    if (status) {
      query['subscription.status'] = status;
    }

    // Faturalama tipi filtresi
    if (billingType) {
      query['subscription.billingType'] = billingType;
    }

    // Süresi dolmak üzere olanlar (X gün içinde)
    if (expiringDays) {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + parseInt(expiringDays));
      query['subscription.endDate'] = {
        $gte: new Date(),
        $lte: expiringDate,
      };
      query['subscription.status'] = 'active';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [companies, total] = await Promise.all([
      Company.find(query)
        .select('name contactEmail contactPhone isActive subscription quota createdAt')
        .sort({ 'subscription.endDate': 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Company.countDocuments(query),
    ]);

    // İstatistikler
    const statsQuery =
      roleName === 'super_admin' && req.query.dealer
        ? { dealer: req.query.dealer }
        : roleName === 'bayi_admin'
          ? { dealer: userDealer }
          : {};

    const stats = await Company.aggregate([
      { $match: statsQuery },
      {
        $group: {
          _id: '$subscription.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {
      active: 0,
      pending_payment: 0,
      expired: 0,
      suspended: 0,
      trial: 0,
      unlimited: 0,
    };

    stats.forEach(s => {
      if (s._id) {
        statsMap[s._id] = s.count;
      }
    });

    // Sınırsız abonelikleri say (billingType = unlimited)
    const unlimitedCount = await Company.countDocuments({
      ...statsQuery,
      'subscription.billingType': 'unlimited',
    });
    statsMap.unlimited = unlimitedCount;

    return successResponse(res, {
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats: statsMap,
    });
  } catch (error) {
    console.error('Şirket abonelik listesi hatası:', error);
    return errorResponse(res, 'Şirket abonelikleri getirilemedi', 500, [error.message]);
  }
});

/**
 * Şirket abonelik detayı
 * GET /api/company-subscriptions/:companyId
 */
router.get('/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { role, dealer: userDealer } = req.user;
    const roleName = role?.name || role;

    const company = await Company.findById(companyId)
      .select(
        'name contactEmail contactPhone address taxOffice taxNumber isActive isActivated subscription quota dealer createdAt'
      )
      .populate('dealer', 'name contactEmail')
      .lean();

    if (!company) {
      return notFoundResponse(res, 'Şirket bulunamadı');
    }

    // Yetki kontrolü
    if (roleName === 'bayi_admin' && company.dealer._id.toString() !== userDealer.toString()) {
      return forbiddenResponse(res, 'Bu şirketi görüntüleme yetkiniz yok');
    }

    return successResponse(res, company);
  } catch (error) {
    console.error('Şirket abonelik detayı hatası:', error);
    return errorResponse(res, 'Şirket abonelik detayı getirilemedi', 500, [error.message]);
  }
});

/**
 * Şirket aboneliği başlat/güncelle
 * POST /api/company-subscriptions/:companyId/activate
 *
 * Body:
 * - billingType: 'monthly' | 'yearly' | 'unlimited'
 * - price: number (opsiyonel)
 * - startDate: Date (opsiyonel, varsayılan: bugün)
 * - autoRenew: boolean (opsiyonel)
 * - notes: string (opsiyonel)
 */
router.post('/:companyId/activate', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { role, dealer: userDealer, _id: userId } = req.user;
    const roleName = role?.name || role;
    const { billingType, price = 0, startDate, autoRenew = false, notes = '' } = req.body;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return notFoundResponse(res, 'Şirket bulunamadı');
    }

    // Bayi yetki kontrolü
    if (roleName === 'bayi_admin' && company.dealer.toString() !== userDealer.toString()) {
      return forbiddenResponse(res, 'Bu şirket üzerinde işlem yapma yetkiniz yok');
    }

    // Billingtype zorunlu
    if (!billingType || !['monthly', 'yearly', 'unlimited'].includes(billingType)) {
      return errorResponse(
        res,
        'Geçerli bir faturalama tipi seçin (monthly, yearly, unlimited)',
        400
      );
    }

    const now = new Date();
    const subscriptionStartDate = startDate ? new Date(startDate) : now;
    let subscriptionEndDate = null;

    // Bitiş tarihini hesapla
    if (billingType === 'monthly') {
      subscriptionEndDate = new Date(subscriptionStartDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else if (billingType === 'yearly') {
      subscriptionEndDate = new Date(subscriptionStartDate);
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    }
    // unlimited için endDate null kalır

    // Önceki durum
    const previousStatus = company.subscription?.status;
    const previousEndDate = company.subscription?.endDate;

    // Abonelik güncelle
    company.subscription = {
      ...company.subscription,
      status: 'active',
      billingType,
      startDate: subscriptionStartDate,
      endDate: subscriptionEndDate,
      price,
      isPaid: true,
      paidAt: now,
      autoRenew,
      lastWarningAt: null,
      warningCount: 0,
      suspendedAt: null,
      notes,
      history: [
        ...(company.subscription?.history || []),
        {
          action: previousStatus ? 'renewed' : 'created',
          date: now,
          note: `Abonelik ${previousStatus ? 'yenilendi' : 'başlatıldı'}: ${billingType}`,
          previousEndDate,
          newEndDate: subscriptionEndDate,
          amount: price,
          performedBy: userId,
        },
      ],
    };

    // Şirketi aktif yap
    company.isActive = true;

    await company.save();

    return successResponse(res, {
      message: 'Şirket aboneliği başarıyla aktifleştirildi',
      subscription: company.subscription,
    });
  } catch (error) {
    console.error('Şirket abonelik aktivasyonu hatası:', error);
    return errorResponse(res, 'Şirket aboneliği aktifleştirilemedi', 500, [error.message]);
  }
});

/**
 * Abonelik süresini uzat
 * POST /api/company-subscriptions/:companyId/extend
 *
 * Body:
 * - months: number (kaç ay uzatılacak, billingType monthly için)
 * - years: number (kaç yıl uzatılacak, billingType yearly için)
 * - price: number (opsiyonel)
 * - notes: string (opsiyonel)
 */
router.post('/:companyId/extend', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { role, dealer: userDealer, _id: userId } = req.user;
    const roleName = role?.name || role;
    const { months, years, price = 0, notes = '' } = req.body;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return notFoundResponse(res, 'Şirket bulunamadı');
    }

    // Bayi yetki kontrolü
    if (roleName === 'bayi_admin' && company.dealer.toString() !== userDealer.toString()) {
      return forbiddenResponse(res, 'Bu şirket üzerinde işlem yapma yetkiniz yok');
    }

    // Sınırsız abonelik uzatılamaz
    if (company.subscription?.billingType === 'unlimited') {
      return errorResponse(res, 'Sınırsız abonelikler için uzatma yapılamaz', 400);
    }

    const now = new Date();
    const previousEndDate = company.subscription?.endDate || now;
    let newEndDate = new Date(previousEndDate);

    // Süre uzatma
    if (months && company.subscription?.billingType === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));
    } else if (years && company.subscription?.billingType === 'yearly') {
      newEndDate.setFullYear(newEndDate.getFullYear() + parseInt(years));
    } else if (months) {
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));
    } else if (years) {
      newEndDate.setFullYear(newEndDate.getFullYear() + parseInt(years));
    } else {
      return errorResponse(res, 'Uzatma süresi belirtin (months veya years)', 400);
    }

    // Abonelik güncelle
    company.subscription.endDate = newEndDate;
    company.subscription.status = 'active';
    company.subscription.isPaid = true;
    company.subscription.paidAt = now;
    company.subscription.lastWarningAt = null;
    company.subscription.warningCount = 0;
    company.subscription.suspendedAt = null;

    company.subscription.history.push({
      action: 'extended',
      date: now,
      note: notes || `Abonelik ${months ? months + ' ay' : years + ' yıl'} uzatıldı`,
      previousEndDate,
      newEndDate,
      amount: price,
      performedBy: userId,
    });

    company.isActive = true;

    await company.save();

    return successResponse(res, {
      message: 'Abonelik süresi başarıyla uzatıldı',
      subscription: company.subscription,
    });
  } catch (error) {
    console.error('Abonelik uzatma hatası:', error);
    return errorResponse(res, 'Abonelik uzatılamadı', 500, [error.message]);
  }
});

/**
 * Ödeme al (mevcut dönem için)
 * POST /api/company-subscriptions/:companyId/payment
 *
 * Body:
 * - amount: number
 * - notes: string (opsiyonel)
 */
router.post('/:companyId/payment', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { role, dealer: userDealer, _id: userId } = req.user;
    const roleName = role?.name || role;
    const { amount, notes = '' } = req.body;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return notFoundResponse(res, 'Şirket bulunamadı');
    }

    // Bayi yetki kontrolü
    if (roleName === 'bayi_admin' && company.dealer.toString() !== userDealer.toString()) {
      return forbiddenResponse(res, 'Bu şirket üzerinde işlem yapma yetkiniz yok');
    }

    if (!amount || amount <= 0) {
      return errorResponse(res, 'Geçerli bir tutar girin', 400);
    }

    const now = new Date();

    // Ödeme durumunu güncelle
    company.subscription.isPaid = true;
    company.subscription.paidAt = now;
    company.subscription.status = 'active';
    company.subscription.lastWarningAt = null;
    company.subscription.warningCount = 0;
    company.subscription.suspendedAt = null;

    company.subscription.history.push({
      action: 'payment_received',
      date: now,
      note: notes || 'Ödeme alındı',
      amount,
      performedBy: userId,
    });

    company.isActive = true;

    await company.save();

    return successResponse(res, {
      message: 'Ödeme başarıyla kaydedildi',
      subscription: company.subscription,
    });
  } catch (error) {
    console.error('Ödeme kaydetme hatası:', error);
    return errorResponse(res, 'Ödeme kaydedilemedi', 500, [error.message]);
  }
});

/**
 * Aboneliği askıya al
 * POST /api/company-subscriptions/:companyId/suspend
 *
 * Body:
 * - reason: string (opsiyonel)
 */
router.post('/:companyId/suspend', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { role, dealer: userDealer, _id: userId } = req.user;
    const roleName = role?.name || role;
    const { reason = '' } = req.body;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return notFoundResponse(res, 'Şirket bulunamadı');
    }

    // Bayi yetki kontrolü
    if (roleName === 'bayi_admin' && company.dealer.toString() !== userDealer.toString()) {
      return forbiddenResponse(res, 'Bu şirket üzerinde işlem yapma yetkiniz yok');
    }

    const now = new Date();

    company.subscription.status = 'suspended';
    company.subscription.suspendedAt = now;

    company.subscription.history.push({
      action: 'suspended',
      date: now,
      note: reason || 'Abonelik askıya alındı',
      performedBy: userId,
    });

    company.isActive = false;

    await company.save();

    return successResponse(res, {
      message: 'Abonelik askıya alındı',
      subscription: company.subscription,
    });
  } catch (error) {
    console.error('Abonelik askıya alma hatası:', error);
    return errorResponse(res, 'Abonelik askıya alınamadı', 500, [error.message]);
  }
});

/**
 * Abonelik geçmişi
 * GET /api/company-subscriptions/:companyId/history
 */
router.get('/:companyId/history', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { role, dealer: userDealer } = req.user;
    const roleName = role?.name || role;

    const company = await Company.findById(companyId)
      .select('name subscription.history')
      .populate('subscription.history.performedBy', 'name email')
      .lean();

    if (!company) {
      return notFoundResponse(res, 'Şirket bulunamadı');
    }

    // Yetki kontrolü
    if (roleName === 'bayi_admin') {
      const companyFull = await Company.findById(companyId).select('dealer').lean();
      if (companyFull.dealer.toString() !== userDealer.toString()) {
        return forbiddenResponse(res, 'Bu şirketi görüntüleme yetkiniz yok');
      }
    }

    // Geçmişi tarihe göre sırala (yeniden eskiye)
    const history = (company.subscription?.history || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return successResponse(res, {
      companyName: company.name,
      history,
    });
  } catch (error) {
    console.error('Abonelik geçmişi hatası:', error);
    return errorResponse(res, 'Abonelik geçmişi getirilemedi', 500, [error.message]);
  }
});

/**
 * Toplu abonelik durumu güncelle (bayi için)
 * POST /api/company-subscriptions/bulk-status
 *
 * Body:
 * - companyIds: string[]
 * - status: 'active' | 'suspended'
 * - reason: string (opsiyonel)
 */
router.post('/bulk-status', authMiddleware, async (req, res) => {
  try {
    const { role, dealer: userDealer, _id: userId } = req.user;
    const roleName = role?.name || role;
    const { companyIds, status, reason = '' } = req.body;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return errorResponse(res, 'Şirket seçin', 400);
    }

    if (!['active', 'suspended'].includes(status)) {
      return errorResponse(res, 'Geçerli bir durum seçin (active, suspended)', 400);
    }

    const now = new Date();
    let query = { _id: { $in: companyIds } };

    // Bayi sadece kendi şirketlerini güncelleyebilir
    if (roleName === 'bayi_admin') {
      query.dealer = userDealer;
    }

    const companies = await Company.find(query);

    if (companies.length === 0) {
      return notFoundResponse(res, 'Güncellenecek şirket bulunamadı');
    }

    const results = {
      success: 0,
      failed: 0,
    };

    for (const company of companies) {
      try {
        company.subscription.status = status;
        company.isActive = status === 'active';

        if (status === 'suspended') {
          company.subscription.suspendedAt = now;
        } else {
          company.subscription.suspendedAt = null;
        }

        company.subscription.history.push({
          action: status === 'active' ? 'activated' : 'suspended',
          date: now,
          note: reason || `Toplu ${status === 'active' ? 'aktivasyon' : 'askıya alma'}`,
          performedBy: userId,
        });

        await company.save();
        results.success++;
      } catch (err) {
        console.error(`Şirket güncelleme hatası (${company._id}):`, err.message);
        results.failed++;
      }
    }

    return successResponse(res, {
      message: `${results.success} şirket güncellendi`,
      results,
    });
  } catch (error) {
    console.error('Toplu durum güncelleme hatası:', error);
    return errorResponse(res, 'Toplu güncelleme yapılamadı', 500, [error.message]);
  }
});

/**
 * Süresi dolmak üzere olan şirketler (uyarı listesi)
 * GET /api/company-subscriptions/expiring
 */
router.get('/reports/expiring', authMiddleware, async (req, res) => {
  try {
    const { role, dealer: userDealer } = req.user;
    const roleName = role?.name || role;
    const { days = 7 } = req.query;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + parseInt(days));

    let query = {
      'subscription.endDate': {
        $gte: new Date(),
        $lte: expiringDate,
      },
      'subscription.status': 'active',
      'subscription.billingType': { $ne: 'unlimited' },
    };

    if (roleName === 'bayi_admin') {
      query.dealer = userDealer;
    }

    const companies = await Company.find(query)
      .select(
        'name contactEmail contactPhone subscription.endDate subscription.billingType subscription.price'
      )
      .sort({ 'subscription.endDate': 1 })
      .lean();

    // Her şirket için kalan günü hesapla
    const result = companies.map(c => ({
      ...c,
      daysRemaining: Math.ceil(
        (new Date(c.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return successResponse(res, result);
  } catch (error) {
    console.error('Süre dolum raporu hatası:', error);
    return errorResponse(res, 'Rapor getirilemedi', 500, [error.message]);
  }
});

/**
 * Ödeme bekleyen şirketler
 * GET /api/company-subscriptions/pending-payments
 */
router.get('/reports/pending-payments', authMiddleware, async (req, res) => {
  try {
    const { role, dealer: userDealer } = req.user;
    const roleName = role?.name || role;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    let query = {
      'subscription.status': 'pending_payment',
    };

    if (roleName === 'bayi_admin') {
      query.dealer = userDealer;
    }

    const companies = await Company.find(query)
      .select('name contactEmail contactPhone subscription')
      .sort({ 'subscription.endDate': 1 })
      .lean();

    return successResponse(res, companies);
  } catch (error) {
    console.error('Ödeme bekleyen şirketler hatası:', error);
    return errorResponse(res, 'Rapor getirilemedi', 500, [error.message]);
  }
});

/**
 * Abonelik istatistikleri (özet)
 * GET /api/company-subscriptions/stats
 */
router.get('/reports/stats', authMiddleware, async (req, res) => {
  try {
    const { role, dealer: userDealer } = req.user;
    const roleName = role?.name || role;

    if (roleName !== 'bayi_admin' && roleName !== 'super_admin') {
      return forbiddenResponse(res, 'Bu işlem için yetkiniz yok');
    }

    let matchStage = {};
    if (roleName === 'bayi_admin') {
      matchStage.dealer = userDealer;
    }

    const stats = await Company.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCompanies: { $sum: 1 },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$subscription.status', 'pending_payment'] }, 1, 0] },
          },
          expiredSubscriptions: {
            $sum: { $cond: [{ $eq: ['$subscription.status', 'expired'] }, 1, 0] },
          },
          suspendedSubscriptions: {
            $sum: { $cond: [{ $eq: ['$subscription.status', 'suspended'] }, 1, 0] },
          },
          monthlySubscriptions: {
            $sum: { $cond: [{ $eq: ['$subscription.billingType', 'monthly'] }, 1, 0] },
          },
          yearlySubscriptions: {
            $sum: { $cond: [{ $eq: ['$subscription.billingType', 'yearly'] }, 1, 0] },
          },
          unlimitedSubscriptions: {
            $sum: { $cond: [{ $eq: ['$subscription.billingType', 'unlimited'] }, 1, 0] },
          },
          totalMonthlyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$subscription.billingType', 'monthly'] },
                    { $eq: ['$subscription.status', 'active'] },
                  ],
                },
                '$subscription.price',
                0,
              ],
            },
          },
          totalYearlyRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$subscription.billingType', 'yearly'] },
                    { $eq: ['$subscription.status', 'active'] },
                  ],
                },
                '$subscription.price',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Süresi 7 gün içinde dolacak şirket sayısı
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 7);

    const expiringQuery = {
      'subscription.endDate': {
        $gte: new Date(),
        $lte: expiringDate,
      },
      'subscription.status': 'active',
      'subscription.billingType': { $ne: 'unlimited' },
    };

    if (roleName === 'bayi_admin') {
      expiringQuery.dealer = userDealer;
    }

    const expiringSoon = await Company.countDocuments(expiringQuery);

    return successResponse(res, {
      ...(stats[0] || {
        totalCompanies: 0,
        activeSubscriptions: 0,
        pendingPayments: 0,
        expiredSubscriptions: 0,
        suspendedSubscriptions: 0,
        monthlySubscriptions: 0,
        yearlySubscriptions: 0,
        unlimitedSubscriptions: 0,
        totalMonthlyRevenue: 0,
        totalYearlyRevenue: 0,
      }),
      expiringSoon,
    });
  } catch (error) {
    console.error('Abonelik istatistikleri hatası:', error);
    return errorResponse(res, 'İstatistikler getirilemedi', 500, [error.message]);
  }
});

module.exports = router;
