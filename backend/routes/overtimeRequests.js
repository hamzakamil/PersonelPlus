const express = require('express');
const router = express.Router();
const OvertimeRequest = require('../models/OvertimeRequest');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const Employee = require('../models/Employee');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, serverError } = require('../utils/responseHelper');

// ==================== FAZLA MESAİ TALEPLERİ ====================

/**
 * GET /api/overtime-requests
 * Fazla mesai taleplerini listele
 */
router.get('/', auth, async (req, res) => {
  try {
    const { company, employee, status, startDate, endDate, year, month } = req.query;

    const query = {};

    // Şirket filtresi
    if (company) {
      query.company = company;
    } else if (req.user.company) {
      query.company = req.user.company;
    }

    // Çalışan filtresi
    if (employee) {
      query.employee = employee;
    }

    // Durum filtresi
    if (status) {
      query.status = status;
    }

    // Tarih aralığı
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Yıl ve ay filtresi
    if (year && month) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const requests = await OvertimeRequest.find(query)
      .populate('employee', 'firstName lastName employeeNumber personelNumarasi')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .populate('createdBy', 'email')
      .sort({ date: -1, createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Fazla mesai talepleri alınamadı:', error);
    return serverError(res, error, 'Talepler alınamadı');
  }
});

/**
 * GET /api/overtime-requests/pending
 * Onay bekleyen talepleri listele (yöneticiler için)
 */
router.get('/pending', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'department_manager'), async (req, res) => {
  try {
    const { company } = req.query;

    const query = { status: 'PENDING' };

    if (company) {
      query.company = company;
    } else if (req.user.company) {
      query.company = req.user.company;
    }

    const requests = await OvertimeRequest.find(query)
      .populate('employee', 'firstName lastName employeeNumber personelNumarasi department')
      .populate('createdBy', 'email')
      .sort({ date: 1 });

    res.json(requests);
  } catch (error) {
    console.error('Bekleyen talepler alınamadı:', error);
    return serverError(res, error, 'Talepler alınamadı');
  }
});

/**
 * GET /api/overtime-requests/employee/:employeeId
 * Bir çalışanın taleplerini listele
 */
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, year, month } = req.query;

    const query = { employee: employeeId };

    if (status) {
      query.status = status;
    }

    if (year && month) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const requests = await OvertimeRequest.find(query)
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .sort({ date: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Çalışan talepleri alınamadı:', error);
    return serverError(res, error, 'Talepler alınamadı');
  }
});

/**
 * POST /api/overtime-requests
 * Yeni fazla mesai talebi oluştur
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      employeeId,
      date,
      overtimeType,
      requestedHours,
      startTime,
      endTime,
      reason
    } = req.body;

    // Çalışanı kontrol et
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Aynı tarihte aynı türde bekleyen veya onaylı talep var mı?
    const existingRequest = await OvertimeRequest.findOne({
      employee: employeeId,
      date: new Date(date),
      overtimeType,
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (existingRequest) {
      return errorResponse(res, { message: 'Bu tarih ve mesai türü için zaten bir talep var' });
    }

    const request = await OvertimeRequest.create({
      employee: employeeId,
      company: employee.company,
      date: new Date(date),
      overtimeType,
      requestedHours,
      startTime,
      endTime,
      reason,
      createdBy: req.user._id
    });

    const populated = await OvertimeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('createdBy', 'email');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Fazla mesai talebi oluşturulamadı:', error);
    return serverError(res, error, 'Talep oluşturulamadı');
  }
});

/**
 * PUT /api/overtime-requests/:id/approve
 * Talebi onayla
 */
router.put('/:id/approve', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'department_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedHours, comment } = req.body;

    const request = await OvertimeRequest.findById(id);
    if (!request) {
      return notFound(res, 'Talep bulunamadı');
    }

    if (request.status !== 'PENDING') {
      return errorResponse(res, { message: 'Bu talep zaten işlem görmüş' });
    }

    // Onayla
    request.status = 'APPROVED';
    request.approvedHours = approvedHours !== undefined ? approvedHours : request.requestedHours;
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    request.approverComment = comment || null;

    await request.save();

    // Puantaj'a aktar
    await transferToPuantaj(request);

    const populated = await OvertimeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('approvedBy', 'email');

    res.json(populated);
  } catch (error) {
    console.error('Talep onaylanamadı:', error);
    return serverError(res, error, 'Onaylama başarısız');
  }
});

