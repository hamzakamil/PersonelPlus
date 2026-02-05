const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const { auth, requireRole } = require('../middleware/auth');
const { generateMonthlyAttendance, getAttendanceCalendar, getTemplateCodesForCompany } = require('../services/attendanceService');
const XLSX = require('xlsx');
const AttendanceTemplate = require('../models/AttendanceTemplate');
const AttendanceTemplateItem = require('../models/AttendanceTemplateItem');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Get attendances with filters
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    const { employee, company, startDate, endDate, month, year } = req.query;

    if (employee) {
      query.employee = employee;
    }

    if (company) {
      query.company = company;
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.company = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = {
        $gte: start,
        $lte: end
      };
    }

    const attendances = await Attendance.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .sort({ date: -1, employee: 1 });

    res.json(attendances);
  } catch (error) {
    return serverError(res, error);
  }
});

// Get attendance calendar for a month
router.get('/calendar', auth, async (req, res) => {
  try {
    const { employee, company, month, year } = req.query;

    if (!month || !year) {
      return errorResponse(res, { message: 'Ay ve yıl gereklidir' });
    }

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    let query = {
      company: companyId,
      date: {
        $gte: start,
        $lte: end
      }
    };

    if (employee) {
      query.employee = employee;
    }

    const attendances = await Attendance.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .sort({ date: 1, employee: 1 });

    // Group by employee and date
    const calendar = {};
    attendances.forEach(att => {
      const empId = att.employee._id.toString();
      const dateKey = att.date.toISOString().split('T')[0];
      
      if (!calendar[empId]) {
        calendar[empId] = {
          employee: att.employee,
          dates: {}
        };
      }
      
      calendar[empId].dates[dateKey] = {
        code: att.code,
        description: att.description,
        startTime: att.startTime,
        endTime: att.endTime,
        workingHours: att.workingHours,
        overtime: att.overtime,
        notes: att.notes
      };
    });

    res.json(calendar);
  } catch (error) {
    return serverError(res, error);
  }
});

