const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const LeaveRequest = require('../models/LeaveRequest');
const EmploymentPreRecord = require('../models/EmploymentPreRecord');
const ProfileChangeRequest = require('../models/ProfileChangeRequest');
const Employee = require('../models/Employee');
const { normalizePhone } = require('../utils/phoneUtils');
const notificationService = require('../services/notificationService');
const { createAttendanceFromLeave, removeAttendanceFromLeave } = require('../services/attendanceService');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

/**
 * GET /api/requests/pending
 * Bekleyen talepler (izin + işe giriş/çıkış)
 */
router.get('/pending', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const companyId = req.user.company;

    // Bekleyen izin talepleri
    const pendingLeaveRequests = await LeaveRequest.find({
      company: companyId,
      status: 'PENDING'
    })
      .populate('employee', 'firstName lastName employeeNumber email')
      .populate('companyLeaveType', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    // Bekleyen işe giriş/çıkış kayıtları
    const pendingEmploymentRecords = await EmploymentPreRecord.find({
      companyId: companyId,
      status: { $in: ['PENDING_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'PENDING_DEALER_APPROVAL'] }
    })
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('candidateFullName')
      .sort({ createdAt: -1 })
      .limit(20);

    // Bekleyen bilgi değişiklik talepleri
    const pendingProfileChanges = await ProfileChangeRequest.find({
      company: companyId,
      status: 'pending'
    })
      .populate('employee', 'firstName lastName tcKimlik')
      .sort({ createdAt: -1 })
      .limit(20);

    // Format: Her talep için tip ve veri
    const requests = [
      ...pendingLeaveRequests.map(req => ({
        id: req._id,
        type: 'leave_request',
        title: `${req.employee.firstName} ${req.employee.lastName} - İzin Talebi`,
        subtitle: `${req.startDate.toLocaleDateString('tr-TR')} - ${req.endDate.toLocaleDateString('tr-TR')}`,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        date: req.createdAt,
        data: req
      })),
      ...pendingEmploymentRecords.map(record => ({
        id: record._id,
        type: record.processType === 'hire' ? 'hire_request' : 'termination_request',
        title: record.processType === 'hire'
          ? `${record.candidateFullName || 'Yeni Çalışan'} - İşe Giriş`
          : `${record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : 'Çalışan'} - İşten Çıkış`,
        subtitle: record.processType === 'hire'
          ? `Giriş Tarihi: ${record.hireDate ? new Date(record.hireDate).toLocaleDateString('tr-TR') : '-'}`
          : `Çıkış Tarihi: ${record.terminationDate ? new Date(record.terminationDate).toLocaleDateString('tr-TR') : '-'}`,
        employeeName: record.processType === 'hire'
          ? record.candidateFullName
          : (record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : '-'),
        date: record.createdAt,
        data: record
      })),
      ...pendingProfileChanges.map(pcr => {
        const changedFields = Object.values(pcr.changes).map(c => c.label || '').filter(Boolean).join(', ');
        return {
          id: pcr._id,
          type: 'profile_change',
          title: `${pcr.employee.firstName} ${pcr.employee.lastName} - Bilgi Değişikliği`,
          subtitle: `Değişiklik: ${changedFields}`,
          employeeName: `${pcr.employee.firstName} ${pcr.employee.lastName}`,
          date: pcr.createdAt,
          data: pcr
        };
      })
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Bekleyen talepler hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/requests/:id/approve
 * Talep onaylama (izin veya işe giriş/çıkış)
 */
router.post('/:id/approve', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'leave_request', 'hire_request', 'termination_request'

    if (type === 'leave_request') {
      const leaveRequest = await LeaveRequest.findById(id);
      if (!leaveRequest) {
        return notFound(res, 'İzin talebi bulunamadı');
      }

      if (leaveRequest.company.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }

      leaveRequest.status = 'APPROVED';
      await leaveRequest.save();

      // Puantaj kayıtlarını oluştur
      try {
        await createAttendanceFromLeave(leaveRequest._id, req.user._id);
      } catch (attendanceError) {
        console.error('Puantaj kaydı oluşturulurken hata:', attendanceError);
        // Puantaj hatası izin onayını engellemez
      }

      res.json({
        success: true,
        message: 'İzin talebi onaylandı'
      });
    } else if (type === 'hire_request' || type === 'termination_request') {
      const employmentRecord = await EmploymentPreRecord.findById(id);
      if (!employmentRecord) {
        return notFound(res, 'İşlem kaydı bulunamadı');
      }

      if (employmentRecord.companyId.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }

      employmentRecord.status = 'APPROVED';
      await employmentRecord.save();

      res.json({
        success: true,
        message: 'İşlem onaylandı'
      });
    } else if (type === 'profile_change') {
      const changeRequest = await ProfileChangeRequest.findById(id).populate('employee').populate('user');
      if (!changeRequest) {
        return notFound(res, 'Değişiklik talebi bulunamadı');
      }

      if (changeRequest.company.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }

      if (changeRequest.status !== 'pending') {
        return errorResponse(res, { message: 'Bu talep zaten işlenmiş' });
      }

      // Değişiklikleri uygula
      const employee = await Employee.findById(changeRequest.employee._id);
      if (employee) {
        for (const [field, change] of Object.entries(changeRequest.changes)) {
          if (field === 'birthDate' && change.new) {
            employee[field] = new Date(change.new);
          } else if (field === 'phone' && change.new) {
            employee[field] = normalizePhone(change.new) || change.new;
          } else {
            employee[field] = change.new || undefined;
          }
        }
        await employee.save();
      }

      changeRequest.status = 'approved';
      changeRequest.reviewedBy = req.user._id;
      changeRequest.reviewedAt = new Date();
      await changeRequest.save();

      // Çalışana bildirim gönder
      if (changeRequest.user) {
        try {
          await notificationService.send({
            recipient: changeRequest.user._id,
            recipientType: 'employee',
            company: changeRequest.company,
            type: 'PROFILE_CHANGE_APPROVED',
            title: 'Bilgi Değişikliğiniz Onaylandı',
            body: 'Bilgi değişiklik talebiniz onaylandı ve güncellendi.',
            data: { changeRequestId: changeRequest._id },
            relatedModel: 'ProfileChangeRequest',
            relatedId: changeRequest._id,
            priority: 'high'
          });
        } catch (err) {
          console.error('Bildirim gönderilemedi:', err.message);
        }
      }

      res.json({
        success: true,
        message: 'Bilgi değişikliği onaylandı'
      });
    } else {
      return errorResponse(res, { message: 'Geçersiz talep tipi' });
    }
  } catch (error) {
    console.error('Talep onaylama hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/requests/:id/reject
 * Talep reddetme
 */
router.post('/:id/reject', auth, requireRole('company_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;

    if (type === 'leave_request') {
      const leaveRequest = await LeaveRequest.findById(id);
      if (!leaveRequest) {
        return notFound(res, 'İzin talebi bulunamadı');
      }

      if (leaveRequest.company.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }

      leaveRequest.status = 'REJECTED';
      if (reason) {
        leaveRequest.rejectReason = reason;
      }
      await leaveRequest.save();

      res.json({
        success: true,
        message: 'İzin talebi reddedildi'
      });
    } else if (type === 'hire_request' || type === 'termination_request') {
      const employmentRecord = await EmploymentPreRecord.findById(id);
      if (!employmentRecord) {
        return notFound(res, 'İşlem kaydı bulunamadı');
      }

      if (employmentRecord.companyId.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }

      employmentRecord.status = 'REJECTED';
      if (reason) {
        employmentRecord.rejectionReason = reason;
      }
      await employmentRecord.save();

      res.json({
        success: true,
        message: 'İşlem reddedildi'
      });
    } else if (type === 'profile_change') {
      const changeRequest = await ProfileChangeRequest.findById(id).populate('user');
      if (!changeRequest) {
        return notFound(res, 'Değişiklik talebi bulunamadı');
      }

      if (changeRequest.company.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }

      if (changeRequest.status !== 'pending') {
        return errorResponse(res, { message: 'Bu talep zaten işlenmiş' });
      }

      changeRequest.status = 'rejected';
      changeRequest.reviewedBy = req.user._id;
      changeRequest.reviewedAt = new Date();
      changeRequest.reviewNote = reason || null;
      await changeRequest.save();

      // Çalışana bildirim gönder
      if (changeRequest.user) {
        try {
          await notificationService.send({
            recipient: changeRequest.user._id,
            recipientType: 'employee',
            company: changeRequest.company,
            type: 'PROFILE_CHANGE_REJECTED',
            title: 'Bilgi Değişikliğiniz Reddedildi',
            body: `Bilgi değişiklik talebiniz reddedildi.${reason ? ' Neden: ' + reason : ''}`,
            data: { changeRequestId: changeRequest._id },
            relatedModel: 'ProfileChangeRequest',
            relatedId: changeRequest._id,
            priority: 'high'
          });
        } catch (err) {
          console.error('Bildirim gönderilemedi:', err.message);
        }
      }

      res.json({
        success: true,
        message: 'Bilgi değişikliği reddedildi'
      });
    } else {
      return errorResponse(res, { message: 'Geçersiz talep tipi' });
    }
  } catch (error) {
    console.error('Talep reddetme hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;