/**
 * PUT /api/overtime-requests/:id/reject
 * Talebi reddet
 */
router.put('/:id/reject', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'department_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await OvertimeRequest.findById(id);
    if (!request) {
      return notFound(res, 'Talep bulunamadı');
    }

    if (request.status !== 'PENDING') {
      return errorResponse(res, { message: 'Bu talep zaten işlem görmüş' });
    }

    // Reddet
    request.status = 'REJECTED';
    request.rejectedBy = req.user._id;
    request.rejectedAt = new Date();
    request.rejectionReason = reason || 'Talep reddedildi';

    await request.save();

    const populated = await OvertimeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('rejectedBy', 'email');

    res.json(populated);
  } catch (error) {
    console.error('Talep reddedilemedi:', error);
    return serverError(res, error, 'Reddetme başarısız');
  }
});

/**
 * PUT /api/overtime-requests/:id/cancel
 * Talebi iptal et (talep sahibi veya yönetici)
 */
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await OvertimeRequest.findById(id);
    if (!request) {
      return notFound(res, 'Talep bulunamadı');
    }

    if (request.status !== 'PENDING') {
      return errorResponse(res, { message: 'Sadece bekleyen talepler iptal edilebilir' });
    }

    request.status = 'CANCELLED';
    await request.save();

    res.json({ message: 'Talep iptal edildi' });
  } catch (error) {
    console.error('Talep iptal edilemedi:', error);
    return serverError(res, error, 'İptal başarısız');
  }
});

/**
 * GET /api/overtime-requests/summary/:companyId/:year/:month
 * Şirket için aylık özet
 */