// Excel export - Puantaj tablosunu Excel olarak indir
// NOT: Bu route /:id'den ÖNCE tanımlanmalı!
router.get('/export-excel', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return errorResponse(res, { message: 'Ay ve yıl gereklidir' });
    }

    let companyId;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.query.company) {
      companyId = req.query.company;
    } else {
      return errorResponse(res, { message: 'Şirket ID gereklidir' });
    }

    // Şirket bilgisini al
    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Puantaj takvimini al
    const calendar = await getAttendanceCalendar(companyId, parseInt(month), parseInt(year));

    // EmployeePuantaj kayıtlarını al (fazla mesai ve avans kesintileri için)
    const puantajRecords = await EmployeePuantaj.find({
      company: companyId,
      year: parseInt(year),
      month: parseInt(month)
    }).populate('employee', 'firstName lastName employeeNumber');

    // Puantaj verilerini employee ID'ye göre map'le
    const puantajMap = {};
    puantajRecords.forEach(p => {
      puantajMap[p.employee._id.toString()] = p;
    });

    // Dinamik kolonları belirle (en az bir çalışanda değer varsa göster)
    const hasOvertime = puantajRecords.some(p => (p.summary?.dayOvertimeHours || 0) > 0);
    const hasNightOvertime = puantajRecords.some(p => (p.summary?.nightOvertimeHours || 0) > 0);
    const hasAdvanceDeduction = puantajRecords.some(p => (p.totalAdvanceDeduction || 0) > 0);

    // Şablondaki tüm kodları al (legend için)
    let templateItems = [];
    if (company.activeAttendanceTemplate) {
      templateItems = await AttendanceTemplateItem.find({ template: company.activeAttendanceTemplate }).sort({ order: 1 });
    }
    if (templateItems.length === 0) {
      const defaultTemplate = await AttendanceTemplate.findOne({ isDefault: true });
      if (defaultTemplate) {
        templateItems = await AttendanceTemplateItem.find({ template: defaultTemplate._id }).sort({ order: 1 });
      }
    }

    // Ayın gün sayısı
    const daysInMonth = new Date(year, month, 0).getDate();

    // Ay isimleri
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    // Excel verilerini hazırla
    const rows = [];

    // Başlık satırı
    const headerRow = ['Sıra', 'Sicil No', 'Ad Soyad'];
    for (let day = 1; day <= daysInMonth; day++) {
      headerRow.push(day.toString());
    }
    headerRow.push('Toplam Gün', 'İzin Gün', 'Tatil Gün');
    // Dinamik kolonlar
    if (hasOvertime) headerRow.push('Fazla Mesai (s)');
    if (hasNightOvertime) headerRow.push('Gece Mesai (s)');
    if (hasAdvanceDeduction) headerRow.push('Avans Kesintisi (TL)');
    rows.push(headerRow);

    // Çalışan verilerini ekle
    let rowIndex = 1;
    const employeeIds = Object.keys(calendar);

    for (const empId of employeeIds) {
      const empData = calendar[empId];
      const emp = empData.employee;
      const puantaj = puantajMap[empId];

      const row = [
        rowIndex,
        emp.employeeNumber || '-',
        `${emp.firstName} ${emp.lastName}`
      ];

      let workingDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayData = empData.dates[dateStr];

        if (dayData) {
          row.push(dayData.code);

          // İstatistikleri hesapla
          const code = dayData.code.toUpperCase();
          if (code === 'N' || code === 'G' || code === 'E' || code === 'FM') {
            workingDays++;
          } else if (code === 'S' || code === 'R' || code === 'U' || code === 'D' || code === 'M' || code === 'Y') {
            leaveDays++;
          } else if (code === 'H' || code === 'T') {
            holidayDays++;
          }
        } else {
          row.push('-');
        }
      }

      row.push(workingDays, leaveDays, holidayDays);

      // Dinamik kolonlar
      if (hasOvertime) {
        row.push(puantaj?.summary?.dayOvertimeHours || 0);
      }
      if (hasNightOvertime) {
        row.push(puantaj?.summary?.nightOvertimeHours || 0);
      }
      if (hasAdvanceDeduction) {
        row.push(puantaj?.totalAdvanceDeduction || 0);
      }

      rows.push(row);
      rowIndex++;
    }

    // Boş satır
    rows.push([]);
    rows.push([]);

    // Açıklama (Legend) bölümü
    rows.push(['KOD AÇIKLAMALARI']);
    rows.push(['Kod', 'Açıklama']);
    for (const item of templateItems) {
      rows.push([item.code, item.description]);
    }

    // Dinamik kolon açıklamaları
    if (hasOvertime || hasNightOvertime || hasAdvanceDeduction) {
      rows.push([]);
      rows.push(['EK BİLGİLER']);
      if (hasOvertime) rows.push(['Fazla Mesai (s)', 'Gündüz fazla mesai toplam saati']);
      if (hasNightOvertime) rows.push(['Gece Mesai (s)', 'Gece fazla mesai toplam saati']);
      if (hasAdvanceDeduction) rows.push(['Avans Kesintisi (TL)', 'Bu ay kesilecek avans taksit toplamı']);
    }

    // Footer - Powered By
    rows.push([]);
    rows.push([]);
    rows.push(['Powered By Personel Plus']);

    // Excel workbook oluştur
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Sütun genişliklerini ayarla
    const colWidths = [
      { wch: 5 },   // Sıra
      { wch: 12 },  // Sicil No
      { wch: 25 },  // Ad Soyad
    ];
    for (let i = 0; i < daysInMonth; i++) {
      colWidths.push({ wch: 4 }); // Günler
    }
    colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 }); // Toplamlar
    // Dinamik kolon genişlikleri
    if (hasOvertime) colWidths.push({ wch: 14 });
    if (hasNightOvertime) colWidths.push({ wch: 14 });
    if (hasAdvanceDeduction) colWidths.push({ wch: 18 });
    ws['!cols'] = colWidths;

    // Sheet adı
    const sheetName = `${monthNames[month - 1]} ${year}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Excel dosyasını buffer olarak oluştur
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Dosya adı
    const fileName = `Puantaj_${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthNames[month - 1]}_${year}.xlsx`;

    // Response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Excel export hatası:', error);
    return serverError(res, error, 'Excel oluşturulurken hata');
  }
});

// Get single attendance
router.get('/:id', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee')
      .populate('company');

    if (!attendance) {
      return notFound(res, 'Puantaj kaydı bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== attendance.company._id.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    res.json(attendance);
  } catch (error) {
    return serverError(res, error);
  }
});

// Create or update attendance
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employee, date, code, description, startTime, endTime, workingHours, overtime, notes } = req.body;

    const emp = await Employee.findById(employee);
    if (!emp) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    let companyId = emp.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      if (req.user.company.toString() !== companyId.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existing = await Attendance.findOne({
      employee,
      date: attendanceDate
    });

    if (existing) {
      // Update existing
      existing.code = code.toUpperCase();
      existing.description = description;
      existing.startTime = startTime;
      existing.endTime = endTime;
      existing.workingHours = workingHours || 0;
      existing.overtime = overtime || 0;
      existing.notes = notes;
      existing.createdBy = req.user._id;
      await existing.save();

      const populated = await Attendance.findById(existing._id)
        .populate('employee')
        .populate('company');

      res.json(populated);
    } else {
      // Create new
      const attendance = new Attendance({
        employee,
        company: companyId,
        date: attendanceDate,
        code: code.toUpperCase(),
        description,
        startTime,
        endTime,
        workingHours: workingHours || 0,
        overtime: overtime || 0,
        notes,
        createdBy: req.user._id
      });

      await attendance.save();

      const populated = await Attendance.findById(attendance._id)
        .populate('employee')
        .populate('company');

      res.status(201).json(populated);
    }
  } catch (error) {
    return serverError(res, error);
  }
});

// Bulk create/update attendances
router.post('/bulk', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { attendances } = req.body;

    if (!Array.isArray(attendances)) {
      return errorResponse(res, { message: 'Geçersiz veri formatı' });
    }

    const results = [];
    const errors = [];

    for (const attData of attendances) {
      try {
        const { employee, date, code, description, startTime, endTime, workingHours, overtime, notes } = attData;

        const emp = await Employee.findById(employee);
        if (!emp) {
          errors.push({ employee, date, error: 'Çalışan bulunamadı' });
          continue;
        }

        let companyId = emp.company;
        if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
          if (req.user.company.toString() !== companyId.toString()) {
            errors.push({ employee, date, error: 'Yetkiniz yok' });
            continue;
          }
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({
          employee,
          date: attendanceDate
        });

        if (existing) {
          existing.code = code.toUpperCase();
          existing.description = description;
          existing.startTime = startTime;
          existing.endTime = endTime;
          existing.workingHours = workingHours || 0;
          existing.overtime = overtime || 0;
          existing.notes = notes;
          existing.createdBy = req.user._id;
          await existing.save();
          results.push(existing);
        } else {
          const attendance = new Attendance({
            employee,
            company: companyId,
            date: attendanceDate,
            code: code.toUpperCase(),
            description,
            startTime,
            endTime,
            workingHours: workingHours || 0,
            overtime: overtime || 0,
            notes,
            createdBy: req.user._id
          });

          await attendance.save();
          results.push(attendance);
        }
      } catch (error) {
        errors.push({ employee: attData.employee, date: attData.date, error: error.message });
      }
    }

    res.json({
      message: `${results.length} puantaj kaydı işlendi`,
      success: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update attendance
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return notFound(res, 'Puantaj kaydı bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== attendance.company.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    Object.assign(attendance, req.body);
    if (req.body.code) attendance.code = req.body.code.toUpperCase();
    attendance.createdBy = req.user._id;
    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate('employee')
      .populate('company');

    res.json(populated);
  } catch (error) {
    return serverError(res, error);
  }
});

// Delete attendance
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return notFound(res, 'Puantaj kaydı bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== attendance.company.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Puantaj kaydı silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Generate monthly attendance (WorkingHours'a göre varsayılan kodları doldurur)
router.post('/generate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return errorResponse(res, { message: 'Ay ve yıl gereklidir' });
    }

    let companyId = req.body.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    }

    if (!companyId) {
      return errorResponse(res, { message: 'Şirket ID gereklidir' });
    }

    const result = await generateMonthlyAttendance(companyId, month, year, req.user._id);
    res.json(result);
  } catch (error) {
    return serverError(res, error);
  }
});

// Get full attendance calendar (izinler + çalışma programı birleşik)
router.get('/full-calendar', auth, async (req, res) => {
  try {
    const { employee, month, year } = req.query;

    if (!month || !year) {
      return errorResponse(res, { message: 'Ay ve yıl gereklidir' });
    }

    let companyId;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      const { company } = req.query;
      if (company) {
        companyId = company;
      } else {
        return errorResponse(res, { message: 'Şirket ID gereklidir' });
      }
    } else if (req.user.role.name === 'employee') {
      // Çalışan sadece kendi puantajını görebilir
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        companyId = emp.company;
        req.query.employee = emp._id;
      } else {
        return notFound(res, 'Çalışan bulunamadı');
      }
    } else {
      companyId = req.query.company;
    }

    if (!companyId) {
      return errorResponse(res, { message: 'Şirket ID gereklidir' });
    }

    const calendar = await getAttendanceCalendar(
      companyId,
      parseInt(month),
      parseInt(year),
      employee || null
    );

    res.json(calendar);
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

