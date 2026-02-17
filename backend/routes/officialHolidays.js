const express = require('express');
const router = express.Router();
const OfficialHoliday = require('../models/OfficialHoliday');
const { auth, requireRole } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  serverError,
  createdResponse,
  notFound,
} = require('../utils/responseHelper');

/**
 * GET /api/official-holidays
 * Tüm resmi tatilleri getir (yıl filtresi ile)
 */
router.get('/', async (req, res) => {
  try {
    const { year } = req.query;
    const query = year ? { year: parseInt(year) } : {};

    const holidays = await OfficialHoliday.find(query).sort({ date: 1 });

    return successResponse(res, { data: holidays });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/official-holidays/:year
 * Belirli bir yılın resmi tatillerini getir
 */
router.get('/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return errorResponse(res, { message: 'Geçerli bir yıl giriniz (2000-2100)' });
    }

    const holidays = await OfficialHoliday.find({ year: yearNum }).sort({ date: 1 });

    return successResponse(res, { data: holidays });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /api/official-holidays
 * Yeni resmi tatil ekle (sadece super_admin)
 */
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, date, type, isHalfDay, halfDayPeriod, description, isRecurring } = req.body;

    if (!name || !date) {
      return errorResponse(res, { message: 'Tatil adı ve tarihi zorunludur' });
    }

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    const holiday = new OfficialHoliday({
      name,
      date: holidayDate,
      year,
      type: type || 'important',
      isHalfDay: isHalfDay || false,
      halfDayPeriod: halfDayPeriod || null,
      description: description || null,
      isRecurring: isRecurring !== undefined ? isRecurring : true,
    });

    await holiday.save();

    return createdResponse(res, {
      data: holiday,
      message: 'Resmi tatil eklendi',
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, {
        message: 'Bu tarihte aynı isimle bir tatil zaten mevcut',
        statusCode: 400,
      });
    }
    return serverError(res, error);
  }
});

/**
 * PUT /api/official-holidays/:id
 * Resmi tatil güncelle (sadece super_admin)
 */
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type, isHalfDay, halfDayPeriod, description, isRecurring } = req.body;

    const holiday = await OfficialHoliday.findById(id);
    if (!holiday) {
      return notFound(res, 'Tatil bulunamadı');
    }

    if (name !== undefined) holiday.name = name;
    if (date !== undefined) {
      const holidayDate = new Date(date);
      holiday.date = holidayDate;
      holiday.year = holidayDate.getFullYear();
    }
    if (type !== undefined) holiday.type = type;
    if (isHalfDay !== undefined) holiday.isHalfDay = isHalfDay;
    if (halfDayPeriod !== undefined) holiday.halfDayPeriod = halfDayPeriod;
    if (description !== undefined) holiday.description = description;
    if (isRecurring !== undefined) holiday.isRecurring = isRecurring;

    await holiday.save();

    return successResponse(res, {
      data: holiday,
      message: 'Resmi tatil güncellendi',
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * DELETE /api/official-holidays/:id
 * Resmi tatil sil (sadece super_admin)
 */
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await OfficialHoliday.findByIdAndDelete(id);
    if (!holiday) {
      return notFound(res, 'Tatil bulunamadı');
    }

    return successResponse(res, { message: 'Resmi tatil silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;
