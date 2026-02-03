const express = require('express');
const router = express.Router();
const PuantajTemplate = require('../models/PuantajTemplate');
const PuantajCode = require('../models/PuantajCode');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Department = require('../models/Department');
const CompanyHolidayCalendar = require('../models/CompanyHolidayCalendar');
const LeaveRequest = require('../models/LeaveRequest');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Luca Puantaj varsayılan kodları
const LUCA_PUANTAJ_CODES = [
  { code: 'N', name: 'Normal', color: '#FFFFFF', textColor: '#000000', autoAssignType: 'normal', sortOrder: 1 },
  { code: 'T', name: 'Resmi Tatil', color: '#9966FF', textColor: '#FFFFFF', autoAssignType: 'public_holiday', sortOrder: 2 },
  { code: 'H', name: 'Hafta Tatili', color: '#0066FF', textColor: '#FFFFFF', autoAssignType: 'weekend', sortOrder: 3 },
  { code: 'İ', name: 'İzinli', color: '#00CC66', textColor: '#FFFFFF', autoAssignType: 'leave', sortOrder: 4 },
  { code: 'G', name: 'Gece Mesaisi', color: '#666666', textColor: '#FFFFFF', autoAssignType: 'night_overtime', sortOrder: 5 },
  { code: 'R', name: 'Raporlu', color: '#FF3333', textColor: '#FFFFFF', autoAssignType: 'sick_leave', sortOrder: 6 },
  { code: 'E', name: 'Eksik Gün', color: '#FF9933', textColor: '#000000', autoAssignType: 'absent', sortOrder: 7 },
  { code: 'Y', name: 'Yarım Gün', color: '#FFFF00', textColor: '#000000', autoAssignType: 'half_day', sortOrder: 8 },
  { code: 'S', name: 'Yıllık İzin', color: '#99FF99', textColor: '#000000', autoAssignType: 'annual_leave', sortOrder: 9 },
  { code: 'O', name: 'Gündüz Mesaisi', color: '#006633', textColor: '#FFFFFF', autoAssignType: 'day_overtime', sortOrder: 10 },
  { code: 'K', name: 'Yarım Gün Resmi Tatil', color: '#FF99CC', textColor: '#000000', autoAssignType: 'half_public', sortOrder: 11 },
  { code: 'C', name: 'Yarım Gün Hafta Tatili', color: '#99CCFF', textColor: '#000000', autoAssignType: 'half_weekend', sortOrder: 12 }
];

// Şirketin aktif puantaj şablonunu al
const getActiveTemplate = async (companyId) => {
  // 1. Önce şirketin atanmış şablonunu kontrol et
  const company = await Company.findById(companyId);
  if (company && company.activePuantajTemplate) {
    const activeTemplate = await PuantajTemplate.findById(company.activePuantajTemplate);
    if (activeTemplate && activeTemplate.isActive) {
      return activeTemplate;
    }
  }

  // 2. Şirketin varsayılan şablonunu kontrol et
  const companyDefault = await PuantajTemplate.findOne({
    company: companyId,
    isDefault: true,
    isActive: true
  });
  if (companyDefault) {
    return companyDefault;
  }

  // 3. Global varsayılan şablonu getir (Luca Puantaj)
  return await getOrCreateLucaPuantajTemplate();
};

// Varsayılan "Luca Puantaj" şablonunu oluştur veya getir
const getOrCreateLucaPuantajTemplate = async () => {
  let template = await PuantajTemplate.findOne({ name: 'Luca Puantaj', company: null });

  if (!template) {
    try {
      template = await PuantajTemplate.create({
        name: 'Luca Puantaj',
        description: 'Varsayılan Luca puantaj şablonu',
        company: null,
        isDefault: true,
        isActive: true
      });

      // Kodları oluştur
      for (const codeData of LUCA_PUANTAJ_CODES) {
        await PuantajCode.create({
          ...codeData,
          template: template._id,
          isSystem: true
        });
      }
    } catch (error) {
      // Race condition - tekrar dene
      if (error.code === 11000) {
        template = await PuantajTemplate.findOne({ name: 'Luca Puantaj', company: null });
      } else {
        throw error;
      }
    }
  }

  return template;
};

