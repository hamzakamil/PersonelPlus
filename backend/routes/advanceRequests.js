const express = require('express');
const router = express.Router();
const AdvanceRequest = require('../models/AdvanceRequest');
const AdvancePayment = require('../models/AdvancePayment');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const User = require('../models/User');
const advanceService = require('../services/advanceService');
const { calculateApprovalChainWithAdminMode } = require('../services/approvalChainService');
const { auth } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Yeni avans talebi oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { amount, reason, installments = 1 } = req.body;

    if (!amount || !reason) {
      return errorResponse(res, { message: 'Tutar ve gerekçe alanları zorunludur' });
    }

    if (amount <= 0) {
      return errorResponse(res, { message: 'Geçerli bir tutar giriniz' });
    }

    // Çalışan bilgisini al
    const employee = await Employee.findOne({
      $or: [{ user: req.user._id }, { email: req.user.email }],
    });

    if (!employee) {
      return notFound(res, 'Çalışan kaydınız bulunamadı');
    }

    // Şirket bilgisini al
    const company = await Company.findById(employee.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Şirket kurallarını kontrol et
    await advanceService.validateAdvanceRequest(
      employee._id,
      employee.company,
      amount,
      installments
    );

    // Taksit tutarının %25 limitini kontrol et
    const installmentLimitCheck = advanceService.validateInstallmentLimit(
      employee,
      amount,
      installments
    );
    if (!installmentLimitCheck.valid) {
      return errorResponse(res, {
        message: installmentLimitCheck.error,
        data: installmentLimitCheck.suggestions,
      });
    }

    // Avans onay ayarlarını al
    const advanceApprovalSettings = company.advanceApprovalSettings || {
      enabled: true,
      useLeaveApprovalChain: true,
      approvalLevels: 0,
      allowSelfApproval: false,
    };

    let approvalChain = [];
    let initialStatus = 'PENDING';
    let currentApprover = null;

    // Onay sistemi aktif mi?
    if (advanceApprovalSettings.enabled) {
      if (advanceApprovalSettings.useLeaveApprovalChain) {
        // Genel onay zincirini kullan (approvalMode dahil: admin, auto_approve vb.)
        const { chain, mode } = await calculateApprovalChainWithAdminMode(
          employee._id,
          employee.company
        );

        if (mode === 'auto_approve') {
          initialStatus = 'APPROVED';
        } else {
          let employeeChain = chain;

          // Approval levels kısıtlaması
          if (
            advanceApprovalSettings.approvalLevels > 0 &&
            employeeChain.length > advanceApprovalSettings.approvalLevels
          ) {
            employeeChain = employeeChain.slice(0, advanceApprovalSettings.approvalLevels);
          }

          if (employeeChain.length > 0) {
            // Employee ID'leri → approvalChain formatına dönüştür (User ID'leri ile)
            for (const empId of employeeChain) {
              const approverUser = await User.findOne({ employee: empId, isActive: true });
              if (approverUser) {
                const roleName =
                  typeof approverUser.role === 'object'
                    ? approverUser.role.name
                    : approverUser.role;
                approvalChain.push({
                  approver: approverUser._id,
                  role: roleName || 'manager',
                  status: 'PENDING',
                });
              }
            }

            if (approvalChain.length > 0) {
              currentApprover = employeeChain[0]; // Employee ID
              initialStatus = 'PENDING';
            } else {
              // User bulunamadı - otomatik onayla
              initialStatus = 'APPROVED';
            }
          } else {
            // Zincir boş (normalde calculateApprovalChainWithAdminMode admin fallback yapar)
            initialStatus = 'APPROVED';
          }
        }
      } else {
        // Özel avans onay zinciri (advanceService)
        approvalChain = await advanceService.createApprovalChain(employee._id, employee.company);

        // Approval levels kısıtlaması
        if (
          advanceApprovalSettings.approvalLevels > 0 &&
          approvalChain.length > advanceApprovalSettings.approvalLevels
        ) {
          approvalChain = approvalChain.slice(0, advanceApprovalSettings.approvalLevels);
        }

        if (approvalChain.length > 0) {
          initialStatus = 'PENDING';
          // İlk onaylayıcının Employee karşılığını bul
          const firstApproverEmployee = await Employee.findOne({
            email: (await User.findById(approvalChain[0].approver))?.email,
            company: employee.company,
          });
          currentApprover = firstApproverEmployee?._id || null;
        } else {
          // Zincir boş - approvalMode'a göre admin fallback
          const approvalMode = company.approvalMode || 'chain_with_admin';
          if (approvalMode === 'auto_approve') {
            initialStatus = 'APPROVED';
          } else {
            // Admin'i ekle
            const { getCompanyAdmin } = require('../services/approvalChainService');
            const adminEmployee = await getCompanyAdmin(employee.company);
            if (adminEmployee) {
              const adminUser = await User.findOne({
                employee: adminEmployee._id,
                isActive: true,
              });
              if (adminUser) {
                approvalChain.push({
                  approver: adminUser._id,
                  role: 'company_admin',
                  status: 'PENDING',
                });
                currentApprover = adminEmployee._id;
                initialStatus = 'PENDING';
              } else {
                initialStatus = 'APPROVED';
              }
            } else {
              initialStatus = 'APPROVED';
            }
          }
        }
      }
    } else {
      // Onay sistemi kapalı - direkt onayla
      initialStatus = 'APPROVED';
    }

    // Ödeme planı oluştur
    const paymentSchedule = advanceService.createPaymentSchedule(amount, installments);

    // Admin oluşturuyorsa direkt onayla
    const roleName = req.user.role?.name || req.user.role;
    const isAdminCreator = ['company_admin', 'bayi_admin', 'super_admin'].includes(roleName);
    if (isAdminCreator && employee.email !== req.user.email) {
      initialStatus = 'APPROVED';
      approvalChain = [];
      currentApprover = null;
    }

    // Avans talebi oluştur
    const advanceRequest = new AdvanceRequest({
      employee: employee._id,
      company: employee.company,
      amount,
      reason,
      installments,
      approvalChain,
      paymentSchedule,
      currentApprover,
      status: initialStatus,
    });

    if (initialStatus === 'APPROVED') {
      advanceRequest.approvedBy = req.user._id;
      advanceRequest.approvedAt = new Date();
    }

    await advanceRequest.save();

    // Otomatik onay ise ödeme kayıtlarını da oluştur
    if (initialStatus === 'APPROVED') {
      for (const scheduleItem of paymentSchedule) {
        const payment = new AdvancePayment({
          advanceRequest: advanceRequest._id,
          employee: employee._id,
          company: employee.company,
          month: scheduleItem.month,
          amount: scheduleItem.amount,
          paid: false,
        });
        await payment.save();
      }
    }

    // Populate ile döndür
    const populatedRequest = await AdvanceRequest.findById(advanceRequest._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('company', 'name')
      .populate('currentApprover', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message:
        initialStatus === 'APPROVED'
          ? 'Avans talebiniz onaylandı'
          : 'Avans talebiniz oluşturuldu, onay bekliyor',
      data: populatedRequest,
    });
  } catch (error) {
    console.error('Avans talebi oluşturma hatası:', error);
    return errorResponse(res, { message: error.message || 'Avans talebi oluşturulamadı' });
  }
});

