const express = require('express');
const router = express.Router();
const EmployeePayment = require('../models/EmployeePayment');
const CompanyPaymentType = require('../models/CompanyPaymentType');
const Employee = require('../models/Employee');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, serverError } = require('../utils/responseHelper');

// ==================== ÇALIŞAN ÖDEMELERİ ====================

/**
 * GET /api/employees/:employeeId/payments
 * Çalışanın ödeme atamalarını listele
 */
router.get('/:employeeId/payments', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, active } = req.query;

    const query = { employee: employeeId };

    if (status) {
      query.status = status;
    }

    if (active === 'true') {
      query.isActive = true;
    } else if (active === 'false') {
      query.isActive = false;
    }

    const payments = await EmployeePayment.find(query)
      .populate({
        path: 'companyPaymentType',
        populate: { path: 'paymentType' }
      })
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .sort({ createdAt: -1 });

    // Aylık toplam hesapla
    const activeMonthlyPayments = payments.filter(p =>
      p.isActive &&
      p.status === 'APPROVED' &&
      p.companyPaymentType?.paymentType?.paymentFrequency === 'MONTHLY'
    );

    const monthlyTotal = activeMonthlyPayments.reduce((sum, p) => {
      const amount = p.amount !== null ? p.amount : (p.companyPaymentType?.defaultAmount || 0);
      return sum + amount;
    }, 0);

    res.json({
      payments,
      summary: {
        total: payments.length,
        active: payments.filter(p => p.isActive).length,
        monthlyTotal
      }
    });
  } catch (error) {
    console.error('Çalışan ödemeleri alınamadı:', error);
    return serverError(res, error, 'Ödemeler alınamadı');
  }
});

/**
 * POST /api/employees/:employeeId/payments
 * Çalışana ödeme ata
 */
router.post('/:employeeId/payments', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const {
      companyPaymentTypeId,
      amount,
      startDate,
      endDate,
      paymentDate,
      notes
    } = req.body;

    // Çalışanı kontrol et
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Şirket ödeme türünü kontrol et
    const companyPaymentType = await CompanyPaymentType.findById(companyPaymentTypeId)
      .populate('paymentType');

    if (!companyPaymentType) {
      return notFound(res, 'Ödeme türü bulunamadı');
    }

    // Aynı ödeme türünden aktif kayıt var mı kontrol et (tek seferlik hariç)
    if (companyPaymentType.paymentType.paymentFrequency !== 'ONE_TIME') {
      const existingActive = await EmployeePayment.findOne({
        employee: employeeId,
        companyPaymentType: companyPaymentTypeId,
        isActive: true
      });

      if (existingActive) {
        return errorResponse(res, { message: 'Bu ödeme türünden zaten aktif bir atama var' });
      }
    }

    // Durum belirleme
    let status = 'APPROVED'; // Aylık ödemeler otomatik onaylı

    // Tek seferlik ödemeler için onay gerekebilir
    if (companyPaymentType.paymentType.paymentFrequency === 'ONE_TIME') {
      if (companyPaymentType.settings?.requiresApproval) {
        status = 'PENDING';
      }
    }

    const employeePayment = await EmployeePayment.create({
      employee: employeeId,
      company: employee.company,
      companyPaymentType: companyPaymentTypeId,
      amount: amount || null,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      paymentDate: paymentDate || null,
      status,
      notes,
      createdBy: req.user._id,
      approvedBy: status === 'APPROVED' ? req.user._id : null,
      approvedAt: status === 'APPROVED' ? new Date() : null
    });

    const populated = await EmployeePayment.findById(employeePayment._id)
      .populate({
        path: 'companyPaymentType',
        populate: { path: 'paymentType' }
      })
      .populate('createdBy', 'email');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Ödeme ataması oluşturulamadı:', error);
    return serverError(res, error, 'Ödeme atanamadı');
  }
});

/**
 * PUT /api/employees/:employeeId/payments/:id
 * Ödeme atamasını güncelle
 */
