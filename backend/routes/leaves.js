const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveLedger = require('../models/LeaveLedger');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { calculateAnnualLeave } = require('../services/leaveAccrualEngine');
const { calculateAnnualLeaveDays, calculateSeniority, calculateAge } = require('../utils/leaveCalculator');
const moment = require('moment');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Helper: Yıllık izin türü kontrolü
const annualLeaveKeywords = ['yıllık', 'yillik', 'annual'];
function isAnnualLeaveType(typeName) {
  if (!typeName) return false;
  const lowerName = typeName.toLowerCase();
  return annualLeaveKeywords.some(kw => lowerName.includes(kw));
}

// Helper: Hak edilen kayıtlarını otomatik oluştur (LeaveLedger'dan)
async function ensureEntitlementEntries(employee, year) {
  const hireDate = new Date(employee.hireDate);
  const hireYear = hireDate.getFullYear();

  // İşe giriş yılı seçilen yıldan büyükse, henüz hak etmemiş
  if (hireYear > year) return;

  // Seçilen yıldaki yıl dönümü tarihi
  const anniversaryDate = new Date(year, hireDate.getMonth(), hireDate.getDate());
  const today = new Date();

  // Eğer yıl dönümü henüz gelmemişse, kayıt oluşturma
  if (anniversaryDate > today) return;

  // O yıl için zaten ENTITLEMENT kaydı var mı?
  const existingEntitlement = await LeaveLedger.findOne({
    employee: employee._id,
    year: year,
    type: 'ENTITLEMENT'
  });

  if (existingEntitlement) return; // Zaten var

  // Kıdem hesapla (yıl dönümü tarihine göre)
  const seniorityAtDate = year - hireYear;

  // Kıdem 0 ise henüz hak etmemiş, kayıt oluşturma
  if (seniorityAtDate <= 0) return;

  const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
  const entitlementDays = calculateAnnualLeaveDays(seniorityAtDate, age);

  // Yeni ENTITLEMENT kaydı oluştur
  await LeaveLedger.create({
    employee: employee._id,
    company: employee.company,
    year: year,
    date: anniversaryDate,
    type: 'ENTITLEMENT',
    description: `Hak Edilen (${seniorityAtDate}. yıl)`,
    credit: entitlementDays,
    debit: 0,
    balance: 0,
    isSystemGenerated: true
  });
}

// Helper: Bakiyeleri yeniden hesapla
async function recalculateBalances(employeeId, year) {
  const entries = await LeaveLedger.find({
    employee: employeeId,
    year: year
  }).sort({ date: 1, createdAt: 1 });

  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance = runningBalance + (entry.credit || 0) - (entry.debit || 0);
    entry.balance = runningBalance;
    await entry.save();
  }

  return runningBalance;
}

// Helper: Sonraki hak edileceği tarihi hesapla
function calculateNextEntitlementDate(hireDate) {
  if (!hireDate) return null;

  const hire = new Date(hireDate);
  const today = new Date();

  // Bu yılki yıl dönümü
  let nextDate = new Date(today.getFullYear(), hire.getMonth(), hire.getDate());

  // Eğer bu yılki yıl dönümü geçtiyse, gelecek yılın yıl dönümünü al
  if (nextDate <= today) {
    nextDate = new Date(today.getFullYear() + 1, hire.getMonth(), hire.getDate());
  }

  return nextDate;
}

// GET /leave/calculate/:employeeId
// İzin hakedişini getir.
router.get('/calculate/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId).populate('company');
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== employee.company._id.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    const companyPolicy = employee.company.leavePolicy || {
      allowSplitLeave: true,
      minFirstBlockDays: 10
    };
    
    const result = calculateAnnualLeave(employee, companyPolicy);

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('İzin hakediş hesaplama hatası:', error);
    return serverError(res, error);
  }
});