// Avans taleplerini listele
router.get('/', auth, async (req, res) => {
  try {
    const { status, employee: employeeId } = req.query;
    const query = {};
    const roleName = req.user.role?.name || req.user.role;

    // Rol bazlı filtreleme
    if (roleName === 'employee') {
      // Çalışan sadece kendi taleplerini görebilir
      const employee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email }],
      });

      if (!employee) {
        return notFound(res, 'Çalışan kaydınız bulunamadı');
      }

      query.employee = employee._id;
    } else if (['company_admin', 'hr_manager', 'department_manager'].includes(roleName)) {
      // Yöneticiler şirketlerinin taleplerini görebilir
      query.company = req.user.company;

      if (employeeId) {
        query.employee = employeeId;
      }
    }

    if (status) {
      query.status = status;
    }

    const advanceRequests = await AdvanceRequest.find(query)
      .populate('employee', 'firstName lastName employeeNumber email')
      .populate('company', 'name')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalChain.approver', 'fullName email role')
      .sort({ requestDate: -1 })
      .limit(100);

    res.json({
      success: true,
      data: advanceRequests,
    });
  } catch (error) {
    console.error('Avans talepleri listeleme hatası:', error);
    return serverError(res, error, 'Avans talepleri yüklenemedi');
  }
});