// ==================== ŞABLON İŞLEMLERİ ====================

// Tüm şablonları getir
router.get('/templates', auth, async (req, res) => {
  try {
    let query = { isActive: true };

    // Şirket bazlı veya global şablonlar
    if (req.user.company) {
      query.$or = [
        { company: null },
        { company: req.user.company }
      ];
    }

    const templates = await PuantajTemplate.find(query)
      .populate('company', 'name')
      .sort({ isDefault: -1, name: 1 });

    // Varsayılan Luca Puantaj şablonunu kontrol et
    const lucaExists = templates.some(t => t.name === 'Luca Puantaj' && t.company === null);
    if (!lucaExists) {
      const lucaTemplate = await getOrCreateLucaPuantajTemplate();
      templates.unshift(lucaTemplate);
    }

    res.json(templates);
  } catch (error) {
    return serverError(res, error);
  }
});

// Şablon detayı (kodlarla birlikte)
router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await PuantajTemplate.findById(req.params.id)
      .populate('company', 'name');

    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    const codes = await PuantajCode.find({ template: template._id })
      .sort({ sortOrder: 1 });

    res.json({ template, codes });
  } catch (error) {
    return serverError(res, error);
  }
});

// Yeni şablon oluştur
router.post('/templates', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const { name, description, company, copyFromTemplate } = req.body;

    const template = await PuantajTemplate.create({
      name,
      description,
      company: company || (req.user.role.name === 'company_admin' ? req.user.company : null),
      createdBy: req.user._id
    });

    // Mevcut şablondan kopyala
    if (copyFromTemplate) {
      const sourceCodes = await PuantajCode.find({ template: copyFromTemplate });
      for (const code of sourceCodes) {
        await PuantajCode.create({
          code: code.code,
          name: code.name,
          color: code.color,
          textColor: code.textColor,
          template: template._id,
          autoAssignType: code.autoAssignType,
          sortOrder: code.sortOrder,
          isSystem: false
        });
      }
    }

    res.status(201).json(template);
  } catch (error) {
    return serverError(res, error);
  }
});

// Şablon sil
router.delete('/templates/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const template = await PuantajTemplate.findById(req.params.id);

    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Global şablonları silme
    if (!template.company) {
      return errorResponse(res, { message: 'Global şablonlar silinemez' });
    }

    // Varsayılan şablonları silme
    if (template.isDefault) {
      return errorResponse(res, { message: 'Varsayılan şablonlar silinemez' });
    }

    // Şablonun kodlarını sil
    await PuantajCode.deleteMany({ template: template._id });

    // Şablonu sil
    await PuantajTemplate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Şablon silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// ==================== KOD İŞLEMLERİ ====================

// Şablonun kodlarını getir
router.get('/templates/:templateId/codes', auth, async (req, res) => {
  try {
    const codes = await PuantajCode.find({ template: req.params.templateId })
      .sort({ sortOrder: 1 });
    res.json(codes);
  } catch (error) {
    return serverError(res, error);
  }
});

// Yeni kod ekle
router.post('/templates/:templateId/codes', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const { code, name, color, textColor, autoAssignType, sortOrder } = req.body;

    const newCode = await PuantajCode.create({
      code,
      name,
      color,
      textColor: textColor || '#000000',
      template: req.params.templateId,
      autoAssignType: autoAssignType || 'custom',
      sortOrder: sortOrder || 99,
      isSystem: false
    });

    res.status(201).json(newCode);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, { message: 'Bu kod zaten mevcut' });
    }
    return serverError(res, error);
  }
});

// Kod güncelle
router.put('/codes/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const code = await PuantajCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!code) {
      return notFound(res, 'Kod bulunamadı');
    }

    res.json(code);
  } catch (error) {
    return serverError(res, error);
  }
});

// ==================== PUANTAJ İŞLEMLERİ ====================