// GET /leave/summary?companyId=
// ÖNEMLİ: Bu endpoint artık LeaveLedger'dan veri çekiyor (tek kaynak)
router.get('/summary', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const currentYear = new Date().getFullYear();

    // Yetki kontrolü
    let targetCompanyId = companyId;

    // Helper: company field'dan ID'yi güvenli şekilde al
    const getCompanyId = (companyField) => {
      if (!companyField) return null;
      if (typeof companyField === 'object' && companyField._id) {
        return companyField._id.toString();
      }
      return companyField.toString();
    };

    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) {
        return notFound(res, 'Çalışan bulunamadı');
      }
      targetCompanyId = getCompanyId(emp.company);
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      targetCompanyId = req.user.company ? getCompanyId(req.user.company) : companyId;
    } else if (req.user.role.name === 'bayi_admin') {
      if (!companyId) {
        return errorResponse(res, { message: 'companyId gerekli' });
      }
      targetCompanyId = companyId;
    } else if (req.user.role.name === 'super_admin') {
      if (!companyId) {
        return errorResponse(res, { message: 'companyId gerekli' });
      }
      targetCompanyId = companyId;
    }

    if (!targetCompanyId) {
      return errorResponse(res, { message: 'companyId gerekli' });
    }

    let employees;
    // Employee rolü için sadece kendi kaydını getir
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) {
        return notFound(res, 'Çalışan bulunamadı');
      }
      employees = [emp];
    } else {
      employees = await Employee.find({ company: targetCompanyId, isActive: true });
    }

    const summary = [];
    for (const emp of employees) {
      // 1. Önce ENTITLEMENT kaydının var olduğundan emin ol
      await ensureEntitlementEntries(emp, currentYear);

      // 2. Bakiyeleri yeniden hesapla
      await recalculateBalances(emp._id, currentYear);

      // 3. LeaveLedger'dan verileri çek (silinen kayıtlar hariç)
      const allLedgerEntries = await LeaveLedger.find({
        employee: emp._id,
        year: currentYear,
        isDeleted: { $ne: true }
      })
        .populate('leaveRequest')
        .sort({ date: -1, createdAt: -1 });

      // Sadece yıllık izin kayıtlarını filtrele
      // USED dışındaki türler (ENTITLEMENT, CARRYOVER, ADJUSTMENT, REVERSAL) zaten yıllık izin içindir
      const ledgerEntries = allLedgerEntries.filter(entry => {
        if (entry.type !== 'USED') return true;
        if (!entry.leaveRequest) return false;
        const leaveTypeName = entry.leaveRequest.type || '';
        return isAnnualLeaveType(leaveTypeName);
      });

      // Toplamları hesapla
      let totalCredit = 0; // Hakediş (ENTITLEMENT + CARRYOVER + REVERSAL + ADJUSTMENT credit)
      let totalDebit = 0;  // Kullanılan (USED + ADJUSTMENT debit)

      for (const entry of ledgerEntries) {
        totalCredit += entry.credit || 0;
        totalDebit += entry.debit || 0;
      }

      const balance = totalCredit - totalDebit;

      // Sonraki hakediş tarihi ve günü
      const nextEntitlementDate = calculateNextEntitlementDate(emp.hireDate);
      const seniority = calculateSeniority(emp.hireDate);
      const age = emp.birthDate ? calculateAge(emp.birthDate) : null;
      const nextEntitlementDays = calculateAnnualLeaveDays(seniority + 1, age);

      summary.push({
        employeeId: emp._id,
        name: `${emp.firstName} ${emp.lastName}`.toUpperCase(),
        hireDate: emp.hireDate || emp.startDate,
        accrualDays: totalCredit,        // LeaveLedger'dan: toplam hakediş
        usedDays: totalDebit,             // LeaveLedger'dan: toplam kullanılan
        remainingDays: balance,           // LeaveLedger'dan: kalan bakiye
        nextAccrualDate: nextEntitlementDate ? moment(nextEntitlementDate).format('DD.MM.YYYY') : null,
        nextAccrualDays: nextEntitlementDays
      });
    }

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('İzin özeti hesaplama hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;