// Avans talebi detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const roleName = req.user.role?.name || req.user.role;
    const advanceRequest = await AdvanceRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeNumber email department')
      .populate('company', 'name')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalChain.approver', 'fullName email role')
      .populate('approvedBy', 'fullName email')
      .populate('rejectedBy', 'fullName email')
      .populate('cancelledBy', 'fullName email');

    if (!advanceRequest) {
      return notFound(res, 'Avans talebi bulunamadı');
    }

    // Yetki kontrolü
    if (roleName === 'employee') {
      const employee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email }],
      });

      if (!employee || advanceRequest.employee._id.toString() !== employee._id.toString()) {
        return forbidden(res, 'Bu talebi görüntüleme yetkiniz yok');
      }
    } else if (['company_admin', 'hr_manager', 'department_manager'].includes(roleName)) {
      if (advanceRequest.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Bu talebi görüntüleme yetkiniz yok');
      }
    }

    res.json({
      success: true,
      data: advanceRequest,
    });
  } catch (error) {
    console.error('Avans talebi detay hatası:', error);
    return serverError(res, error, 'Avans talebi yüklenemedi');
  }
});

// Avans talebini onayla
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { comment } = req.body;

    const advanceRequest = await AdvanceRequest.findById(req.params.id).populate(
      'employee',
      'firstName lastName email'
    );

    if (!advanceRequest) {
      return notFound(res, 'Avans talebi bulunamadı');
    }

    if (advanceRequest.status !== 'PENDING') {
      return errorResponse(res, { message: 'Sadece bekleyen talepler onaylanabilir' });
    }

    // Onay zincirinde bu kullanıcının sırasını bul
    const approverIndex = advanceRequest.approvalChain.findIndex(
      a => a.approver.toString() === req.user._id.toString() && a.status === 'PENDING'
    );

    // Admin rolleri kontrolü
    const isAdmin = [
      'company_admin',
      'resmi_muhasebe_ik',
      'SIRKET_ADMIN',
      'IK_OPERASYON',
      'bayi_admin',
      'super_admin',
    ].includes(req.user.role?.name);
    const isSameCompany =
      advanceRequest.company.toString() === req.user.company?.toString() ||
      advanceRequest.company.toString() === req.user.company?._id?.toString();

    // Admin değilse ve onay zincirinde yoksa hata döndür
    if (approverIndex === -1 && !(isAdmin && isSameCompany)) {
      return forbidden(res, 'Bu talebi onaylama yetkiniz yok veya onay sırası size gelmedi');
    }

    // Onay işlemini yap
    if (approverIndex !== -1) {
      // Onay zincirindeki kişi onaylıyor
      advanceRequest.approvalChain[approverIndex].status = 'APPROVED';
      advanceRequest.approvalChain[approverIndex].actionDate = new Date();
      if (comment) {
        advanceRequest.approvalChain[approverIndex].comment = comment;
      }
    } else if (isAdmin && isSameCompany) {
      // Admin direkt onaylıyor - tüm zinciri onaylı yap
      advanceRequest.approvalChain.forEach(item => {
        if (item.status === 'PENDING') {
          item.status = 'APPROVED';
          item.actionDate = new Date();
        }
      });
    }

    // Tüm onaylar tamamlandı mı?
    const allApproved = advanceRequest.approvalChain.every(a => a.status === 'APPROVED');

    if (allApproved) {
      advanceRequest.status = 'APPROVED';
      advanceRequest.approvedBy = req.user._id;
      advanceRequest.approvedAt = new Date();
      advanceRequest.currentApprover = null; // Onay tamamlandı

      // Ödeme kayıtları oluştur
      for (const scheduleItem of advanceRequest.paymentSchedule) {
        const payment = new AdvancePayment({
          advanceRequest: advanceRequest._id,
          employee: advanceRequest.employee._id,
          company: advanceRequest.company,
          month: scheduleItem.month,
          amount: scheduleItem.amount,
          paid: false,
        });
        await payment.save();
      }

      // Puantaj kayıtlarına avans kesintilerini ekle
      for (let i = 0; i < advanceRequest.paymentSchedule.length; i++) {
        const scheduleItem = advanceRequest.paymentSchedule[i];
        const [year, month] = scheduleItem.month.split('-').map(Number);

        // İlgili ayın puantajını bul (varsa)
        const puantaj = await EmployeePuantaj.findOne({
          employee: advanceRequest.employee._id,
          year,
          month,
        });

        if (puantaj) {
          // Aynı avans için zaten eklenmemişse ekle
          const existingDeduction = puantaj.advanceDeductions.find(
            d => d.advanceRequestId?.toString() === advanceRequest._id.toString()
          );

          if (!existingDeduction) {
            puantaj.advanceDeductions.push({
              advanceRequestId: advanceRequest._id,
              amount: scheduleItem.amount,
              description: `Avans Taksiti ${i + 1}/${advanceRequest.installments}`,
              isDeducted: false,
            });
            puantaj.totalAdvanceDeduction =
              (puantaj.totalAdvanceDeduction || 0) + scheduleItem.amount;
            await puantaj.save();
          }
        }
        // Not: Puantaj kaydı yoksa şimdilik ekleme yapmıyoruz.
        // Puantaj oluşturulduğunda avans kesintileri kontrol edilecek.
      }
    } else if (approverIndex !== -1) {
      // Sıradaki onaylayıcıyı belirle
      const nextPendingIndex = advanceRequest.approvalChain.findIndex(
        (a, i) => i > approverIndex && a.status === 'PENDING'
      );
      if (nextPendingIndex !== -1 && advanceRequest.approvalChain[nextPendingIndex].approver) {
        // approver User ID, currentApprover Employee ref - dönüşüm yap
        const nextApproverUserId = advanceRequest.approvalChain[nextPendingIndex].approver;
        const nextApproverUser = await User.findById(nextApproverUserId);
        if (nextApproverUser?.employee) {
          advanceRequest.currentApprover = nextApproverUser.employee;
        } else {
          // Employee bulunamazsa User ID'yi dene (eski format uyumluluğu)
          advanceRequest.currentApprover = nextApproverUserId;
        }
      }
    }

    await advanceRequest.save();

    const populatedRequest = await AdvanceRequest.findById(advanceRequest._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalChain.approver', 'fullName email role');

    res.json({
      success: true,
      message: allApproved ? 'Avans talebi onaylandı' : 'Onayınız kaydedildi',
      data: populatedRequest,
    });
  } catch (error) {
    console.error('Avans onaylama hatası:', error);
    return serverError(res, error, 'Avans onaylanamadı');
  }
});