// Çalışan puantajını getir veya oluştur
router.get('/employee/:employeeId/:year/:month', auth, async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    const employee = await Employee.findById(employeeId).populate('company');
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Company ID'yi güvenli şekilde al
    const companyId = employee.company?._id?.toString() || employee.company?.toString();

    // Şirketin aktif şablonunu al
    const template = await getActiveTemplate(companyId);

    // Mevcut puantaj kaydını bul veya oluştur
    let puantaj = await EmployeePuantaj.findOne({
      employee: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!puantaj) {
      // Yeni puantaj oluştur ve otomatik doldur
      puantaj = await generatePuantaj(employee, template, parseInt(year), parseInt(month));
    }

    // Kodları da getir
    const codes = await PuantajCode.find({ template: template._id }).sort({ sortOrder: 1 });

    res.json({ puantaj, codes, template });
  } catch (error) {
    return serverError(res, error);
  }
});

// Puantajı yeniden hesapla
router.post('/employee/:employeeId/:year/:month/regenerate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    const employee = await Employee.findById(employeeId).populate('company');
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Mevcut kaydı sil
    await EmployeePuantaj.deleteOne({
      employee: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });

    // Company ID'yi güvenli şekilde al
    const companyId = employee.company?._id?.toString() || employee.company?.toString();

    // Şirketin aktif şablonunu al
    const template = await getActiveTemplate(companyId);

    // Yeniden oluştur
    const puantaj = await generatePuantaj(employee, template, parseInt(year), parseInt(month));
    const codes = await PuantajCode.find({ template: template._id }).sort({ sortOrder: 1 });

    res.json({ puantaj, codes, template });
  } catch (error) {
    return serverError(res, error);
  }
});

// Şirketin tüm çalışanları için puantajı yeniden hesapla
router.post('/company/:companyId/:year/:month/regenerate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { companyId, year, month } = req.params;
    const { preserveManualOverrides } = req.body; // Manuel değişiklikleri koru seçeneği

    // Şirketin aktif çalışanlarını al
    const employees = await Employee.find({
      company: companyId,
      status: 'active'
    }).populate('company').populate('department', 'name');

    // Şirketin aktif şablonunu al
    const template = await getActiveTemplate(companyId);

    const regeneratedList = [];
    for (const employee of employees) {
      // Mevcut puantaj kaydını bul
      const existingPuantaj = await EmployeePuantaj.findOne({
        employee: employee._id,
        year: parseInt(year),
        month: parseInt(month)
      });

      // Manuel değişiklikleri sakla
      let manualOverrides = {};
      if (preserveManualOverrides && existingPuantaj) {
        existingPuantaj.days.forEach(day => {
          if (day.isManualOverride) {
            const dateKey = new Date(day.date).getDate();
            manualOverrides[dateKey] = {
              code: day.code,
              overtimeHours: day.overtimeHours,
              note: day.note
            };
          }
        });
      }

      // Mevcut kaydı sil
      if (existingPuantaj) {
        await EmployeePuantaj.deleteOne({ _id: existingPuantaj._id });
      }

      // Yeniden oluştur
      const newPuantaj = await generatePuantaj(employee, template, parseInt(year), parseInt(month));

      // Manuel değişiklikleri geri uygula
      if (preserveManualOverrides && Object.keys(manualOverrides).length > 0) {
        for (const [dateKey, override] of Object.entries(manualOverrides)) {
          const dayIndex = newPuantaj.days.findIndex(d => new Date(d.date).getDate() === parseInt(dateKey));
          if (dayIndex !== -1) {
            newPuantaj.days[dayIndex].code = override.code;
            newPuantaj.days[dayIndex].overtimeHours = override.overtimeHours;
            newPuantaj.days[dayIndex].note = override.note;
            newPuantaj.days[dayIndex].isManualOverride = true;
          }
        }
        recalculateSummary(newPuantaj);
        await newPuantaj.save();
      }

      regeneratedList.push({
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
          personelNumarasi: employee.personelNumarasi,
          department: employee.department,
          hireDate: employee.hireDate,
          isRetired: employee.isRetired,
          tcKimlik: employee.tcKimlik
        },
        puantaj: newPuantaj
      });
    }

    const codes = await PuantajCode.find({ template: template._id }).sort({ sortOrder: 1 });

    res.json({
      message: `${regeneratedList.length} çalışanın puantajı yeniden hesaplandı`,
      puantajList: regeneratedList,
      codes,
      template,
      year: parseInt(year),
      month: parseInt(month)
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Tek bir günü güncelle
router.put('/employee/:employeeId/:year/:month/day/:day', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, year, month, day } = req.params;
    const { code, overtimeHours, note } = req.body;

    const puantaj = await EmployeePuantaj.findOne({
      employee: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!puantaj) {
      return notFound(res, 'Puantaj kaydı bulunamadı');
    }

    if (puantaj.status === 'approved') {
      return errorResponse(res, { message: 'Onaylanmış puantaj değiştirilemez' });
    }

    // İlgili günü bul ve güncelle
    const dayIndex = puantaj.days.findIndex(d =>
      new Date(d.date).getDate() === parseInt(day)
    );

    if (dayIndex === -1) {
      return notFound(res, 'Gün bulunamadı');
    }

    puantaj.days[dayIndex].code = code;
    puantaj.days[dayIndex].isManualOverride = true;
    if (overtimeHours !== undefined) {
      puantaj.days[dayIndex].overtimeHours = overtimeHours;
    }
    if (note !== undefined) {
      puantaj.days[dayIndex].note = note;
    }

    // Özeti yeniden hesapla
    recalculateSummary(puantaj);

    await puantaj.save();

    res.json(puantaj);
  } catch (error) {
    return serverError(res, error);
  }
});

