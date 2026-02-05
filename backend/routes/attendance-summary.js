/**
 * Devam Özet API'leri
 *
 * Günlük ve aylık devam özetlerini sorgulama,
 * yeniden hesaplama ve raporlama endpoint'leri
 */

const express = require('express');
const router = express.Router();
const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
const Employee = require('../models/Employee');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');
const attendanceCalculationService = require('../services/attendanceCalculationService');

/**
 * GET /api/attendance-summary/daily/:employeeId/:date
 * Belirli bir çalışanın belirli bir günlük özetini getirir
 */
router.get('/daily/:employeeId/:date', auth, async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    // Yetki kontrolü
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Şirket admin'i sadece kendi şirketinin çalışanlarını görebilir
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
    }

    // Çalışan sadece kendini görebilir
    if (req.user.role.name === 'employee') {
      const userEmployee = await Employee.findOne({ email: req.user.email });
      if (!userEmployee || userEmployee._id.toString() !== employeeId) {
        return forbidden(res);
      }
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const summary = await DailyAttendanceSummary.findOne({
      employee: employeeId,
      date: targetDate
    })
      .populate('employee', 'firstName lastName employeeNumber department')
      .populate('checkInRecord');

    if (!summary) {
      return res.json({
        message: 'Bu tarih için kayıt bulunamadı',
        summary: null
      });
    }

    res.json(summary);
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/attendance-summary/monthly/:employeeId/:year/:month
 * Belirli bir çalışanın aylık özetini getirir
 */
router.get('/monthly/:employeeId/:year/:month', auth, async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    // Yetki kontrolü
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
    }

    if (req.user.role.name === 'employee') {
      const userEmployee = await Employee.findOne({ email: req.user.email });
      if (!userEmployee || userEmployee._id.toString() !== employeeId) {
        return forbidden(res);
      }
    }

    const monthlySummary = await attendanceCalculationService.calculateMonthlyAttendance(
      employeeId,
      parseInt(year),
      parseInt(month)
    );

    // Çalışan bilgilerini ekle
    monthlySummary.employee = {
      _id: employee._id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber
    };

    res.json(monthlySummary);
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/attendance-summary/company/:companyId/:date
 * Şirketin belirli bir günlük raporunu getirir
 */
router.get('/company/:companyId/:date', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId, date } = req.params;

    // Şirket admin'i sadece kendi şirketini görebilir
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== companyId) {
        return forbidden(res);
      }
    }

    const dailySummary = await attendanceCalculationService.getCompanyDailySummary(companyId, date);

    res.json(dailySummary);
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/attendance-summary/company/:companyId/range
 * Şirketin belirli bir tarih aralığındaki raporunu getirir
 */
router.get('/company/:companyId/range', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return errorResponse(res, { message: 'startDate ve endDate parametreleri gerekli' });
    }

    // Şirket admin'i sadece kendi şirketini görebilir
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== companyId) {
        return forbidden(res);
      }
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const summaries = await DailyAttendanceSummary.find({
      company: companyId,
      date: {
        $gte: start,
        $lte: end
      }
    })
      .populate('employee', 'firstName lastName employeeNumber department')
      .sort({ date: 1, 'employee.firstName': 1 });

    // Günlere göre grupla
    const byDate = {};
    for (const summary of summaries) {
      const dateKey = summary.date.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          summaries: [],
          stats: { total: 0, present: 0, late: 0, absent: 0 }
        };
      }
      byDate[dateKey].summaries.push(summary);
      byDate[dateKey].stats.total++;

      switch (summary.status) {
        case 'PRESENT':
          byDate[dateKey].stats.present++;
          break;
        case 'LATE':
          byDate[dateKey].stats.late++;
          break;
        case 'ABSENT':
          byDate[dateKey].stats.absent++;
          break;
      }
    }

    res.json({
      startDate,
      endDate,
      totalRecords: summaries.length,
      byDate: Object.values(byDate)
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /api/attendance-summary/recalculate/:employeeId/:date
 * Belirli bir çalışanın belirli bir gününü yeniden hesaplar
 */
router.post('/recalculate/:employeeId/:date', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
    }

    const summary = await attendanceCalculationService.calculateDailyAttendance(employeeId, date);

    res.json({
      message: 'Hesaplama tamamlandı',
      summary
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /api/attendance-summary/recalculate-company/:companyId/:date
 * Şirketin tüm çalışanları için belirli bir günü yeniden hesaplar
 */
router.post('/recalculate-company/:companyId/:date', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const { companyId, date } = req.params;

    if (['company_admin'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== companyId) {
        return forbidden(res);
      }
    }

    const results = await attendanceCalculationService.recalculateCompanyDaily(companyId, date);

    res.json({
      message: `${results.length} çalışan için hesaplama tamamlandı`,
      count: results.length,
      summaries: results
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/attendance-summary/today
 * Giriş yapan kullanıcının bugünkü özetini getirir
 */
router.get('/today', auth, async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return res.json({ summary: null });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = await DailyAttendanceSummary.findOne({
      employee: employee._id,
      date: today
    }).populate('checkInRecord');

    // Mesai bilgilerini de getir
    const schedule = await attendanceCalculationService.getWorkSchedule(employee, today);

    res.json({
      summary,
      schedule: {
        isWorkingDay: schedule.isWorkingDay,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/attendance-summary/late-employees/:companyId/:date
 * Belirli bir günde geç kalan çalışanları listeler
 */
router.get('/late-employees/:companyId/:date', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId, date } = req.params;

    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== companyId) {
        return forbidden(res);
      }
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const lateEmployees = await DailyAttendanceSummary.find({
      company: companyId,
      date: targetDate,
      status: 'LATE'
    })
      .populate('employee', 'firstName lastName employeeNumber department')
      .sort({ lateMinutes: -1 });

    res.json({
      date: targetDate,
      count: lateEmployees.length,
      employees: lateEmployees.map(s => ({
        employee: s.employee,
        checkInTime: s.checkInTime,
        expectedCheckIn: s.expectedCheckIn,
        lateMinutes: s.lateMinutes,
        lateFormatted: attendanceCalculationService.formatMinutesToHoursAndMinutes(s.lateMinutes)
      }))
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;
