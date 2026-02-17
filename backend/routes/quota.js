const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const quotaService = require('../services/quotaService');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Dealer = require('../models/Dealer');
const { successResponse, errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

/**
 * GET /api/quota/summary - Kota özet bilgisi
 * Bayi admin: Tüm şirketlerin kota durumu
 * Şirket admin: Kendi şirketinin kota durumu
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const userRole = req.user.role.name;

    // Bayi admin için
    if (userRole === 'bayi_admin') {
      const dealerId = req.user.dealer;

      if (!dealerId) {
        return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
      }

      const summary = await quotaService.getDealerQuotaSummary(dealerId);

      // Her şirket için gerçek çalışan sayısını hesapla
      const companiesWithActualCount = await Promise.all(
        summary.companies.map(async (company) => {
          const actualEmployeeCount = await Employee.countDocuments({
            company: company.id,
            status: 'active'
          });
          return {
            ...company,
            actualEmployeeCount
          };
        })
      );

      return res.json({
        success: true,
        data: {
          ...summary,
          companies: companiesWithActualCount
        }
      });
    }

    // Super admin için
    if (userRole === 'super_admin') {
      const { dealerId } = req.query;

      if (dealerId) {
        const summary = await quotaService.getDealerQuotaSummary(dealerId);

        const companiesWithActualCount = await Promise.all(
          summary.companies.map(async (company) => {
            const actualEmployeeCount = await Employee.countDocuments({
              company: company.id,
              status: 'active'
            });
            return {
              ...company,
              actualEmployeeCount
            };
          })
        );

        return res.json({
          success: true,
          data: {
            ...summary,
            companies: companiesWithActualCount
          }
        });
      }

      // Tüm bayilerin özeti
      const dealers = await Dealer.find({ isActive: true }).populate('activeSubscription');
      const allSummaries = await Promise.all(
        dealers.map(async (dealer) => {
          try {
            const summary = await quotaService.getDealerQuotaSummary(dealer._id);
            return summary;
          } catch (err) {
            return {
              dealer: { id: dealer._id, name: dealer.name },
              quota: { total: 0, used: 0 },
              error: err.message
            };
          }
        })
      );

      return res.json({
        success: true,
        data: allSummaries
      });
    }

    // Şirket admin veya resmi_muhasebe_ik için
    if (['company_admin', 'resmi_muhasebe_ik'].includes(userRole)) {
      const companyId = req.user.company?._id || req.user.company;

      if (!companyId) {
        return errorResponse(res, { message: 'Şirket bilgisi bulunamadı' });
      }

      const company = await Company.findById(companyId).populate('dealer');
      if (!company) {
        return notFound(res, 'Şirket bulunamadı');
      }

      // Şirketin aktif çalışan sayısı
      const actualEmployeeCount = await Employee.countDocuments({
        company: companyId,
        status: 'active'
      });

      // Bayi kota bilgisi
      const dealerQuota = await quotaService.checkDealerQuota(company.dealer._id);

      return res.json({
        success: true,
        data: {
          company: {
            id: company._id,
            name: company.name
          },
          quota: {
            allocated: company.quota?.allocated || 0,
            used: company.quota?.used || 0,
            isUnlimited: company.quota?.isUnlimited || false,
            actualEmployeeCount
          },
          dealer: {
            name: company.dealer.name,
            hasQuota: dealerQuota.hasQuota,
            isLegacy: dealerQuota.isLegacy || false,
            remaining: dealerQuota.remaining,
            total: dealerQuota.limit,
            expiresAt: dealerQuota.expiresAt
          }
        }
      });
    }

    return forbidden(res);
  } catch (error) {
    console.error('Kota özeti hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/quota/allocate - Şirkete kota ata (sadece bayi admin)
 */
router.post('/allocate', auth, requireRole('bayi_admin', 'super_admin'), async (req, res) => {
  try {
    const { companyId, quota } = req.body;

    if (!companyId || quota === undefined) {
      return errorResponse(res, { message: 'companyId ve quota gerekli' });
    }

    const dealerId = req.user.role.name === 'super_admin'
      ? (await Company.findById(companyId))?.dealer
      : req.user.dealer;

    const result = await quotaService.allocateQuotaToCompany(companyId, quota, dealerId);

    res.json({
      success: true,
      message: 'Kota başarıyla atandı',
      data: result
    });
  } catch (error) {
    console.error('Kota atama hatası:', error);
    return errorResponse(res, { message: error.message });
  }
});

/**
 * POST /api/quota/sync - Kota senkronizasyonu (bayi admin)
 */
router.post('/sync', auth, requireRole('bayi_admin', 'super_admin'), async (req, res) => {
  try {
    const dealerId = req.user.role.name === 'super_admin'
      ? req.body.dealerId
      : req.user.dealer;

    if (!dealerId) {
      return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
    }

    // Bayi kotasını senkronize et
    const actualCount = await quotaService.syncDealerQuota(dealerId);

    // Tüm şirket kotalarını senkronize et
    await quotaService.syncAllCompanyQuotas(dealerId);

    res.json({
      success: true,
      message: 'Kota senkronizasyonu tamamlandı',
      data: { actualEmployeeCount: actualCount }
    });
  } catch (error) {
    console.error('Kota senkronizasyon hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/quota/auto-allocate - Mevcut çalışan sayısına göre otomatik kota dağıt
 * Bayi admin: Kendi şirketlerine dağıtır
 * Super admin: dealerId ile belirtilen bayiye dağıtır
 */
router.post('/auto-allocate', auth, requireRole('bayi_admin', 'super_admin'), async (req, res) => {
  try {
    let dealerId;

    if (req.user.role.name === 'bayi_admin') {
      dealerId = req.user.dealer;
      if (!dealerId) {
        return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
      }
    } else if (req.user.role.name === 'super_admin') {
      dealerId = req.body.dealerId;
      if (!dealerId) {
        return errorResponse(res, { message: 'dealerId gerekli' });
      }
    } else {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    const result = await quotaService.autoAllocateQuotaBasedOnEmployees(dealerId);

    return successResponse(res, {
      data: result,
      message: `Kota otomatik dağıtıldı: ${result.totalAllocated}/${result.totalQuota}`
    });
  } catch (error) {
    console.error('Otomatik kota dağıtım hatası:', error);
    return serverError(res, error, 'Kota dağıtımı başarısız');
  }
});

module.exports = router;