// Avans talebini reddet
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, { message: 'Reddetme nedeni zorunludur' });
    }

    const advanceRequest = await AdvanceRequest.findById(req.params.id);

    if (!advanceRequest) {
      return notFound(res, 'Avans talebi bulunamadı');
    }

    if (advanceRequest.status !== 'PENDING') {
      return errorResponse(res, { message: 'Sadece bekleyen talepler reddedilebilir' });
    }

    // Onay zincirinde bu kullanıcının yetkisini kontrol et
    const hasPermission = advanceRequest.approvalChain.some(
      a => a.approver.toString() === req.user._id.toString()
    );

    // Admin rolleri kontrolü
    const isAdmin = [
      'company_admin',
      'resmi_muhasebe_ik',
      'SIRKET_ADMIN',
      'IK_OPERASYON',
      'bayi_admin',
      'super_admin',
    ].includes(req.user.role?.name);
    const isSameCompany =
      advanceRequest.company.toString() === req.user.company?.toString() ||
      advanceRequest.company.toString() === req.user.company?._id?.toString();

    if (!hasPermission && !(isAdmin && isSameCompany)) {
      return forbidden(res, 'Bu talebi reddetme yetkiniz yok');
    }

    advanceRequest.status = 'REJECTED';
    advanceRequest.rejectedBy = req.user._id;
    advanceRequest.rejectedAt = new Date();
    advanceRequest.rejectionReason = reason;
    advanceRequest.currentApprover = null; // Reddedildi, artık onaylayıcı yok

    await advanceRequest.save();

    const populatedRequest = await AdvanceRequest.findById(advanceRequest._id)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('rejectedBy', 'fullName email');

    res.json({
      success: true,
      message: 'Avans talebi reddedildi',
      data: populatedRequest,
    });
  } catch (error) {
    console.error('Avans reddetme hatası:', error);
    return serverError(res, error, 'Avans reddedilemedi');
  }
});

