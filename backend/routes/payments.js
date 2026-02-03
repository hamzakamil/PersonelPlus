const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const Dealer = require('../models/Dealer');
const { auth, requireRole } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// GET /api/payments - Tüm ödemeleri listele (super_admin)
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

    const payments = await Payment.find(query)
      .populate('dealer', 'name contactEmail')
      .populate('package', 'name code employeeLimit')
      .populate('subscription', 'status billingType startDate endDate')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ödeme listesi hatası:', error);
    return serverError(res, error, 'Ödemeler yüklenirken bir hata oluştu');
  }
});

// GET /api/payments/my - Kendi ödemelerimi görüntüle (bayi_admin)
router.get('/my', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const dealerId = req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    const payments = await paymentService.getPaymentHistory(dealerId);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Ödeme geçmişi hatası:', error);
    return serverError(res, error, 'Ödeme geçmişi yüklenirken bir hata oluştu');
  }
});

// GET /api/payments/:id - Tek ödeme detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('dealer', 'name contactEmail contactPhone')
      .populate('package', 'name code employeeLimit monthlyPrice yearlyPrice')
      .populate('subscription', 'status billingType startDate endDate employeeQuota')
      .populate('createdBy', 'email');

    if (!payment) {
      return notFound(res, 'Ödeme bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' &&
        payment.dealer._id.toString() !== req.user.dealer?.toString()) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Ödeme detay hatası:', error);
    return serverError(res, error, 'Ödeme yüklenirken bir hata oluştu');
  }
});

// POST /api/payments/create-checkout - Ödeme formu oluştur (bayi_admin)
router.post('/create-checkout', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const { packageId, billingType, callbackUrl } = req.body;

    if (!packageId || !billingType) {
      return errorResponse(res, { message: 'Paket ve ödeme tipi zorunludur' });
    }

    if (!['monthly', 'yearly'].includes(billingType)) {
      return errorResponse(res, { message: 'Geçersiz ödeme tipi' });
    }

    const dealerId = req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    const dealer = await Dealer.findById(dealerId);
    const pkg = await Package.findById(packageId);

    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    if (!pkg) {
      return notFound(res, 'Paket bulunamadı');
    }

    if (!pkg.isActive) {
      return errorResponse(res, { message: 'Bu paket artık satışta değil' });
    }

    // Kullanici IP adresini al
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || '127.0.0.1';

    const result = await paymentService.createCheckoutForm(
      dealer,
      pkg,
      billingType,
      callbackUrl,
      clientIp
    );

    res.json({
      success: true,
      data: {
        checkoutFormContent: result.checkoutFormContent,
        token: result.token,
        paymentId: result.paymentId,
        price: billingType === 'yearly' ? pkg.yearlyPrice : pkg.monthlyPrice
      }
    });
  } catch (error) {
    console.error('Checkout oluşturma hatası:', error);
    return serverError(res, error, 'Ödeme formu oluşturulurken bir hata oluştu');
  }
});

// POST /api/payments/callback - iyzico callback endpoint
router.post('/callback', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).send('Token gerekli');
    }

    const result = await paymentService.handleCallback(token);

    // Başarılı ödeme sonrası redirect
    if (result.success) {
      // Frontend'e başarılı ödeme sayfasına yönlendir
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/success?paymentId=${result.payment._id}`;
      return res.redirect(redirectUrl);
    } else {
      // Başarısız ödeme sayfasına yönlendir
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/failed?error=${encodeURIComponent(result.message)}`;
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Payment callback hatası:', error);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/failed?error=${encodeURIComponent('Ödeme işlemi sırasında bir hata oluştu')}`;
    return res.redirect(redirectUrl);
  }
});

// GET /api/payments/verify/:token - Ödeme doğrulama (frontend için)
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const payment = await Payment.findOne({ iyzicoToken: token })
      .populate('dealer', 'name')
      .populate('package', 'name employeeLimit')
      .populate('subscription', 'status startDate endDate');

    if (!payment) {
      return notFound(res, 'Ödeme bulunamadı');
    }

    res.json({
      success: true,
      data: {
        status: payment.status,
        amount: payment.amount,
        billingType: payment.billingType,
        dealer: payment.dealer,
        package: payment.package,
        subscription: payment.subscription,
        paidAt: payment.paidAt
      }
    });
  } catch (error) {
    console.error('Ödeme doğrulama hatası:', error);
    return serverError(res, error, 'Ödeme doğrulanırken bir hata oluştu');
  }
});

// POST /api/payments/:id/refund - İade işlemi (super_admin)
router.post('/:id/refund', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, { message: 'İade nedeni zorunludur' });
    }

    const result = await paymentService.refundPayment(
      req.params.id,
      reason,
      req.user._id
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('İade hatası:', error);
    return serverError(res, error, 'İade işlemi sırasında bir hata oluştu');
  }
});

// POST /api/payments/manual - Manuel ödeme kaydı (super_admin)
router.post('/manual', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { dealerId, packageId, billingType, amount, notes, paymentMethod } = req.body;

    if (!dealerId || !packageId || !billingType) {
      return errorResponse(res, { message: 'Bayi, paket ve ödeme tipi zorunludur' });
    }

    const dealer = await Dealer.findById(dealerId);
    const pkg = await Package.findById(packageId);

    if (!dealer || !pkg) {
      return notFound(res, 'Bayi veya paket bulunamadı');
    }

    const finalAmount = amount || (billingType === 'yearly' ? pkg.yearlyPrice : pkg.monthlyPrice);

    // Manuel abonelik oluştur
    const result = await paymentService.createManualSubscription(
      { dealerId, packageId, billingType, notes },
      req.user._id
    );

    // Ödeme kaydını güncelle
    result.payment.amount = finalAmount;
    result.payment.paymentMethod = paymentMethod || 'manual';
    await result.payment.save();

    res.status(201).json({
      success: true,
      message: 'Manuel ödeme ve abonelik oluşturuldu',
      data: result
    });
  } catch (error) {
    console.error('Manuel ödeme hatası:', error);
    return serverError(res, error, 'Manuel ödeme oluşturulurken bir hata oluştu');
  }
});

// GET /api/payments/stats/revenue - Gelir istatistikleri (super_admin)
router.get('/stats/revenue', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchQuery = { status: 'completed' };

    if (startDate || endDate) {
      matchQuery.paidAt = {};
      if (startDate) matchQuery.paidAt.$gte = new Date(startDate);
      if (endDate) matchQuery.paidAt.$lte = new Date(endDate);
    }

    const [
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      revenueByMonth
    ] = await Promise.all([
      Payment.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...matchQuery, billingType: 'monthly' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...matchQuery, billingType: 'yearly' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$paidAt' },
              month: { $month: '$paidAt' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total: {
          revenue: totalRevenue[0]?.total || 0,
          count: totalRevenue[0]?.count || 0
        },
        monthly: {
          revenue: monthlyRevenue[0]?.total || 0,
          count: monthlyRevenue[0]?.count || 0
        },
        yearly: {
          revenue: yearlyRevenue[0]?.total || 0,
          count: yearlyRevenue[0]?.count || 0
        },
        byMonth: revenueByMonth.map(item => ({
          year: item._id.year,
          month: item._id.month,
          revenue: item.total,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Gelir istatistik hatası:', error);
    return serverError(res, error, 'İstatistikler yüklenirken bir hata oluştu');
  }
});

module.exports = router;
