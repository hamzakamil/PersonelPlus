const Campaign = require('../models/Campaign');
const Package = require('../models/Package');

/**
 * Kampanya kodunu doğrula
 * @param {String} code - Kampanya kodu
 * @param {String} dealerId - Bayi ID
 * @param {String} packageId - Paket ID
 * @param {String} billingType - Faturalama tipi (monthly/yearly)
 * @param {Number} amount - Orijinal tutar
 * @returns {Object} Doğrulama sonucu
 */
const validateCampaignCode = async (code, dealerId, packageId, billingType, amount) => {
  const campaign = await Campaign.findOne({
    code: code.toUpperCase(),
    isActive: true
  });

  if (!campaign) {
    return {
      valid: false,
      message: 'Geçersiz kampanya kodu'
    };
  }

  // Tarih kontrolü
  const now = new Date();
  if (now < campaign.startDate) {
    return {
      valid: false,
      message: 'Bu kampanya henüz başlamamış'
    };
  }
  if (now > campaign.endDate) {
    return {
      valid: false,
      message: 'Bu kampanyanın süresi dolmuş'
    };
  }

  // Kullanım limiti kontrolü
  if (campaign.maxUses !== null && campaign.usedCount >= campaign.maxUses) {
    return {
      valid: false,
      message: 'Bu kampanyanın kullanım limiti dolmuş'
    };
  }

  // Bayi kullanım kontrolü
  if (!campaign.canBeUsedByDealer(dealerId)) {
    return {
      valid: false,
      message: 'Bu kampanyayı daha önce kullandınız'
    };
  }

  // Paket kontrolü
  if (campaign.applicablePackages.length > 0) {
    const isPackageApplicable = campaign.applicablePackages.some(
      p => p.toString() === packageId.toString()
    );
    if (!isPackageApplicable) {
      return {
        valid: false,
        message: 'Bu kampanya seçili paket için geçerli değil'
      };
    }
  }

  // Faturalama tipi kontrolü
  if (campaign.applicableBillingTypes.length > 0) {
    if (!campaign.applicableBillingTypes.includes(billingType)) {
      return {
        valid: false,
        message: `Bu kampanya sadece ${campaign.applicableBillingTypes.join(' ve ')} abonelikler için geçerli`
      };
    }
  }

  // Minimum tutar kontrolü
  if (amount < campaign.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum sipariş tutarı: ${campaign.minOrderAmount} TL`
    };
  }

  // İndirim hesapla
  const discount = campaign.calculateDiscount(amount);
  const finalAmount = Math.max(0, amount - discount);

  return {
    valid: true,
    campaign: {
      _id: campaign._id,
      name: campaign.name,
      code: campaign.code,
      type: campaign.type,
      discountPercent: campaign.discountPercent,
      discountAmount: campaign.discountAmount,
      trialDays: campaign.trialDays
    },
    originalAmount: amount,
    discount: discount,
    finalAmount: finalAmount,
    message: campaign.type === 'trial'
      ? `${campaign.trialDays} günlük ücretsiz deneme`
      : `${discount.toFixed(2)} TL indirim uygulandı`
  };
};

/**
 * Kampanya kullanımını kaydet
 * @param {String} campaignId - Kampanya ID
 * @param {String} dealerId - Bayi ID
 * @param {String} paymentId - Ödeme ID
 * @param {Number} discountApplied - Uygulanan indirim
 */
const recordCampaignUsage = async (campaignId, dealerId, paymentId, discountApplied) => {
  await Campaign.findByIdAndUpdate(campaignId, {
    $inc: { usedCount: 1 },
    $push: {
      usageHistory: {
        dealer: dealerId,
        payment: paymentId,
        discountApplied: discountApplied,
        usedAt: new Date()
      }
    }
  });
};

/**
 * Aktif kampanyaları getir (genel)
 * @returns {Array} Aktif kampanyalar
 */
const getActiveCampaigns = async () => {
  const now = new Date();

  return Campaign.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
  .select('-usageHistory')
  .sort({ createdAt: -1 });
};

/**
 * Kampanya istatistiklerini getir
 * @param {String} campaignId - Kampanya ID
 * @returns {Object} İstatistikler
 */
const getCampaignStats = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId)
    .populate('usageHistory.dealer', 'name')
    .populate('applicablePackages', 'name');

  if (!campaign) {
    throw new Error('Kampanya bulunamadı');
  }

  const totalDiscount = campaign.usageHistory.reduce(
    (sum, h) => sum + (h.discountApplied || 0), 0
  );

  return {
    campaign: {
      _id: campaign._id,
      name: campaign.name,
      code: campaign.code,
      type: campaign.type,
      isActive: campaign.isActive,
      startDate: campaign.startDate,
      endDate: campaign.endDate
    },
    stats: {
      usedCount: campaign.usedCount,
      maxUses: campaign.maxUses,
      remainingUses: campaign.maxUses ? campaign.maxUses - campaign.usedCount : null,
      totalDiscountGiven: totalDiscount,
      uniqueDealers: [...new Set(campaign.usageHistory.map(h => h.dealer?._id?.toString()))].length
    },
    recentUsage: campaign.usageHistory.slice(-10).reverse()
  };
};

/**
 * Rastgele kampanya kodu oluştur
 * @param {Number} length - Kod uzunluğu
 * @returns {String} Benzersiz kod
 */
const generateCampaignCode = async (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Benzersizlik kontrolü
    const existing = await Campaign.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

module.exports = {
  validateCampaignCode,
  recordCampaignUsage,
  getActiveCampaigns,
  getCampaignStats,
  generateCampaignCode
};
