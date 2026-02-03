const Commission = require('../models/Commission');
const Dealer = require('../models/Dealer');

/**
 * Ödeme sonrası komisyon oluşturur
 * @param {Object} payment - Payment document
 * @param {Object} dealer - Dealer document
 * @returns {Object} Oluşturulan komisyon
 */
const createCommissionFromPayment = async (payment, dealer) => {
  const rate = dealer.commissionRate || 10;
  const baseAmount = payment.amount;
  const commissionAmount = (baseAmount * rate) / 100;

  const commission = await Commission.create({
    dealer: dealer._id,
    subscription: payment.subscription,
    payment: payment._id,
    amount: commissionAmount,
    rate: rate,
    baseAmount: baseAmount,
    status: 'pending'
  });

  // Dealer'ın bekleyen komisyonunu güncelle
  await Dealer.findByIdAndUpdate(dealer._id, {
    $inc: {
      totalCommissionEarned: commissionAmount,
      pendingCommission: commissionAmount
    }
  });

  return commission;
};

/**
 * Komisyonu onaylar
 * @param {String} commissionId - Commission ID
 * @param {String} userId - Onaylayan kullanıcı ID
 * @returns {Object} Güncellenmiş komisyon
 */
const approveCommission = async (commissionId, userId) => {
  const commission = await Commission.findById(commissionId);

  if (!commission) {
    throw new Error('Komisyon bulunamadı');
  }

  if (commission.status !== 'pending') {
    throw new Error('Bu komisyon zaten onaylanmış veya iptal edilmiş');
  }

  commission.status = 'approved';
  commission.approvedAt = new Date();
  commission.approvedBy = userId;
  await commission.save();

  return commission;
};

/**
 * Komisyonu öder
 * @param {String} commissionId - Commission ID
 * @param {Object} paymentData - Ödeme bilgileri
 * @param {String} userId - Ödeyen kullanıcı ID
 * @returns {Object} Güncellenmiş komisyon
 */
const payCommission = async (commissionId, paymentData, userId) => {
  const commission = await Commission.findById(commissionId);

  if (!commission) {
    throw new Error('Komisyon bulunamadı');
  }

  if (commission.status === 'paid') {
    throw new Error('Bu komisyon zaten ödenmiş');
  }

  if (commission.status === 'cancelled') {
    throw new Error('İptal edilmiş komisyon ödenemez');
  }

  // Eğer pending ise önce onayla
  if (commission.status === 'pending') {
    commission.approvedAt = new Date();
    commission.approvedBy = userId;
  }

  commission.status = 'paid';
  commission.paidAt = new Date();
  commission.paidBy = userId;
  commission.paymentMethod = paymentData.paymentMethod || 'bank_transfer';
  commission.paymentReference = paymentData.paymentReference;
  commission.notes = paymentData.notes;
  await commission.save();

  // Dealer'ın bekleyen ve ödenen komisyonunu güncelle
  await Dealer.findByIdAndUpdate(commission.dealer, {
    $inc: {
      pendingCommission: -commission.amount,
      paidCommission: commission.amount
    }
  });

  return commission;
};

/**
 * Komisyonu iptal eder
 * @param {String} commissionId - Commission ID
 * @param {String} reason - İptal sebebi
 * @param {String} userId - İptal eden kullanıcı ID
 * @returns {Object} Güncellenmiş komisyon
 */
const cancelCommission = async (commissionId, reason, userId) => {
  const commission = await Commission.findById(commissionId);

  if (!commission) {
    throw new Error('Komisyon bulunamadı');
  }

  if (commission.status === 'paid') {
    throw new Error('Ödenmiş komisyon iptal edilemez');
  }

  if (commission.status === 'cancelled') {
    throw new Error('Bu komisyon zaten iptal edilmiş');
  }

  const wasPending = commission.status === 'pending' || commission.status === 'approved';

  commission.status = 'cancelled';
  commission.cancelledAt = new Date();
  commission.cancelledBy = userId;
  commission.cancellationReason = reason;
  await commission.save();

  // Dealer'ın komisyon bilgilerini güncelle
  if (wasPending) {
    await Dealer.findByIdAndUpdate(commission.dealer, {
      $inc: {
        totalCommissionEarned: -commission.amount,
        pendingCommission: -commission.amount
      }
    });
  }

  return commission;
};

/**
 * Bayi komisyon istatistiklerini getirir
 * @param {String} dealerId - Dealer ID
 * @returns {Object} İstatistikler
 */
const getDealerCommissionStats = async (dealerId) => {
  const dealer = await Dealer.findById(dealerId);

  if (!dealer) {
    throw new Error('Bayi bulunamadı');
  }

  // Bu ayki komisyonlar
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonthCommissions = await Commission.aggregate([
    {
      $match: {
        dealer: dealer._id,
        createdAt: { $gte: startOfMonth },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Toplam istatistikler
  const totalStats = await Commission.aggregate([
    {
      $match: {
        dealer: dealer._id,
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const statsMap = {};
  totalStats.forEach(stat => {
    statsMap[stat._id] = {
      total: stat.total,
      count: stat.count
    };
  });

  return {
    commissionRate: dealer.commissionRate,
    thisMonth: thisMonthCommissions[0] || { total: 0, count: 0 },
    pending: statsMap.pending || { total: 0, count: 0 },
    approved: statsMap.approved || { total: 0, count: 0 },
    paid: statsMap.paid || { total: 0, count: 0 },
    totalEarned: dealer.totalCommissionEarned,
    totalPending: dealer.pendingCommission,
    totalPaid: dealer.paidCommission
  };
};

/**
 * Tüm bayilerin komisyon özetini getirir (Super Admin için)
 * @returns {Array} Bayi komisyon özetleri
 */
const getAllDealerCommissionSummary = async () => {
  const dealers = await Dealer.find({ isActive: true })
    .select('name commissionRate totalCommissionEarned pendingCommission paidCommission')
    .sort({ pendingCommission: -1 });

  return dealers;
};

/**
 * Toplu komisyon ödeme
 * @param {Array} commissionIds - Komisyon ID'leri
 * @param {Object} paymentData - Ödeme bilgileri
 * @param {String} userId - Ödeyen kullanıcı ID
 * @returns {Object} Sonuç
 */
const bulkPayCommissions = async (commissionIds, paymentData, userId) => {
  const results = {
    success: [],
    failed: []
  };

  for (const commissionId of commissionIds) {
    try {
      const commission = await payCommission(commissionId, paymentData, userId);
      results.success.push(commission);
    } catch (error) {
      results.failed.push({
        id: commissionId,
        error: error.message
      });
    }
  }

  return results;
};

module.exports = {
  createCommissionFromPayment,
  approveCommission,
  payCommission,
  cancelCommission,
  getDealerCommissionStats,
  getAllDealerCommissionSummary,
  bulkPayCommissions
};
