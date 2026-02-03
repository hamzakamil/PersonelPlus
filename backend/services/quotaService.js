const Dealer = require('../models/Dealer');
const DealerSubscription = require('../models/DealerSubscription');
const Company = require('../models/Company');
const Employee = require('../models/Employee');

const quotaService = {
  /**
   * Bayinin kota durumunu kontrol et
   * @param {string} dealerId - Bayi ID
   * @returns {Object} Kota durumu
   */
  async checkDealerQuota(dealerId) {
    const dealer = await Dealer.findById(dealerId)
      .populate('activeSubscription');

    if (!dealer) {
      return { hasQuota: false, message: 'Bayi bulunamadı' };
    }

    // Abonelik kontrolü - abonelik yoksa sınırsız kabul et (geriye uyumluluk)
    if (!dealer.activeSubscription) {
      return {
        hasQuota: true,
        isLegacy: true,
        message: 'Abonelik sistemi aktif değil - sınırsız erişim'
      };
    }

    const sub = dealer.activeSubscription;

    // Durum kontrolü
    if (sub.status !== 'active') {
      return {
        hasQuota: false,
        message: `Abonelik durumu: ${sub.status}`,
        status: sub.status
      };
    }

    // Süre kontrolü
    if (new Date() > sub.endDate) {
      return {
        hasQuota: false,
        message: 'Abonelik süresi dolmuş',
        expiredAt: sub.endDate
      };
    }

    // Kota kontrolü
    if (sub.usedQuota >= sub.employeeQuota) {
      return {
        hasQuota: false,
        message: 'Çalışan kotası dolmuş',
        current: sub.usedQuota,
        limit: sub.employeeQuota
      };
    }

    return {
      hasQuota: true,
      remaining: sub.employeeQuota - sub.usedQuota,
      current: sub.usedQuota,
      limit: sub.employeeQuota,
      expiresAt: sub.endDate,
      status: sub.status
    };
  },

  /**
   * Şirketin kota durumunu kontrol et
   * @param {string} companyId - Şirket ID
   * @returns {Object} Kota durumu
   */
  async checkCompanyQuota(companyId) {
    const company = await Company.findById(companyId).populate('dealer');

    if (!company) {
      return { hasQuota: false, message: 'Şirket bulunamadı' };
    }

    // Sınırsız şirket kontrolü
    if (company.quota && company.quota.isUnlimited) {
      return {
        hasQuota: true,
        isUnlimited: true,
        message: 'Sınırsız kota'
      };
    }

    // Önce bayinin kotasını kontrol et
    const dealerQuota = await this.checkDealerQuota(company.dealer._id);
    if (!dealerQuota.hasQuota && !dealerQuota.isLegacy) {
      return {
        hasQuota: false,
        message: `Bayi kotası: ${dealerQuota.message}`,
        dealerQuota
      };
    }

    // Şirkete atanmış kota kontrolü
    const allocated = company.quota?.allocated || 0;
    const used = company.quota?.used || 0;

    // Şirkete kota atanmamışsa, bayinin genel kotasını kullan
    if (allocated === 0) {
      return dealerQuota;
    }

    if (used >= allocated) {
      return {
        hasQuota: false,
        message: 'Şirket çalışan kotası dolmuş',
        current: used,
        limit: allocated
      };
    }

    return {
      hasQuota: true,
      remaining: allocated - used,
      current: used,
      limit: allocated
    };
  },

  /**
   * Kota kullanımını artır (işe giriş onayında)
   * @param {string} dealerId - Bayi ID
   * @param {string} companyId - Şirket ID (opsiyonel)
   */
  async incrementQuota(dealerId, companyId = null) {
    // Bayi kotasını artır
    await Dealer.findByIdAndUpdate(dealerId, {
      $inc: { usedEmployeeQuota: 1 }
    });

    // Aktif aboneliği güncelle
    await DealerSubscription.findOneAndUpdate(
      { dealer: dealerId, status: 'active' },
      { $inc: { usedQuota: 1 } }
    );

    // Şirket kotasını artır
    if (companyId) {
      await Company.findByIdAndUpdate(companyId, {
        $inc: { 'quota.used': 1 }
      });
    }
  },

  /**
   * Kota kullanımını azalt (işten çıkışta)
   * @param {string} dealerId - Bayi ID
   * @param {string} companyId - Şirket ID (opsiyonel)
   */
  async decrementQuota(dealerId, companyId = null) {
    // Bayi kotasını azalt
    await Dealer.findByIdAndUpdate(dealerId, {
      $inc: { usedEmployeeQuota: -1 }
    });

    // Aktif aboneliği güncelle
    await DealerSubscription.findOneAndUpdate(
      { dealer: dealerId, status: 'active' },
      { $inc: { usedQuota: -1 } }
    );

    // Şirket kotasını azalt
    if (companyId) {
      await Company.findByIdAndUpdate(companyId, {
        $inc: { 'quota.used': -1 }
      });
    }
  },

  /**
   * Bayinin toplam aktif çalışan sayısını hesapla
   * @param {string} dealerId - Bayi ID
   * @returns {number} Aktif çalışan sayısı
   */
  async calculateUsedQuota(dealerId) {
    const companies = await Company.find({ dealer: dealerId, isActive: true });
    const companyIds = companies.map(c => c._id);

    const count = await Employee.countDocuments({
      company: { $in: companyIds },
      status: 'active'
    });

    return count;
  },

  /**
   * Şirketin aktif çalışan sayısını hesapla
   * @param {string} companyId - Şirket ID
   * @returns {number} Aktif çalışan sayısı
   */
  async calculateCompanyUsedQuota(companyId) {
    const count = await Employee.countDocuments({
      company: companyId,
      status: 'active'
    });

    return count;
  },

  /**
   * Kota senkronizasyonu (günlük cron job için)
   * @param {string} dealerId - Bayi ID
   * @returns {number} Güncel kota
   */
  async syncDealerQuota(dealerId) {
    const actualCount = await this.calculateUsedQuota(dealerId);

    await Dealer.findByIdAndUpdate(dealerId, {
      usedEmployeeQuota: actualCount
    });

    await DealerSubscription.findOneAndUpdate(
      { dealer: dealerId, status: 'active' },
      { usedQuota: actualCount }
    );

    return actualCount;
  },

  /**
   * Şirket kotasını senkronize et
   * @param {string} companyId - Şirket ID
   * @returns {number} Güncel kota
   */
  async syncCompanyQuota(companyId) {
    const actualCount = await this.calculateCompanyUsedQuota(companyId);

    await Company.findByIdAndUpdate(companyId, {
      'quota.used': actualCount
    });

    return actualCount;
  },

  /**
   * Bayinin tüm şirketlerinin kotalarını senkronize et
   * @param {string} dealerId - Bayi ID
   */
  async syncAllCompanyQuotas(dealerId) {
    const companies = await Company.find({ dealer: dealerId, isActive: true });

    for (const company of companies) {
      await this.syncCompanyQuota(company._id);
    }
  },

  /**
   * Şirkete kota ata (bayi tarafından)
   * @param {string} companyId - Şirket ID
   * @param {number} quota - Atanacak kota
   * @param {string} dealerId - Bayi ID (doğrulama için)
   * @returns {Object} Sonuç
   */
  async allocateQuotaToCompany(companyId, quota, dealerId) {
    const company = await Company.findById(companyId);

    if (!company) {
      throw new Error('Şirket bulunamadı');
    }

    if (company.dealer.toString() !== dealerId.toString()) {
      throw new Error('Bu şirket size ait değil');
    }

    const dealer = await Dealer.findById(dealerId).populate('activeSubscription');

    if (!dealer) {
      throw new Error('Bayi bulunamadı');
    }

    // Mevcut toplam dağıtılmış kotayı hesapla
    const allCompanies = await Company.find({ dealer: dealerId, isActive: true });
    const currentAllocated = allCompanies.reduce((sum, c) => {
      if (c._id.toString() !== companyId.toString()) {
        return sum + (c.quota?.allocated || 0);
      }
      return sum;
    }, 0);

    // Bayinin toplam kotasını kontrol et
    const dealerTotalQuota = dealer.employeeQuota || 0;
    const newTotalAllocated = currentAllocated + quota;

    if (newTotalAllocated > dealerTotalQuota && dealerTotalQuota > 0) {
      throw new Error(`Toplam dağıtılan kota (${newTotalAllocated}) bayi kotasını (${dealerTotalQuota}) aşamaz`);
    }

    // Şirkete kotayı ata
    await Company.findByIdAndUpdate(companyId, {
      'quota.allocated': quota
    });

    // Bayinin dağıtılmış kotasını güncelle
    await Dealer.findByIdAndUpdate(dealerId, {
      allocatedQuota: newTotalAllocated
    });

    return {
      success: true,
      allocated: quota,
      dealerRemaining: dealerTotalQuota - newTotalAllocated
    };
  },

  /**
   * Bayi kota özet bilgisi
   * @param {string} dealerId - Bayi ID
   * @returns {Object} Kota özeti
   */
  async getDealerQuotaSummary(dealerId) {
    const dealer = await Dealer.findById(dealerId).populate('activeSubscription');

    if (!dealer) {
      throw new Error('Bayi bulunamadı');
    }

    const companies = await Company.find({ dealer: dealerId, isActive: true });
    const actualUsed = await this.calculateUsedQuota(dealerId);

    const totalAllocated = companies.reduce((sum, c) => sum + (c.quota?.allocated || 0), 0);

    const subscription = dealer.activeSubscription;

    return {
      dealer: {
        id: dealer._id,
        name: dealer.name
      },
      quota: {
        total: dealer.employeeQuota || 0,
        used: actualUsed,
        allocated: totalAllocated,
        remaining: (dealer.employeeQuota || 0) - actualUsed,
        unallocated: (dealer.employeeQuota || 0) - totalAllocated,
        percentage: dealer.employeeQuota ? Math.round((actualUsed / dealer.employeeQuota) * 100) : 0
      },
      subscription: subscription ? {
        id: subscription._id,
        packageName: subscription.package?.name,
        status: subscription.status,
        billingType: subscription.billingType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining: Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
        autoRenew: subscription.autoRenew
      } : null,
      companies: companies.map(c => ({
        id: c._id,
        name: c.name,
        allocated: c.quota?.allocated || 0,
        used: c.quota?.used || 0,
        isUnlimited: c.quota?.isUnlimited || false
      }))
    };
  }
};

module.exports = quotaService;