// Manuel mesai girişi güncelle
router.put('/employee/:employeeId/:year/:month/manual-overtime', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;
    const { dayOvertimeHours, nightOvertimeHours, note } = req.body;

    let puantaj = await EmployeePuantaj.findOne({
      employee: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!puantaj) {
      // Puantaj yoksa önce oluştur
      const employee = await Employee.findById(employeeId).populate('company');
      if (!employee) {
        return notFound(res, 'Çalışan bulunamadı');
      }
      const companyId = employee.company?._id?.toString() || employee.company?.toString();
      const template = await getActiveTemplate(companyId);
      puantaj = await generatePuantaj(employee, template, parseInt(year), parseInt(month));
    }

    if (puantaj.status === 'approved') {
      return errorResponse(res, { message: 'Onaylanmış puantaj değiştirilemez' });
    }

    // Manuel mesai bilgilerini güncelle
    if (!puantaj.manualOvertime) {
      puantaj.manualOvertime = {};
    }

    if (dayOvertimeHours !== undefined) {
      puantaj.manualOvertime.dayOvertimeHours = dayOvertimeHours;
    }
    if (nightOvertimeHours !== undefined) {
      puantaj.manualOvertime.nightOvertimeHours = nightOvertimeHours;
    }
    if (note !== undefined) {
      puantaj.manualOvertime.note = note;
    }

    await puantaj.save();

    res.json({
      success: true,
      data: puantaj,
      message: 'Manuel mesai bilgileri güncellendi'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Şirketin tüm çalışanları için aylık puantaj listesi
router.get('/company/:companyId/:year/:month', auth, async (req, res) => {
  try {
    const { companyId, year, month } = req.params;

    // Şirketin çalışanlarını al
    const employees = await Employee.find({
      company: companyId,
      status: 'active'
    }).select('firstName lastName employeeNumber personelNumarasi department hireDate isRetired tcKimlik')
      .populate('department', 'name');

    // Şirketin aktif şablonunu al
    const template = await getActiveTemplate(companyId);

    const codes = await PuantajCode.find({ template: template._id }).sort({ sortOrder: 1 });

    // Her çalışan için puantaj kayıtlarını al veya oluştur
    const puantajList = [];
    for (const employee of employees) {
      try {
        let puantaj = await EmployeePuantaj.findOne({
          employee: employee._id,
          year: parseInt(year),
          month: parseInt(month)
        });

        if (!puantaj) {
          const fullEmployee = await Employee.findById(employee._id).populate('company');
          if (!fullEmployee || !fullEmployee.company) {
            console.warn(`Çalışan ${employee._id} için şirket bilgisi bulunamadı, atlanıyor`);
            continue;
          }
          puantaj = await generatePuantaj(fullEmployee, template, parseInt(year), parseInt(month));
        }

        puantajList.push({
          employee: {
            _id: employee._id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeNumber: employee.employeeNumber,
            personelNumarasi: employee.personelNumarasi,
            department: employee.department,
            hireDate: employee.hireDate,
            isRetired: employee.isRetired,
            tcKimlik: employee.tcKimlik
          },
          puantaj
        });
      } catch (empError) {
        console.error(`Çalışan ${employee._id} için puantaj oluşturma hatası:`, empError);
        // Diğer çalışanlar için devam et
      }
    }

    res.json({ puantajList, codes, template, year: parseInt(year), month: parseInt(month) });
  } catch (error) {
    console.error('Puantaj yükleme hatası:', error);
    return serverError(res, error, 'Puantaj yüklenirken hata oluştu');
  }
});

// ==================== RAPOR İŞLEMLERİ ====================

// Puantaj özet raporu
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const { year, month, company, department } = req.query;

    // Yıl ve ay zorunlu
    if (!year || !month) {
      return errorResponse(res, { message: 'Yıl ve ay parametreleri zorunludur' });
    }

    // Şirket ID'sini belirle
    let companyId = company;
    if (!companyId) {
      // Kullanıcının şirketini kullan
      companyId = req.user.company?._id?.toString() || req.user.company?.toString();
    }

    if (!companyId) {
      return errorResponse(res, { message: 'Şirket bilgisi gerekli' });
    }

    // Çalışan filtresi
    const employeeFilter = {
      company: companyId,
      status: 'active'
    };

    if (department) {
      employeeFilter.department = department;
    }

    // Aktif çalışanları al
    const employees = await Employee.find(employeeFilter)
      .select('firstName lastName employeeNumber personelNumarasi department')
      .populate('department', 'name');

    // Puantaj verilerini al
    const puantajList = await EmployeePuantaj.find({
      company: companyId,
      year: parseInt(year),
      month: parseInt(month),
      employee: { $in: employees.map(e => e._id) }
    });

    // Puantaj verilerini employee ID'ye göre map'le
    const puantajMap = {};
    puantajList.forEach(p => {
      puantajMap[p.employee.toString()] = p;
    });

    // Rapor verilerini oluştur
    const reportData = employees.map(emp => {
      const puantaj = puantajMap[emp._id.toString()];
      const summary = puantaj?.summary || {};

      return {
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeNumber: emp.employeeNumber,
          personelNumarasi: emp.personelNumarasi,
          department: emp.department?.name || '-'
        },
        normalDays: summary.normalDays || 0,
        weekendDays: summary.weekendDays || 0,
        publicHolidays: summary.publicHolidays || 0,
        annualLeaveDays: summary.annualLeaveDays || 0,
        sickLeaveDays: summary.sickLeaveDays || 0,
        otherLeaveDays: summary.otherLeaveDays || 0,
        absentDays: summary.absentDays || 0,
        halfDays: summary.halfDays || 0,
        dayOvertimeHours: summary.dayOvertimeHours || 0,
        nightOvertimeHours: summary.nightOvertimeHours || 0,
        status: puantaj?.status || 'not_generated'
      };
    });

    // Toplam özet hesapla
    const totalSummary = {
      totalEmployees: employees.length,
      totalWorkDays: reportData.reduce((sum, r) => sum + r.normalDays, 0),
      totalOvertime: reportData.reduce((sum, r) => sum + r.dayOvertimeHours + r.nightOvertimeHours, 0),
      totalLeaveDays: reportData.reduce((sum, r) => sum + r.annualLeaveDays + r.sickLeaveDays + r.otherLeaveDays, 0),
      totalAbsenceDays: reportData.reduce((sum, r) => sum + r.absentDays, 0)
    };

    res.json({
      success: true,
      data: reportData,
      summary: totalSummary,
      year: parseInt(year),
      month: parseInt(month)
    });
  } catch (error) {
    console.error('Puantaj raporu hatası:', error);
    return serverError(res, error, 'Puantaj raporu yüklenirken hata oluştu');
  }
});

