const express = require('express');
const router = express.Router();
const CompanyHolidayCalendar = require('../models/CompanyHolidayCalendar');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, forbidden, serverError } = require('../utils/responseHelper');

/**
 * GET /api/company-holidays/:companyId/:year
 * Şirketin belirli bir yıla ait tatil takvimini getir
 */
router.get('/:companyId/:year', auth, async (req, res) => {
  try {
    const { companyId, year } = req.params;
    const yearNum = parseInt(year);

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        (req.user.company?._id?.toString() || req.user.company?.toString()) !== companyId) {
      return forbidden(res);
    }

    if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(companyId);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res);
      }
    }

    let calendar = await CompanyHolidayCalendar.findOne({ companyId, year: yearNum });

    // Eğer takvim yoksa boş takvim döndür
    if (!calendar) {
      calendar = {
        companyId,
        year: yearNum,
        holidays: []
      };
    }

    res.json(calendar);
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /api/company-holidays
 * Şirket tatil takvimi oluştur veya güncelle
 */
router.post('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { companyId, year, holidays } = req.body;

    if (!companyId || !year) {
      return errorResponse(res, { message: 'Şirket Ve Yıl Zorunludur' });
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        (req.user.company?._id?.toString() || req.user.company?.toString()) !== companyId) {
      return forbidden(res);
    }

    if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(companyId);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res);
      }
    }

    // Tatilleri Date objelerine çevir
    const holidayDates = holidays.map(h => new Date(h));

    // Upsert: Varsa güncelle, yoksa oluştur
    const calendar = await CompanyHolidayCalendar.findOneAndUpdate(
      { companyId, year: parseInt(year) },
      { holidays: holidayDates },
      { upsert: true, new: true }
    );

    res.json({ message: 'Tatil Takvimi Başarıyla Kaydedildi', data: calendar });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * DELETE /api/company-holidays/:companyId/:year
 * Şirket tatil takvimini sil
 */
router.delete('/:companyId/:year', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { companyId, year } = req.params;

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        (req.user.company?._id?.toString() || req.user.company?.toString()) !== companyId) {
      return forbidden(res);
    }

    await CompanyHolidayCalendar.findOneAndDelete({ companyId, year: parseInt(year) });

    res.json({ message: 'Tatil Takvimi Silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;