// Avans talebini iptal et (sadece çalışan)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const advanceRequest = await AdvanceRequest.findById(req.params.id);

    if (!advanceRequest) {
      return notFound(res, 'Avans talebi bulunamadı');
    }

    // Çalışan kontrolü
    const employee = await Employee.findOne({
      $or: [{ user: req.user._id }, { email: req.user.email }],
    });

    if (!employee || advanceRequest.employee.toString() !== employee._id.toString()) {
      return forbidden(res, 'Bu talebi iptal etme yetkiniz yok');
    }

    if (advanceRequest.status !== 'PENDING') {
      return errorResponse(res, { message: 'Sadece bekleyen talepler iptal edilebilir' });
    }

    advanceRequest.status = 'CANCELLED';
    advanceRequest.cancelledBy = req.user._id;
    advanceRequest.cancelledAt = new Date();
    advanceRequest.currentApprover = null; // İptal edildi
    if (reason) {
      advanceRequest.cancellationReason = reason;
    }

    await advanceRequest.save();

    res.json({
      success: true,
      message: 'Avans talebiniz iptal edildi',
      data: advanceRequest,
    });
  } catch (error) {
    console.error('Avans iptal hatası:', error);
    return serverError(res, error, 'Avans iptal edilemedi');
  }
});

// Ödeme kaydı işle
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { month } = req.body;

    if (!month) {
      return errorResponse(res, { message: 'Ay bilgisi zorunludur' });
    }

    const payment = await advanceService.processPayment(req.params.id, month, req.user._id);

    res.json({
      success: true,
      message: 'Ödeme başarıyla kaydedildi',
      data: payment,
    });
  } catch (error) {
    console.error('Ödeme işleme hatası:', error);
    return errorResponse(res, { message: error.message || 'Ödeme işlenemedi' });
  }
});

// Ödeme geçmişi
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const payments = await AdvancePayment.find({ advanceRequest: req.params.id })
      .populate('processedBy', 'fullName email')
      .sort({ month: 1 });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Ödeme geçmişi hatası:', error);
    return serverError(res, error, 'Ödeme geçmişi yüklenemedi');
  }
});

// İstatistikler
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const roleName = req.user.role?.name || req.user.role;
    let query = {};

    if (roleName === 'employee') {
      const employee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email }],
      });

      if (employee) {
        query.employee = employee._id;
      }
    } else if (['company_admin', 'hr_manager', 'department_manager'].includes(roleName)) {
      query.company = req.user.company;
    }

    const totalRequests = await AdvanceRequest.countDocuments(query);
    const pendingRequests = await AdvanceRequest.countDocuments({ ...query, status: 'PENDING' });
    const approvedRequests = await AdvanceRequest.countDocuments({ ...query, status: 'APPROVED' });
    const rejectedRequests = await AdvanceRequest.countDocuments({ ...query, status: 'REJECTED' });

    // Toplam avans tutarı
    const totalAmountResult = await AdvanceRequest.aggregate([
      { $match: { ...query, status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    // Kalan borç
    const remainingAmountResult = await AdvanceRequest.aggregate([
      { $match: { ...query, status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } },
    ]);

    const remainingAmount = remainingAmountResult.length > 0 ? remainingAmountResult[0].total : 0;

    res.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        totalAmount,
        remainingAmount,
        paidAmount: totalAmount - remainingAmount,
      },
    });
  } catch (error) {
    console.error('İstatistik hatası:', error);
    return serverError(res, error, 'İstatistikler yüklenemedi');
  }
});

module.exports = router;
