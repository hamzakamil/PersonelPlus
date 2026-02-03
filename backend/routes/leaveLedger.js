const express = require('express');
const router = express.Router();
const LeaveLedger = require('../models/LeaveLedger');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const { auth, requireRole } = require('../middleware/auth');
const { calculateAnnualLeaveDays, calculateSeniority, calculateAge } = require('../utils/leaveCalculator');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Helper: Yıllık izin türü kontrolü
const annualLeaveKeywords = ['yıllık', 'yillik', 'annual'];
function isAnnualLeaveType(typeName) {
  if (!typeName) return false;
  const lowerName = typeName.toLowerCase();
  return annualLeaveKeywords.some(kw => lowerName.includes(kw));
}

// Helper: Bakiyeleri yeniden hesapla
async function recalculateBalances(employeeId, year) {
  const entries = await LeaveLedger.find({
    employee: employeeId,
    year: year,
    isDeleted: { $ne: true }
  }).sort({ date: 1, createdAt: 1 });

  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance = runningBalance + (entry.credit || 0) - (entry.debit || 0);
    entry.balance = runningBalance;
    await entry.save();
  }

  return runningBalance;
}

// Helper: Hak edilen tarihi hesapla
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

// Helper: Otomatik hak edilen kayıtlarını oluştur/güncelle
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
    type: 'ENTITLEMENT',
    isDeleted: { $ne: true }
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
    balance: 0, // recalculateBalances ile hesaplanacak
    isSystemGenerated: true
  });
}

