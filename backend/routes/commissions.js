const express = require('express');
const router = express.Router();
const Commission = require('../models/Commission');
const Dealer = require('../models/Dealer');
const { auth, requireRole } = require('../middleware/auth');
const commissionService = require('../services/commissionService');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// GET /api/commissions - Tüm komisyonları listele (super_admin)
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

    const commissions = await Commission.find(query)
      .populate('dealer', 'name contactEmail commissionRate')
      .populate('payment', 'amount billingType paidAt')
      .populate('subscription', 'status billingType')
      .populate('approvedBy', 'email')
      .populate('paidBy', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Commission.countDocuments(query);

    res.json({
      success: true,
      data: commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Komisyon listesi hatası:', error);
    return serverError(res, error, 'Komisyonlar yüklenirken bir hata oluştu');
  }
});

// GET /api/commissions/my - Kendi komisyonlarım (bayi_admin)
router.get('/my', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const dealerId = req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    const { status, page = 1, limit = 20 } = req.query;

    let query = { dealer: dealerId };

    if (status) {
      query.status = status;
    }

    const commissions = await Commission.find(query)
      .populate('payment', 'amount billingType paidAt')
      .populate('subscription', 'status billingType startDate endDate')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Commission.countDocuments(query);

    res.json({
      success: true,
      data: commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Komisyon listesi hatası:', error);
    return serverError(res, error, 'Komisyonlar yüklenirken bir hata oluştu');
  }
});

// GET /api/commissions/stats - Komisyon istatistikleri (bayi_admin)
router.get('/stats', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const dealerId = req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    const stats = await commissionService.getDealerCommissionStats(dealerId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Komisyon istatistik hatası:', error);
    return serverError(res, error, 'İstatistikler yüklenirken bir hata oluştu');
  }
});

// GET /api/commissions/summary - Tüm bayilerin komisyon özeti (super_admin)
router.get('/summary', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const summary = await commissionService.getAllDealerCommissionSummary();

    // Toplam istatistikler
    const totalPending = summary.reduce((sum, d) => sum + (d.pendingCommission || 0), 0);
    const totalPaid = summary.reduce((sum, d) => sum + (d.paidCommission || 0), 0);
    const totalEarned = summary.reduce((sum, d) => sum + (d.totalCommissionEarned || 0), 0);

    res.json({
      success: true,
      data: {
        dealers: summary,
        totals: {
          pending: totalPending,
          paid: totalPaid,
          earned: totalEarned
        }
      }
    });
  } catch (error) {
    console.error('Komisyon özet hatası:', error);
    return serverError(res, error, 'Özet yüklenirken bir hata oluştu');
  }
});

// GET /api/commissions/:id - Tek komisyon detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('dealer', 'name contactEmail contactPhone commissionRate')
      .populate('payment', 'amount billingType paidAt cardType cardLastFour')
      .populate('subscription', 'status billingType startDate endDate employeeQuota')
      .populate('approvedBy', 'email')
      .populate('paidBy', 'email')
      .populate('cancelledBy', 'email');

    if (!commission) {
      return notFound(res, 'Komisyon bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name !== 'super_admin' &&
        commission.dealer._id.toString() !== req.user.dealer?.toString()) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    console.error('Komisyon detay hatası:', error);
    return serverError(res, error, 'Komisyon yüklenirken bir hata oluştu');
  }
});

// POST /api/commissions/:id/approve - Komisyon onayla (super_admin)
router.post('/:id/approve', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const commission = await commissionService.approveCommission(
      req.params.id,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Komisyon onaylandı',
      data: commission
    });
  } catch (error) {
    console.error('Komisyon onay hatası:', error);
    return serverError(res, error, error.message || 'Onay işlemi sırasında bir hata oluştu');
  }
});

// POST /api/commissions/:id/pay - Komisyon öde (super_admin)
router.post('/:id/pay', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { paymentMethod, paymentReference, notes } = req.body;

    if (!paymentReference) {
      return errorResponse(res, { message: 'Ödeme referansı (dekont no) zorunludur' });
    }

    const commission = await commissionService.payCommission(
      req.params.id,
      { paymentMethod, paymentReference, notes },
      req.user._id
    );

    res.json({
      success: true,
      message: 'Komisyon ödendi',
      data: commission
    });
  } catch (error) {
    console.error('Komisyon ödeme hatası:', error);
    return serverError(res, error, error.message || 'Ödeme işlemi sırasında bir hata oluştu');
  }
});

// POST /api/commissions/bulk-pay - Toplu komisyon öde (super_admin)
router.post('/bulk-pay', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { commissionIds, paymentMethod, paymentReference, notes } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return errorResponse(res, { message: 'Komisyon ID listesi zorunludur' });
    }

    if (!paymentReference) {
      return errorResponse(res, { message: 'Ödeme referansı (dekont no) zorunludur' });
    }

    const results = await commissionService.bulkPayCommissions(
      commissionIds,
      { paymentMethod, paymentReference, notes },
      req.user._id
    );

    res.json({
      success: true,
      message: `${results.success.length} komisyon ödendi, ${results.failed.length} başarısız`,
      data: results
    });
  } catch (error) {
    console.error('Toplu ödeme hatası:', error);
    return serverError(res, error, 'Toplu ödeme işlemi sırasında bir hata oluştu');
  }
});

// POST /api/commissions/:id/cancel - Komisyon iptal (super_admin)
router.post('/:id/cancel', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, { message: 'İptal nedeni zorunludur' });
    }

    const commission = await commissionService.cancelCommission(
      req.params.id,
      reason,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Komisyon iptal edildi',
      data: commission
    });
  } catch (error) {
    console.error('Komisyon iptal hatası:', error);
    return serverError(res, error, error.message || 'İptal işlemi sırasında bir hata oluştu');
  }
});

// PUT /api/commissions/dealer/:dealerId/rate - Bayi komisyon oranı güncelle (super_admin)
router.put('/dealer/:dealerId/rate', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { rate } = req.body;

    if (rate === undefined || rate < 0 || rate > 100) {
      return errorResponse(res, { message: 'Komisyon oranı 0-100 arasında olmalıdır' });
    }

    const dealer = await Dealer.findByIdAndUpdate(
      req.params.dealerId,
      { commissionRate: rate },
      { new: true }
    );

    if (!dealer) {
      return notFound(res, 'Bayi bulunamadı');
    }

    res.json({
      success: true,
      message: 'Komisyon oranı güncellendi',
      data: {
        dealerId: dealer._id,
        name: dealer.name,
        commissionRate: dealer.commissionRate
      }
    });
  } catch (error) {
    console.error('Komisyon oranı güncelleme hatası:', error);
    return serverError(res, error, 'Güncelleme işlemi sırasında bir hata oluştu');
  }
});

module.exports = router;