router.get('/summary/:companyId/:year/:month', auth, async (req, res) => {
  try {
    const { companyId, year, month } = req.params;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Onaylı talepleri çalışan bazında grupla
    const approvedRequests = await OvertimeRequest.aggregate([
      {
        $match: {
          company: new (require('mongoose').Types.ObjectId)(companyId),
          status: 'APPROVED',
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$employee',
          totalDayHours: {
            $sum: {
              $cond: [{ $eq: ['$overtimeType', 'DAY'] }, '$approvedHours', 0]
            }
          },
          totalNightHours: {
            $sum: {
              $cond: [{ $eq: ['$overtimeType', 'NIGHT'] }, '$approvedHours', 0]
            }
          },
          requests: { $push: '$$ROOT' }
        }
      }
    ]);

    // Bekleyen talepleri çalışan ve tür bazında grupla
    const pendingRequests = await OvertimeRequest.aggregate([
      {
        $match: {
          company: new (require('mongoose').Types.ObjectId)(companyId),
          status: 'PENDING',
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$employee',
          pendingDayCount: {
            $sum: { $cond: [{ $eq: ['$overtimeType', 'DAY'] }, 1, 0] }
          },
          pendingNightCount: {
            $sum: { $cond: [{ $eq: ['$overtimeType', 'NIGHT'] }, 1, 0] }
          }
        }
      }
    ]);

    // Bekleyen talepleri map'e dönüştür
    const pendingByEmployee = {};
    for (const item of pendingRequests) {
      pendingByEmployee[item._id.toString()] = {
        pendingDayCount: item.pendingDayCount || 0,
        pendingNightCount: item.pendingNightCount || 0
      };
    }

    // Çalışan bilgilerini ekle
    const Employee = require('../models/Employee');
    const summary = {};

    // Önce onaylı talepleri işle
    for (const item of approvedRequests) {
      const employee = await Employee.findById(item._id).select('firstName lastName employeeNumber personelNumarasi');
      if (employee) {
        const empId = item._id.toString();
        const pending = pendingByEmployee[empId] || { pendingDayCount: 0, pendingNightCount: 0 };
        summary[empId] = {
          employee: {
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeNumber: employee.employeeNumber || employee.personelNumarasi
          },
          dayHours: item.totalDayHours || 0,
          nightHours: item.totalNightHours || 0,
          totalHours: (item.totalDayHours || 0) + (item.totalNightHours || 0),
          pendingDayCount: pending.pendingDayCount,
          pendingNightCount: pending.pendingNightCount,
          requests: item.requests
        };
      }
    }

    // Sadece bekleyen talebi olan (onaylı talebi olmayan) çalışanları da ekle
    for (const [empId, pending] of Object.entries(pendingByEmployee)) {
      if (!summary[empId]) {
        const employee = await Employee.findById(empId).select('firstName lastName employeeNumber personelNumarasi');
        if (employee) {
          summary[empId] = {
            employee: {
              _id: employee._id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              employeeNumber: employee.employeeNumber || employee.personelNumarasi
            },
            dayHours: 0,
            nightHours: 0,
            totalHours: 0,
            pendingDayCount: pending.pendingDayCount,
            pendingNightCount: pending.pendingNightCount,
            requests: []
          };
        }
      }
    }

    // Toplam bekleyen talep sayısı
    const pendingCount = await OvertimeRequest.countDocuments({
      company: companyId,
      status: 'PENDING',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    res.json({
      summary,
      pendingCount,
      year: parseInt(year),
      month: parseInt(month)
    });
  } catch (error) {
    console.error('Özet alınamadı:', error);
    return serverError(res, error, 'Özet alınamadı');
  }
});

/**
 * Onaylanan talebi puantaja aktar
 */
async function transferToPuantaj(request) {
  try {
    const requestDate = new Date(request.date);
    const year = requestDate.getFullYear();
    const month = requestDate.getMonth() + 1;
    const day = requestDate.getDate();

    // Çalışanın puantajını bul
    let puantaj = await EmployeePuantaj.findOne({
      employee: request.employee,
      year,
      month
    });

    if (!puantaj) {
      // Puantaj yoksa oluştur (basit bir kayıt)
      // Not: Normalde puantaj başka bir süreçte oluşturulur
      console.log(`Puantaj bulunamadı: ${request.employee}, ${year}/${month}`);
      return;
    }

    // İlgili günü bul
    const dayIndex = puantaj.days.findIndex(d => {
      const dDate = new Date(d.date);
      return dDate.getDate() === day;
    });

    if (dayIndex === -1) {
      console.log(`Gün bulunamadı: ${day}`);
      return;
    }

    // Mesai saatini güncelle
    const existingHours = puantaj.days[dayIndex].overtimeHours || 0;
    puantaj.days[dayIndex].overtimeHours = existingHours + request.approvedHours;

    // Kod güncelle (O = Gündüz Mesai, G = Gece Mesai)
    // Not: Mevcut kod N (normal) ise mesai koduna çevir
    if (request.overtimeType === 'DAY') {
      if (puantaj.days[dayIndex].code === 'N') {
        puantaj.days[dayIndex].code = 'O'; // Gündüz mesaili iş günü
      }
    } else {
      if (puantaj.days[dayIndex].code === 'N') {
        puantaj.days[dayIndex].code = 'G'; // Gece mesaili iş günü
      }
    }

    // Özeti güncelle
    if (request.overtimeType === 'DAY') {
      puantaj.summary.dayOvertimeHours = (puantaj.summary.dayOvertimeHours || 0) + request.approvedHours;
    } else {
      puantaj.summary.nightOvertimeHours = (puantaj.summary.nightOvertimeHours || 0) + request.approvedHours;
    }

    await puantaj.save();

    // Talebi güncelle
    request.isTransferredToPuantaj = true;
    request.transferredAt = new Date();
    await request.save();

    console.log(`Fazla mesai puantaja aktarıldı: ${request.employee}, ${request.date}, ${request.approvedHours}s`);
  } catch (error) {
    console.error('Puantaja aktarma hatası:', error);
  }
}

module.exports = router;