// ==================== YARDIMCI FONKSİYONLAR ====================

// Hafta tatili hiyerarşisi: Çalışan > Departman > Şirket
async function getEffectiveWeekendDays(employee) {
  // 1. Önce çalışanın kendi hafta tatili ayarını kontrol et
  if (employee.weekendDays && employee.weekendDays.length > 0) {
    return employee.weekendDays;
  }

  // 2. Departman ayarını kontrol et
  if (employee.department) {
    let department = employee.department;
    // Eğer populate edilmemişse fetch et
    if (typeof department === 'string' || (department && department._id)) {
      const deptId = department?._id?.toString() || department?.toString();
      if (deptId) {
        department = await Department.findById(deptId);
      }
    }
    if (department && department.weekendDays && department.weekendDays.length > 0) {
      return department.weekendDays;
    }
  }

  // 3. Şirket ayarını kontrol et
  let company = employee.company;
  // Eğer populate edilmemişse fetch et
  if (typeof company === 'string' || (company && !company.leaveSettings)) {
    const companyId = company?._id?.toString() || company?.toString();
    if (companyId) {
      company = await Company.findById(companyId);
    }
  }
  if (company && company.leaveSettings && company.leaveSettings.weekendDays && company.leaveSettings.weekendDays.length > 0) {
    return company.leaveSettings.weekendDays;
  }

  // 4. Varsayılan: Cumartesi ve Pazar
  return [0, 6];
}