router.put('/:employeeId/payments/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, id } = req.params;
    const { amount, startDate, endDate, notes, isActive } = req.body;

    const payment = await EmployeePayment.findOne({
      _id: id,
      employee: employeeId
    });

    if (!payment) {
      return notFound(res, 'Ödeme ataması bulunamadı');
    }

    // Onaylı veya ödendi durumundaki kayıtlar için tutar değiştirilemez
    if (['PAID'].includes(payment.status) && amount !== undefined) {
      return errorResponse(res, { message: 'Ödenmiş kayıtların tutarı değiştirilemez' });
    }

    // Alanları güncelle
    if (amount !== undefined) payment.amount = amount;
    if (startDate !== undefined) payment.startDate = startDate;
    if (endDate !== undefined) payment.endDate = endDate;
    if (notes !== undefined) payment.notes = notes;
    if (isActive !== undefined) payment.isActive = isActive;

    await payment.save();

    const populated = await EmployeePayment.findById(payment._id)
      .populate({
        path: 'companyPaymentType',
        populate: { path: 'paymentType' }
      });

    res.json(populated);
  } catch (error) {
    console.error('Ödeme ataması güncellenemedi:', error);
    return serverError(res, error, 'Güncelleme başarısız');
  }
});

/**
 * DELETE /api/employees/:employeeId/payments/:id
 * Ödeme atamasını sonlandır (bitiş tarihi set et)
 */
router.delete('/:employeeId/payments/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, id } = req.params;

    const payment = await EmployeePayment.findOne({
      _id: id,
      employee: employeeId
    });

    if (!payment) {
      return notFound(res, 'Ödeme ataması bulunamadı');
    }

    // Silmek yerine sonlandır
    payment.isActive = false;
    payment.endDate = new Date();
    await payment.save();

    res.json({ message: 'Ödeme ataması sonlandırıldı' });
  } catch (error) {
    console.error('Ödeme ataması sonlandırılamadı:', error);
    return serverError(res, error, 'Sonlandırma başarısız');
  }
});

/**
 * POST /api/employees/:employeeId/payments/:id/approve
 * Tek seferlik ödemeyi onayla
 */
router.post('/:employeeId/payments/:id/approve', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, id } = req.params;
    const { comment } = req.body;

    const payment = await EmployeePayment.findOne({
      _id: id,
      employee: employeeId
    });

    if (!payment) {
      return notFound(res, 'Ödeme ataması bulunamadı');
    }

    if (payment.status !== 'PENDING') {
      return errorResponse(res, { message: 'Bu ödeme zaten işlem görmüş' });
    }

    payment.status = 'APPROVED';
    payment.approvedBy = req.user._id;
    payment.approvedAt = new Date();

    // Onay zinciri güncelle
    payment.approvalChain.push({
      approver: req.user._id,
      status: 'APPROVED',
      actionDate: new Date(),
      comment: comment || null
    });

    await payment.save();

    const populated = await EmployeePayment.findById(payment._id)
      .populate({
        path: 'companyPaymentType',
        populate: { path: 'paymentType' }
      })
      .populate('approvedBy', 'email');

    res.json(populated);
  } catch (error) {
    console.error('Ödeme onaylanamadı:', error);
    return serverError(res, error, 'Onaylama başarısız');
  }
});

/**
 * POST /api/employees/:employeeId/payments/:id/reject
 * Tek seferlik ödemeyi reddet
 */
router.post('/:employeeId/payments/:id/reject', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, { message: 'Red nedeni zorunludur' });
    }

    const payment = await EmployeePayment.findOne({
      _id: id,
      employee: employeeId
    });

    if (!payment) {
      return notFound(res, 'Ödeme ataması bulunamadı');
    }

    if (payment.status !== 'PENDING') {
      return errorResponse(res, { message: 'Bu ödeme zaten işlem görmüş' });
    }

    payment.status = 'REJECTED';
    payment.rejectedBy = req.user._id;
    payment.rejectedAt = new Date();
    payment.rejectionReason = reason;
    payment.isActive = false;

    // Onay zinciri güncelle
    payment.approvalChain.push({
      approver: req.user._id,
      status: 'REJECTED',
      actionDate: new Date(),
      comment: reason
    });

    await payment.save();

    res.json({ message: 'Ödeme reddedildi' });
  } catch (error) {
    console.error('Ödeme reddedilemedi:', error);
    return serverError(res, error, 'Reddetme başarısız');
  }
});

/**
 * POST /api/employees/:employeeId/payments/:id/mark-paid
 * Tek seferlik ödemeyi ödendi olarak işaretle
 */