// GET: Giriş yapan çalışanın kendi cetveli
router.get('/me/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;

    // Çalışan kaydını bul
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    // Otomatik hak edilen kayıtlarını kontrol et
    await ensureEntitlementEntries(employee, parseInt(year));

    // Bakiyeleri yeniden hesapla
    await recalculateBalances(employee._id, parseInt(year));

    // Kayıtları getir
    const allEntries = await LeaveLedger.find({
      employee: employee._id,
      year: parseInt(year),
      isDeleted: { $ne: true }
    })
      .populate('leaveRequest')
      .sort({ date: 1, createdAt: 1 });

    // Sadece yıllık izin kayıtlarını filtrele
    // USED dışındaki türler (ENTITLEMENT, CARRYOVER, ADJUSTMENT, REVERSAL) zaten yıllık izin içindir
    // USED için ise leaveRequest'in türünü kontrol et
    const entries = allEntries.filter(entry => {
      if (entry.type !== 'USED') return true; // ENTITLEMENT, CARRYOVER, etc. - her zaman dahil
      if (!entry.leaveRequest) return false; // USED ama leaveRequest yok - hariç tut
      const leaveTypeName = entry.leaveRequest.type || '';
      return isAnnualLeaveType(leaveTypeName);
    });

    // Toplam hesapla
    const totals = entries.reduce((acc, entry) => {
      acc.totalCredit += entry.credit || 0;
      acc.totalDebit += entry.debit || 0;
      return acc;
    }, { totalCredit: 0, totalDebit: 0 });

    // Sonraki hak edileceği tarih
    const nextEntitlementDate = calculateNextEntitlementDate(employee.hireDate);
    const seniority = calculateSeniority(employee.hireDate);
    const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
    const nextEntitlementDays = calculateAnnualLeaveDays(seniority + 1, age);

    res.json({
      entries,
      totals: {
        ...totals,
        balance: totals.totalCredit - totals.totalDebit
      },
      employee: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hireDate: employee.hireDate,
        seniority
      },
      nextEntitlement: {
        date: nextEntitlementDate,
        days: nextEntitlementDays
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET: Çalışanın yıllık cetveli
router.get('/employee/:employeeId/:year', auth, async (req, res) => {
  try {
    const { employeeId, year } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employeeId) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // Otomatik hak edilen kayıtlarını kontrol et
    await ensureEntitlementEntries(employee, parseInt(year));

    // Bakiyeleri yeniden hesapla
    await recalculateBalances(employeeId, parseInt(year));

    // Kayıtları getir
    const allEntries = await LeaveLedger.find({
      employee: employeeId,
      year: parseInt(year),
      isDeleted: { $ne: true }
    })
      .populate('leaveRequest')
      .populate('createdBy', 'email')
      .sort({ date: 1, createdAt: 1 });

    // Sadece yıllık izin kayıtlarını filtrele
    const entries = allEntries.filter(entry => {
      if (entry.type !== 'USED') return true;
      if (!entry.leaveRequest) return false;
      const leaveTypeName = entry.leaveRequest.type || '';
      return isAnnualLeaveType(leaveTypeName);
    });

    // Toplam hesapla
    const totals = entries.reduce((acc, entry) => {
      acc.totalCredit += entry.credit || 0;
      acc.totalDebit += entry.debit || 0;
      return acc;
    }, { totalCredit: 0, totalDebit: 0 });

    // Sonraki hak edileceği tarih
    const nextEntitlementDate = calculateNextEntitlementDate(employee.hireDate);
    const seniority = calculateSeniority(employee.hireDate);
    const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
    const nextEntitlementDays = calculateAnnualLeaveDays(seniority + 1, age);

    res.json({
      entries,
      totals: {
        ...totals,
        balance: totals.totalCredit - totals.totalDebit
      },
      employee: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hireDate: employee.hireDate,
        seniority
      },
      nextEntitlement: {
        date: nextEntitlementDate,
        days: nextEntitlementDays
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST: Devir girişi (manuel)
router.post('/carryover', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, year, days, note } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // Aynı yıl için zaten devir var mı?
    const existingCarryover = await LeaveLedger.findOne({
      employee: employeeId,
      year: year,
      type: 'CARRYOVER',
      isDeleted: { $ne: true }
    });

    if (existingCarryover) {
      // Güncelle
      existingCarryover.credit = days;
      existingCarryover.note = note || '';
      existingCarryover.createdBy = req.user._id;
      await existingCarryover.save();
    } else {
      // Yeni oluştur - yılın ilk günü olarak kaydet
      await LeaveLedger.create({
        employee: employeeId,
        company: employee.company,
        year: year,
        date: new Date(year, 0, 1), // 1 Ocak
        type: 'CARRYOVER',
        description: 'Önceki Yıl Devir',
        credit: days,
        debit: 0,
        note: note || '',
        createdBy: req.user._id,
        isSystemGenerated: false
      });
    }

    // Bakiyeleri yeniden hesapla
    await recalculateBalances(employeeId, year);

    res.json({ message: 'Devir kaydı oluşturuldu' });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST: Düzeltme girişi (manuel)
router.post('/adjustment', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, year, date, credit, debit, description, note } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    await LeaveLedger.create({
      employee: employeeId,
      company: employee.company,
      year: year,
      date: new Date(date),
      type: 'ADJUSTMENT',
      description: description || 'Manuel Düzeltme',
      credit: credit || 0,
      debit: debit || 0,
      note: note || '',
      createdBy: req.user._id,
      isSystemGenerated: false
    });

    // Bakiyeleri yeniden hesapla
    await recalculateBalances(employeeId, year);

    res.json({ message: 'Düzeltme kaydı oluşturuldu' });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST: Bakiyeleri yeniden hesapla
router.post('/recalculate/:employeeId/:year', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, year } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Otomatik hak edilen kayıtlarını kontrol et
    await ensureEntitlementEntries(employee, parseInt(year));

    // Bakiyeleri yeniden hesapla
    const finalBalance = await recalculateBalances(employeeId, parseInt(year));

    res.json({ message: 'Bakiyeler yeniden hesaplandı', balance: finalBalance });
  } catch (error) {
    return serverError(res, error);
  }
});

// DELETE: Kayıt sil (soft delete)
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const entry = await LeaveLedger.findById(req.params.id);

    if (!entry) {
      return notFound(res, 'Kayıt bulunamadı');
    }

    // Yetki kontrolü
    const userRole = req.user.role.name;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(userRole)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== entry.company.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // Sistem kayıtlarını sadece admin silebilir (onay gerekli)
    if (entry.isSystemGenerated && !['super_admin', 'bayi_admin', 'company_admin'].includes(userRole)) {
      return errorResponse(res, { message: 'Sistem kayıtlarını silme yetkiniz yok' });
    }

    const { employee, year, leaveRequest } = entry;
    const { reason } = req.body;

    // Soft delete
    entry.isDeleted = true;
    entry.deletedAt = new Date();
    entry.deletedBy = req.user._id;
    entry.deleteReason = reason || 'Cetvel kaydı silindi';
    await entry.save();

    // Eğer bu kayıt bir izin talebine bağlıysa, izin talebini de sil
    if (leaveRequest) {
      const leaveRequestDoc = await LeaveRequest.findById(leaveRequest);
      if (leaveRequestDoc && !leaveRequestDoc.isDeleted) {
        leaveRequestDoc.isDeleted = true;
        leaveRequestDoc.deletedAt = new Date();
        leaveRequestDoc.deletedBy = req.user._id;
        leaveRequestDoc.deleteReason = reason || 'Cetvel kaydından silindi';
        leaveRequestDoc.history.push({
          approverUser: req.user._id,
          status: leaveRequestDoc.status,
          note: 'İzin cetveli üzerinden silindi',
          date: new Date()
        });
        await leaveRequestDoc.save();

        // İlgili diğer ledger kayıtlarını da sil (REVERSAL varsa)
        await LeaveLedger.updateMany(
          { leaveRequest: leaveRequest, _id: { $ne: entry._id } },
          {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.user._id,
            deleteReason: reason || 'İzin talebi silindi'
          }
        );
      }
    }

    // Bakiyeleri yeniden hesapla
    await recalculateBalances(employee, year);

    res.json({
      success: true,
      message: leaveRequest ? 'Kayıt ve ilgili izin talebi silindi' : 'Kayıt silindi'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// PUT: Kayıt güncelle (sadece manuel girişler)
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const entry = await LeaveLedger.findById(req.params.id);

    if (!entry) {
      return notFound(res, 'Kayıt bulunamadı');
    }

    // Sadece manuel girişler güncellenebilir
    if (entry.isSystemGenerated && entry.type !== 'CARRYOVER') {
      return errorResponse(res, { message: 'Sistem tarafından oluşturulan kayıtlar güncellenemez' });
    }

    const { credit, debit, description, note, date } = req.body;

    if (credit !== undefined) entry.credit = credit;
    if (debit !== undefined) entry.debit = debit;
    if (description) entry.description = description;
    if (note !== undefined) entry.note = note;
    if (date) entry.date = new Date(date);

    await entry.save();

    // Bakiyeleri yeniden hesapla
    await recalculateBalances(entry.employee, entry.year);

    res.json({ message: 'Kayıt güncellendi', entry });
  } catch (error) {
    return serverError(res, error);
  }
});

// Helper function to create ledger entry when leave is approved (exported for use in leaveRequests.js)
// SADECE yıllık izinler için LeaveLedger kaydı oluşturur
async function createLeaveUsedEntry(leaveRequest, totalDays) {
  // Sadece yıllık izin türleri için kayıt oluştur
  const leaveTypeName = leaveRequest.type || '';
  if (!isAnnualLeaveType(leaveTypeName)) {
    return; // Yıllık izin değilse kayıt oluşturma
  }

  const employee = await Employee.findById(leaveRequest.employee);
  if (!employee) return;

  const year = new Date(leaveRequest.startDate).getFullYear();

  // Aynı izin için zaten kayıt var mı kontrol et
  const existingEntry = await LeaveLedger.findOne({
    leaveRequest: leaveRequest._id,
    isDeleted: { $ne: true }
  });

  if (existingEntry) return; // Zaten var

  await LeaveLedger.create({
    employee: leaveRequest.employee,
    company: leaveRequest.company,
    year: year,
    date: leaveRequest.startDate,
    type: 'USED',
    description: `${leaveRequest.type} (${new Date(leaveRequest.startDate).toLocaleDateString('tr-TR')} - ${new Date(leaveRequest.endDate).toLocaleDateString('tr-TR')})`,
    credit: 0,
    debit: totalDays,
    leaveRequest: leaveRequest._id,
    isSystemGenerated: true
  });

  // Bakiyeleri yeniden hesapla
  await recalculateBalances(leaveRequest.employee, year);
}

// Helper function to create reversal entry when leave is cancelled
// SADECE yıllık izinler için (USED kaydı varsa)
async function createLeaveReversalEntry(leaveRequest) {
  // Sadece yıllık izin türleri için işlem yap
  const leaveTypeName = leaveRequest.type || '';
  if (!isAnnualLeaveType(leaveTypeName)) {
    return; // Yıllık izin değilse iptal kaydı oluşturma
  }

  const usedEntry = await LeaveLedger.findOne({
    leaveRequest: leaveRequest._id,
    type: 'USED',
    isDeleted: { $ne: true }
  });

  if (!usedEntry) return;

  const year = new Date(leaveRequest.startDate).getFullYear();

  await LeaveLedger.create({
    employee: leaveRequest.employee,
    company: leaveRequest.company,
    year: year,
    date: new Date(),
    type: 'REVERSAL',
    description: `İptal: ${usedEntry.description}`,
    credit: usedEntry.debit, // İptal edilen günleri geri ekle
    debit: 0,
    leaveRequest: leaveRequest._id,
    isSystemGenerated: true
  });

  // Bakiyeleri yeniden hesapla
  await recalculateBalances(leaveRequest.employee, year);
}

/**
 * Çalışanın belirli bir yıl için izin bakiyesini LeaveLedger'dan hesaplar
 * SADECE yıllık izin kayıtlarını dahil eder
 * @param {ObjectId} employeeId - Çalışan ID
 * @param {number} year - Yıl
 * @returns {Object} { totalCredit, totalDebit, balance, entries }
 */
async function getLeaveBalanceFromLedger(employeeId, year) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return { totalCredit: 0, totalDebit: 0, balance: 0, entries: [] };
  }

  // Otomatik hak edilen kayıtlarını kontrol et
  await ensureEntitlementEntries(employee, year);

  // Bakiyeleri yeniden hesapla
  await recalculateBalances(employeeId, year);

  // Kayıtları getir
  const allEntries = await LeaveLedger.find({
    employee: employeeId,
    year: year,
    isDeleted: { $ne: true }
  })
    .populate('leaveRequest')
    .sort({ date: 1, createdAt: 1 });

  // Sadece yıllık izin kayıtlarını filtrele
  const entries = allEntries.filter(entry => {
    if (entry.type !== 'USED') return true;
    if (!entry.leaveRequest) return false;
    const leaveTypeName = entry.leaveRequest.type || '';
    return isAnnualLeaveType(leaveTypeName);
  });

  // Toplam hesapla
  const totals = entries.reduce((acc, entry) => {
    acc.totalCredit += entry.credit || 0;
    acc.totalDebit += entry.debit || 0;
    return acc;
  }, { totalCredit: 0, totalDebit: 0 });

  return {
    totalCredit: totals.totalCredit,
    totalDebit: totals.totalDebit,
    balance: totals.totalCredit - totals.totalDebit,
    entries
  };
}

/**
 * Çalışanın güncel izin bakiyesi özetini döndürür (LeaveBalance yerine kullanılacak)
 * @param {ObjectId} employeeId - Çalışan ID
 * @returns {Object} LeaveBalance benzeri yapı
 */
async function getEmployeeLeaveBalance(employeeId) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const seniority = calculateSeniority(employee.hireDate);
  const age = employee.birthDate ? calculateAge(employee.birthDate) : null;
  const annualDays = calculateAnnualLeaveDays(seniority, age);

  // LeaveLedger'dan bakiye al
  const ledgerBalance = await getLeaveBalanceFromLedger(employeeId, currentYear);

  // Saatlik izin hesaplama (LeaveLedger'dan saatlik kayıtları topla)
  // Not: Saatlik izinler için ayrı bir izleme yapılabilir, şimdilik 0
  const hourlyLeaveHours = 0;
  const hourlyLeaveDaysEquivalent = Math.floor(hourlyLeaveHours / 8);

  return {
    employee: employee._id,
    company: employee.company,
    annualLeaveDays: annualDays,
    usedAnnualLeaveDays: ledgerBalance.totalDebit,
    remainingAnnualLeaveDays: ledgerBalance.balance,
    hourlyLeaveHours,
    hourlyLeaveDaysEquivalent,
    calculationYear: currentYear,
    seniority,
    age,
    lastCalculationDate: new Date(),
    // Ek bilgiler
    totalCredit: ledgerBalance.totalCredit,
    totalDebit: ledgerBalance.totalDebit,
    ledgerBalance: ledgerBalance.balance
  };
}

module.exports = router;
module.exports.createLeaveUsedEntry = createLeaveUsedEntry;
module.exports.createLeaveReversalEntry = createLeaveReversalEntry;
module.exports.getLeaveBalanceFromLedger = getLeaveBalanceFromLedger;
module.exports.getEmployeeLeaveBalance = getEmployeeLeaveBalance;
module.exports.recalculateBalances = recalculateBalances;
module.exports.ensureEntitlementEntries = ensureEntitlementEntries;