// Puantaj oluştur
async function generatePuantaj(employee, template, year, month) {
  const codes = await PuantajCode.find({ template: template._id });
  const codeMap = {};
  codes.forEach(c => { codeMap[c.autoAssignType] = c.code; });

  // Company ID'yi güvenli şekilde al
  const companyId = employee.company?._id?.toString() || employee.company?.toString();
  if (!companyId) {
    throw new Error('Çalışan için şirket bilgisi bulunamadı');
  }

  // Ayın günlerini al
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  // Resmi tatilleri al
  const holidayCalendar = await CompanyHolidayCalendar.findOne({
    companyId: companyId,
    year
  });

  // Tatil verilerini işle (eski ve yeni format desteği)
  const holidays = holidayCalendar ? holidayCalendar.holidays.map(h => h.toISOString().split('T')[0]) : [];

  // Yarım gün tatilleri için detayları al
  const holidayDetails = {};
  if (holidayCalendar && holidayCalendar.holidayDetails) {
    holidayCalendar.holidayDetails.forEach(h => {
      const dateStr = new Date(h.date).toISOString().split('T')[0];
      holidayDetails[dateStr] = {
        name: h.name,
        isHalfDay: h.isHalfDay,
        halfDayPeriod: h.halfDayPeriod
      };
    });
  }

  // Çalışanın hafta tatili günlerini al (hiyerarşi: Çalışan > Departman > Şirket)
  const weekendDays = await getEffectiveWeekendDays(employee);

  // Onaylanmış izinleri al (APPROVED büyük harfle)
  const leaveRequests = await LeaveRequest.find({
    employee: employee._id,
    status: 'APPROVED',
    startDate: { $lte: new Date(year, month, 0) },
    endDate: { $gte: new Date(year, month - 1, 1) }
  }).populate('companyLeaveType');

  // İzin günlerini map'le
  const leaveDays = {};
  for (const leave of leaveRequests) {
    const start = new Date(Math.max(leave.startDate, new Date(year, month - 1, 1)));
    const end = new Date(Math.min(leave.endDate, new Date(year, month, 0)));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // İzin türüne göre kod belirle
      let leaveCode = codeMap.leave || 'İ';
      if (leave.companyLeaveType) {
        const leaveTypeName = leave.companyLeaveType.name?.toLowerCase() || '';
        if (leaveTypeName.includes('yıllık') || leaveTypeName.includes('yillik')) {
          leaveCode = codeMap.annual_leave || 'S';
        } else if (leaveTypeName.includes('rapor') || leaveTypeName.includes('hastalık') || leaveTypeName.includes('hastalik')) {
          leaveCode = codeMap.sick_leave || 'R';
        }
      }

      leaveDays[dateStr] = leaveCode;
    }
  }

  // Her gün için kod belirle
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    let code = codeMap.normal || 'N';

    // Öncelik sırası: İzin > Resmi Tatil > Hafta Tatili > Normal
    if (leaveDays[dateStr]) {
      // İzin günü - ama hafta tatili günlerinde izin düşmez
      if (weekendDays.includes(dayOfWeek)) {
        code = codeMap.weekend || 'H';
      } else {
        code = leaveDays[dateStr];
      }
    } else if (holidays.includes(dateStr) || holidayDetails[dateStr]) {
      // Yarım gün tatil kontrolü
      const detail = holidayDetails[dateStr];
      if (detail && detail.isHalfDay) {
        code = codeMap.half_public || 'K'; // Yarım Gün Resmi Tatil
      } else {
        code = codeMap.public_holiday || 'T';
      }
    } else if (weekendDays.includes(dayOfWeek)) {
      code = codeMap.weekend || 'H';
    }

    days.push({
      date,
      code,
      overtimeHours: 0,
      isManualOverride: false
    });
  }

  // Puantaj kaydını oluştur
  const puantaj = new EmployeePuantaj({
    employee: employee._id,
    company: companyId,
    template: template._id,
    year,
    month,
    days,
    status: 'draft'
  });

  // Özeti hesapla
  recalculateSummary(puantaj);

  await puantaj.save();
  return puantaj;
}

