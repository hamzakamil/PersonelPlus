const express = require('express');
const router = express.Router();
const OvertimeRequest = require('../models/OvertimeRequest');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, serverError } = require('../utils/responseHelper');
const { calculateApprovalChainWithAdminMode, getCompanyAdmin } = require('../services/approvalChainService');
const notificationService = require('../services/notificationService');

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

    const query = { status: { $in: ['PENDING', 'IN_PROGRESS'] } };

    if (company) {
      query.company = company;
    } else if (req.user.company) {
      query.company = req.user.company;
    }

    // Admin değilse sadece kendi onayını bekleyen talepleri göster
    const isAdmin = ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name);
    if (!isAdmin) {
      const approverEmployee = await Employee.findOne({ email: req.user.email });
      if (approverEmployee) {
        query.currentApprover = approverEmployee._id;
      }
    }

    const requests = await OvertimeRequest.find(query)
      .populate('employee', 'firstName lastName employeeNumber personelNumarasi department')
      .populate('currentApprover', 'firstName lastName email')
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

    // Aynı tarihte aynı türde bekleyen, süreçte veya onaylı talep var mı?
    const existingRequest = await OvertimeRequest.findOne({
      employee: employeeId,
      date: new Date(date),
      overtimeType,
      status: { $in: ['PENDING', 'IN_PROGRESS', 'APPROVED'] }
    });

    if (existingRequest) {
      return errorResponse(res, { message: 'Bu tarih ve mesai türü için zaten bir talep var' });
    }

    // Şirket ayarlarını al
    const company = await Company.findById(employee.company);
    const overtimeSettings = company?.overtimeApprovalSettings || { enabled: true, useLeaveApprovalChain: true };

    // Admin tarafından oluşturuluyor mu?
    const isAdminCreated = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin']
      .includes(req.user.role.name);

    let approvalChain = [];
    let currentApprover = null;
    let initialStatus = 'PENDING';

    if (!isAdminCreated && overtimeSettings.enabled) {
      // Şirketin approvalMode ayarına göre zincir hesapla
      const { chain, mode } = await calculateApprovalChainWithAdminMode(employee._id, employee.company);

      if (mode === 'auto_approve') {
        initialStatus = 'APPROVED';
      } else {
        approvalChain = chain;

        // Approval levels filtresi
        if (overtimeSettings.approvalLevels > 0 && overtimeSettings.approvalLevels < approvalChain.length) {
          approvalChain = approvalChain.slice(0, overtimeSettings.approvalLevels);
        }

        if (approvalChain.length > 0) {
          currentApprover = approvalChain[0];
          initialStatus = 'IN_PROGRESS';
        } else {
          // Zincir boş (admin fallback zaten eklendi, bu olmamalı)
          initialStatus = 'APPROVED';
        }
      }
    } else if (!overtimeSettings.enabled) {
      // Onay sistemi kapalı
      initialStatus = 'APPROVED';
    } else {
      // Admin tarafından oluşturuluyorsa direkt onayla
      initialStatus = 'APPROVED';
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
      status: initialStatus,
      currentApprover: currentApprover,
      approvedHours: initialStatus === 'APPROVED' ? requestedHours : null,
      approvedBy: initialStatus === 'APPROVED' && isAdminCreated ? req.user._id : null,
      approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
      createdBy: req.user._id,
      history: currentApprover ? [{
        approver: currentApprover,
        status: 'IN_PROGRESS',
        note: 'Fazla mesai talebi oluşturuldu, onay bekleniyor',
        date: new Date()
      }] : []
    });

    // Otomatik onaylı ise puantaja aktar
    if (initialStatus === 'APPROVED') {
      await transferToPuantaj(request);
    }

    // Bildirimler
    try {
      if (currentApprover) {
        // İlk onaylayıcıya bildirim
        const approverUser = await User.findOne({ employee: currentApprover });
        if (approverUser) {
          await notificationService.sendOvertimeRequestNotification(request, employee, approverUser);
        }
      }

      // Auto-approve modunda admin'e bilgilendirme
      if (initialStatus === 'APPROVED' && !isAdminCreated && company?.approvalMode === 'auto_approve') {
        const adminEmployee = await getCompanyAdmin(employee.company);
        if (adminEmployee) {
          const adminUser = await User.findOne({ employee: adminEmployee._id });
          if (adminUser) {
            await notificationService.send({
              recipient: adminUser._id,
              recipientType: 'company_admin',
              company: employee.company,
              type: 'OVERTIME_REQUEST',
              title: 'Otomatik Onaylanan Fazla Mesai Talebi',
              body: `${employee.firstName} ${employee.lastName} fazla mesai talebi otomatik onaylandı.`,
              data: { overtimeRequestId: request._id },
              relatedModel: 'OvertimeRequest',
              relatedId: request._id,
              priority: 'normal'
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Fazla mesai bildirim hatası:', notifErr);
    }

    const populated = await OvertimeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('currentApprover', 'firstName lastName email')
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

    const isAdmin = ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik']
      .includes(req.user.role.name);

    const approverEmployee = await Employee.findOne({ email: req.user.email });

    const request = await OvertimeRequest.findById(id);
    if (!request) {
      return notFound(res, 'Talep bulunamadı');
    }

    if (request.status === 'APPROVED') {
      return errorResponse(res, { message: 'Bu talep zaten onaylanmış' });
    }
    if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
      return errorResponse(res, { message: 'Bu talep zaten işlem görmüş' });
    }

    // Yetki kontrolü
    const isSameCompany = request.company.toString() === (req.user.company?._id?.toString() || req.user.company?.toString());
    const isCurrentApprover = approverEmployee && request.currentApprover &&
      request.currentApprover.toString() === approverEmployee._id.toString();
    const canApproveAsAdmin = isAdmin && isSameCompany;

    if (!isCurrentApprover && !canApproveAsAdmin) {
      return errorResponse(res, { message: 'Bu talebi onaylama yetkiniz yok' });
    }

    // Çalışanın onay zincirini hesapla
    const employee = await Employee.findById(request.employee);
    const { chain: approvalChain } = await calculateApprovalChainWithAdminMode(employee._id, request.company);

    const currentApproverIndex = approverEmployee
      ? approvalChain.findIndex((chainId) => chainId.toString() === approverEmployee._id.toString())
      : -1;

    const isApprovingAsAdmin = (currentApproverIndex === -1 || !approverEmployee) && canApproveAsAdmin;

    let nextApprover = null;

    if (isApprovingAsAdmin) {
      // Admin direkt onaylar
      request.history.push({
        approver: approverEmployee?._id || null,
        approverUser: req.user._id,
        status: 'APPROVED',
        note: comment || `${req.user.role.name} tarafından onaylandı`,
        date: new Date(),
      });
      request.status = 'APPROVED';
      request.currentApprover = null;
    } else {
      // Sıradaki onaylayıcıyı bul
      if (currentApproverIndex < approvalChain.length - 1) {
        nextApprover = approvalChain[currentApproverIndex + 1];
      }

      const isLastInChain = currentApproverIndex >= approvalChain.length - 1 || !nextApprover;

      request.history.push({
        approver: approverEmployee._id,
        approverUser: req.user._id,
        status: isLastInChain ? 'APPROVED' : 'IN_PROGRESS',
        note: comment || 'Onaylandı',
        date: new Date(),
      });

      if (isLastInChain) {
        request.status = 'APPROVED';
        request.currentApprover = null;
      } else {
        request.status = 'IN_PROGRESS';
        request.currentApprover = nextApprover;
      }
    }

    // Son onay bilgilerini set et
    if (request.status === 'APPROVED') {
      request.approvedHours = approvedHours !== undefined ? approvedHours : request.requestedHours;
      request.approvedBy = req.user._id;
      request.approvedAt = new Date();
      request.approverComment = comment || null;
    }

    await request.save();

    // Onaylandıysa puantaja aktar ve çalışana bildirim
    if (request.status === 'APPROVED') {
      await transferToPuantaj(request);

      try {
        await notificationService.sendOvertimeApprovedNotification(request, employee);
      } catch (notifErr) {
        console.error('Onay bildirim hatası:', notifErr);
      }
    } else if (request.currentApprover) {
      // Sıradaki onaylayıcıya bildirim
      try {
        const nextUser = await User.findOne({ employee: request.currentApprover });
        if (nextUser) {
          await notificationService.sendOvertimeRequestNotification(request, employee, nextUser);
        }
      } catch (notifErr) {
        console.error('Bildirim hatası:', notifErr);
      }
    }

    const populated = await OvertimeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvedBy', 'email')
      .populate('history.approver', 'firstName lastName email');

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

    if (!['PENDING', 'IN_PROGRESS'].includes(request.status)) {
      return errorResponse(res, { message: 'Bu talep zaten işlem görmüş' });
    }

    const approverEmployee = await Employee.findOne({ email: req.user.email });

    // History'ye red kaydı ekle
    request.history.push({
      approver: approverEmployee?._id || null,
      approverUser: req.user._id,
      status: 'REJECTED',
      note: reason || 'Reddedildi',
      date: new Date(),
    });

    // Reddet
    request.status = 'REJECTED';
    request.rejectedBy = req.user._id;
    request.rejectedAt = new Date();
    request.rejectionReason = reason || 'Talep reddedildi';
    request.currentApprover = null;

    await request.save();

    // Çalışana red bildirimi
    try {
      const employee = await Employee.findById(request.employee);
      if (employee) {
        await notificationService.sendOvertimeRejectedNotification(request, employee, reason);
      }
    } catch (notifErr) {
      console.error('Red bildirim hatası:', notifErr);
    }

    const populated = await OvertimeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('rejectedBy', 'email')
      .populate('history.approver', 'firstName lastName email');

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

    if (!['PENDING', 'IN_PROGRESS'].includes(request.status)) {
      return errorResponse(res, { message: 'Sadece bekleyen veya onay sürecindeki talepler iptal edilebilir' });
    }

    request.status = 'CANCELLED';
    request.currentApprover = null;
    request.history.push({
      approverUser: req.user._id,
      status: 'CANCELLED',
      note: 'Talep iptal edildi',
      date: new Date(),
    });
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