router.post('/:employeeId/payments/:id/mark-paid', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, id } = req.params;

    const payment = await EmployeePayment.findOne({
      _id: id,
      employee: employeeId
    });

    if (!payment) {
      return notFound(res, 'Ödeme ataması bulunamadı');
    }

    if (payment.status !== 'APPROVED') {
      return errorResponse(res, { message: 'Sadece onaylanmış ödemeler ödendi olarak işaretlenebilir' });
    }

    payment.status = 'PAID';
    payment.isPaid = true;
    payment.paidDate = new Date();

    await payment.save();

    res.json({ message: 'Ödeme ödendi olarak işaretlendi' });
  } catch (error) {
    console.error('Ödeme işaretlenemedi:', error);
    return serverError(res, error, 'İşaretleme başarısız');
  }
});

// ==================== TOPLU İŞLEMLER ====================

/**
 * POST /api/employee-payments/bulk-assign
 * Birden fazla çalışana aynı ödemeyi ata
 */
router.post('/bulk-assign', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeIds, companyPaymentTypeId, amount, startDate } = req.body;

    if (!employeeIds || !employeeIds.length) {
      return errorResponse(res, { message: 'En az bir çalışan seçilmeli' });
    }

    const companyPaymentType = await CompanyPaymentType.findById(companyPaymentTypeId)
      .populate('paymentType');

    if (!companyPaymentType) {
      return notFound(res, 'Ödeme türü bulunamadı');
    }

    const results = {
      success: [],
      failed: []
    };

    for (const employeeId of employeeIds) {
      try {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          results.failed.push({ employeeId, reason: 'Çalışan bulunamadı' });
          continue;
        }

        // Mevcut aktif atama kontrolü
        if (companyPaymentType.paymentType.paymentFrequency !== 'ONE_TIME') {
          const existing = await EmployeePayment.findOne({
            employee: employeeId,
            companyPaymentType: companyPaymentTypeId,
            isActive: true
          });

          if (existing) {
            results.failed.push({ employeeId, reason: 'Zaten atanmış' });
            continue;
          }
        }

        const payment = await EmployeePayment.create({
          employee: employeeId,
          company: employee.company,
          companyPaymentType: companyPaymentTypeId,
          amount: amount || null,
          startDate: startDate || new Date(),
          status: 'APPROVED',
          createdBy: req.user._id,
          approvedBy: req.user._id,
          approvedAt: new Date()
        });

        results.success.push(payment);
      } catch (err) {
        results.failed.push({ employeeId, reason: err.message });
      }
    }

    res.json({
      message: `${results.success.length} başarılı, ${results.failed.length} başarısız`,
      results
    });
  } catch (error) {
    console.error('Toplu atama başarısız:', error);
    return serverError(res, error, 'Toplu atama başarısız');
  }
});

/**
 * GET /api/employee-payments/company/:companyId/summary
 * Şirket ödeme özeti
 */
router.get('/company/:companyId/summary', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Aktif ödemeleri al
    const activePayments = await EmployeePayment.find({
      company: companyId,
      isActive: true,
      status: 'APPROVED'
    }).populate({
      path: 'companyPaymentType',
      populate: { path: 'paymentType' }
    });

    // Ödeme türüne göre grupla
    const byType = {};
    let monthlyTotal = 0;

    for (const payment of activePayments) {
      const typeName = payment.companyPaymentType?.paymentType?.name || 'Bilinmeyen';
      const frequency = payment.companyPaymentType?.paymentType?.paymentFrequency;
      const amount = payment.amount !== null
        ? payment.amount
        : (payment.companyPaymentType?.defaultAmount || 0);

      if (!byType[typeName]) {
        byType[typeName] = {
          name: typeName,
          count: 0,
          total: 0,
          frequency
        };
      }

      byType[typeName].count++;
      byType[typeName].total += amount;

      if (frequency === 'MONTHLY') {
        monthlyTotal += amount;
      }
    }

    res.json({
      totalActivePayments: activePayments.length,
      monthlyTotal,
      byType: Object.values(byType)
    });
  } catch (error) {
    console.error('Özet alınamadı:', error);
    return serverError(res, error, 'Özet alınamadı');
  }
});

module.exports = router;