// Özeti yeniden hesapla
function recalculateSummary(puantaj) {
  const summary = {
    normalDays: 0,
    weekendDays: 0,
    publicHolidays: 0,
    annualLeaveDays: 0,
    sickLeaveDays: 0,
    otherLeaveDays: 0,
    absentDays: 0,
    halfDays: 0,
    dayOvertimeHours: 0,
    nightOvertimeHours: 0
  };

  for (const day of puantaj.days) {
    switch (day.code) {
      case 'N': summary.normalDays++; break;
      case 'H': summary.weekendDays++; break;
      case 'T': summary.publicHolidays++; break;
      case 'S': summary.annualLeaveDays++; break;
      case 'R': summary.sickLeaveDays++; break;
      case 'İ': summary.otherLeaveDays++; break;
      case 'E': summary.absentDays++; break;
      case 'Y':
        // Yarım gün çalışma - normal güne 0.5 ekle
        summary.halfDays++;
        summary.normalDays += 0.5;
        break;
      case 'O':
        // Gündüz mesaisi - normal gün olarak sayılır + mesai saati
        summary.normalDays++;
        summary.dayOvertimeHours += day.overtimeHours || 0;
        break;
      case 'G':
        // Gece mesaisi - normal gün olarak sayılır + mesai saati
        summary.normalDays++;
        summary.nightOvertimeHours += day.overtimeHours || 0;
        break;
      case 'K':
        // Yarım gün resmi tatil - 0.5 tatil + 0.5 normal
        summary.publicHolidays += 0.5;
        summary.normalDays += 0.5;
        summary.halfDays++;
        break;
      case 'C':
        // Yarım gün hafta tatili - 0.5 hafta tatili + 0.5 normal
        summary.weekendDays += 0.5;
        summary.normalDays += 0.5;
        summary.halfDays++;
        break;
    }
  }

  puantaj.summary = summary;
}

// Varsayılan şablonu başlat (uygulama başlangıcında çağrılabilir)
router.post('/init-default-template', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const template = await getOrCreateLucaPuantajTemplate();
    const codes = await PuantajCode.find({ template: template._id }).sort({ sortOrder: 1 });
    res.json({ template, codes });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;
