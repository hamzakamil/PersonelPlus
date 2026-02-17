const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const { auth, requireRole } = require('../middleware/auth');
const { generateMonthlyAttendance, getAttendanceCalendar, getTemplateCodesForCompany } = require('../services/attendanceService');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');
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
    const { month, year, format } = req.query;

    if (!month || !year) {
      return errorResponse(res, { message: 'Ay ve yıl gereklidir' });
    }

    const exportFormat = (format || 'xls').toLowerCase(); // xls veya csv

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

    // Aktif çalışanları al
    const employees = await Employee.find({
      company: companyId,
      status: 'active',
    }).select('firstName lastName tcKimlik hireDate exitDate lastTerminationDate').lean();

    // Türkçe alfabetik sıralama
    employees.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLocaleLowerCase('tr');
      const nameB = `${b.firstName} ${b.lastName}`.toLocaleLowerCase('tr');
      return nameA.localeCompare(nameB, 'tr');
    });

    // Bu ay/yıl için EmployeePuantaj kayıtlarını al (UI ile aynı veri kaynağı)
    const puantajRecords = await EmployeePuantaj.find({
      company: companyId,
      year: parseInt(year),
      month: parseInt(month),
    }).lean();

    // Puantaj haritası: employee ID → puantaj
    const puantajMap = {};
    puantajRecords.forEach(p => {
      puantajMap[p.employee.toString()] = p;
    });

    // Ayın gün sayısı
    const daysInMonth = new Date(year, month, 0).getDate();

    // Ay isimleri
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    // Türkçe gün kısaltmaları (getDay(): 0=Pazar, 1=Pazartesi, ...)
    const dayNames = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

    const monthName = monthNames[month - 1].toUpperCase();

    let rows = [];

    // CSV için basit format
    if (exportFormat === 'csv') {
      // CSV için mevcut basit format

      //  Satır 1 — Haftanın günleri (G sütunundan başlar, her zaman 31 sütun)
      const dayNamesRow = ['', '', '', '', '', '']; // A-F boş
      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          const dayOfWeek = new Date(parseInt(year), parseInt(month) - 1, day).getDay();
          dayNamesRow.push(dayNames[dayOfWeek]);
        } else {
          dayNamesRow.push('');
        }
      }
      rows.push(dayNamesRow);

      // Satır 2 — Kolon başlıkları (her zaman 31 sütun, olmayan günler boş)
      const headerRow = ['AY', 'YIL', 'TC KİMLİK NO', 'SGK NO', 'AD', 'SOYAD'];
      for (let day = 1; day <= 31; day++) {
        headerRow.push(day <= daysInMonth ? day.toString() : '');
      }
      headerRow.push('', '', '', 'Eksik Gün Neden');
      rows.push(headerRow);

      // Çalışan verilerini ekle
      for (const emp of employees) {
        const puantaj = puantajMap[emp._id.toString()];
        const sortedDays = puantaj ? [...puantaj.days].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

        const row = [
          parseInt(month),                     // A: Ay (rakam)
          parseInt(year),                     // B: Yıl
          emp.tcKimlik || '',                // C: TC Kimlik
          '               ',                 // D: SGK No (15 boşluk)
          emp.firstName,                     // E: Ad
          emp.lastName                       // F: Soyad
        ];

        for (let day = 1; day <= 31; day++) {
          if (day <= daysInMonth) {
            row.push(sortedDays[day - 1]?.code || '');
          } else {
            row.push(''); // Ayda olmayan günler
          }
        }

        row.push('', '', ''); // 3 boş sütun

        rows.push(row);
      }
    } else {
      // XLS için detaylı format (örnek dosya formatı)

      // Şablon kodlarını al
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

      // SATIR 1: İşyeri ve ay/yıl başlığı
      const row1 = [`İşyeri:${company.name} Bölüm:MERKEZ                                             ${monthName}/${year} ayı Puantaj Listesi`];
      for (let i = 1; i < 105; i++) row1.push('');
      rows.push(row1);

      // SATIR 2: Şirket adı
      const row2 = [company.name];
      for (let i = 1; i < 105; i++) row2.push('');
      rows.push(row2);

      // SATIR 3: Vergi bilgileri + kod açıklamaları (sağ)
      const row3 = [
        `Vergi Dairesi: ${company.taxOffice || ''}`, '', '', '',
        `Vergi No: ${company.taxNumber || ''}`, '', '', '', '', '', '', '', '', '', '', '',
        'N', 'Normal', '', '',
        'T', 'Resmi Tatil', '', '',
        'H', 'Hafta Tatili', '', '',
        'İ', 'İzinli', '', '',
        'G', 'Gece Mesaisi'
      ];
      for (let i = row3.length; i < 105; i++) row3.push('');
      rows.push(row3);

      // SATIR 4: SGK + Mersis + kod açıklamaları devamı
      const row4 = [
        `SGK Sicil No: ${company.sgkSicil || ''}`, '', '', '',
        `Mersis No: ${company.mersisNo || ''}`, '', '', '', '', '', '', '', '', '', '', '',
        'R', 'Raporlu', '', '',
        'E', 'Eksik Gün', '', '',
        'Y', 'Yarım Gün', '', '',
        'S', 'Yıllık İzin', '', '',
        'O', 'Gündüz Mesaisi'
      ];
      for (let i = row4.length; i < 105; i++) row4.push('');
      rows.push(row4);

      // SATIR 5: Adres + kod açıklamaları devamı
      const row5 = [
        `Adres: ${company.address || ''}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'K', 'Yarım Gün Resmi Tatil', '', '',
        '', '', '', '',
        'C', 'Yarım Gün Hafta Tatili'
      ];
      for (let i = row5.length; i < 105; i++) row5.push('');
      rows.push(row5);

      // SATIR 6: Merkez adres
      const row6 = ['Merkez Adres:   '];
      for (let i = 1; i < 105; i++) row6.push('');
      rows.push(row6);

      // SATIR 7: Web adresi + ek kolon başlıkları
      const row7 = [`Web Adresi: ${company.website || ''}`];
      // B7-AJ7: Boş (35 kolon)
      for (let i = 1; i <= 35; i++) row7.push('');
      // AK7: Toplam başlığı
      row7.push('Toplam');
      // AL7-AO7: Boş (4 kolon)
      for (let i = 0; i < 4; i++) row7.push('');
      // AP7-BN7: Ek kolon başlıkları
      row7.push(
        'Eksik Gün Neden', 'Fazla Mesai', 'Gece Mesaisi', 'Tatil Mesaisi', 'Yol', 'Yemek',
        'Aile', 'Çocuk', 'Evlenme', 'Doğum', 'Ölüm', 'Askerlik',
        'Özel Sigorta', 'Bireysel Emeklilik', 'Prim', 'İkramiye', 'Kıdem Tazminatı', 'İhbar Tazminatı', 'Bayram',
        'Yakacak', 'Huzur Hakkı', 'Hayat Sigortası', 'Avans', 'icra', 'Sendika'
      );
      for (let i = row7.length; i < 105; i++) row7.push('');
      // BO7: İMZA (BO sütunu = index 66)
      row7[66] = 'İMZA';
      rows.push(row7);

      // SATIR 8: Header satırı 1 (B8 boş - kolonlar sağa kayar)
      const row8 = ['SIRA', '', 'T.C.', 'GİRİŞ', 'ÇIKIŞ'];
      for (let day = 1; day <= 31; day++) {
        row8.push(day.toString());
      }
      row8.push('Çal', 'Ssk', 'İzin', 'Gün', 'Eks');
      for (let i = row8.length; i < 105; i++) row8.push('');
      rows.push(row8);

      // SATIR 9: Header satırı 2 (B9'da ADI SOYADI)
      const row9 = ['NO', ' ADI SOYADI', 'KİMLİK NO', 'TARİHİ', 'TARİHİ'];
      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          const dayOfWeek = new Date(parseInt(year), parseInt(month) - 1, day).getDay();
          row9.push(dayNames[dayOfWeek]);
        } else {
          row9.push('');
        }
      }
      // Alt başlıklar: Çal Gün, Ssk Gün, İzin Gün, Gün Top, Eks Gün + Ek kolonlar
      row9.push(
        'Gün', 'Gün', 'Gün', 'Top', 'Gün',  // AK9-AO9: Çal, Ssk, İzin, Gün Top, Eks
        '',  // AP9: Boş (Eksik Gün Neden 3 satır birleşik)
        'Saat', 'Saat', 'Gün', 'Gün', 'Gün',  // AQ9-AU9: Fazla Mesai, Gece Mesaisi, Tatil Mesaisi, Yol, Yemek
        'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net', 'Net',  // AV9-BH9
        'Net', 'Net', 'Net', 'Net', 'Net', 'Net'  // BI9-BN9: Yakacak, Huzur Hakkı, Hayat Sigortası, Avans, icra, Sendika
      );
      for (let i = row9.length; i < 105; i++) row9.push('');
      rows.push(row9);

      // Çalışan verilerini ekle
      let rowNum = 1;
      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      };

      for (const emp of employees) {
        const puantaj = puantajMap[emp._id.toString()];
        const sortedDays = puantaj ? [...puantaj.days].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
        const summary = puantaj ? (puantaj.summary || {}) : {};

        const row = [
          rowNum++,                                    // A: SIRA NO
          `${emp.firstName} ${emp.lastName}`,         // B: ADI SOYADI
          emp.tcKimlik || '',                         // C: TC KİMLİK NO
          formatDate(emp.hireDate),                   // D: GİRİŞ TARİHİ
          formatDate(emp.exitDate || emp.lastTerminationDate || '')  // E: ÇIKIŞ TARİHİ
        ];

        // Günlük kodlar (puantaj days dizisinden, tüm 13 kod desteklenir: -, N, T, H, İ, G, R, E, Y, S, O, K, C)
        for (let day = 1; day <= 31; day++) {
          if (day <= daysInMonth) {
            row.push(sortedDays[day - 1]?.code || '');
          } else {
            row.push('');
          }
        }

        // İstatistikler - EmployeePuantaj summary'den al (recalculateSummary ile hesaplanmış)
        // calGun: Çalışma günü (N, O, G tam + Y, K, C yarım gün dahil)
        const calGun = summary.normalDays || 0;
        // izinGun: İzin günleri (S: Yıllık İzin + İ: İzinli + R: Raporlu)
        const izinGun = (summary.annualLeaveDays || 0) + (summary.otherLeaveDays || 0) + (summary.sickLeaveDays || 0);
        // eksGun: Eksik günler (R: Raporlu + E: Eksik Gün + -: Çalışmadı)
        const eksGun = (summary.sickLeaveDays || 0) + (summary.absentDays || 0) + (summary.notWorkedDays || 0);
        // sskGun: SGK günü (manuel ayarlanmışsa onu kullan, yoksa çalışma günü)
        const sskGun = puantaj && puantaj.sgkGun !== null && puantaj.sgkGun !== undefined ? puantaj.sgkGun : calGun;

        row.push(calGun, sskGun, izinGun, calGun + izinGun, eksGun); // Çal, Ssk, İzin, Top, Eks

        // Ek kolonlar: Eksik Gün Neden, Fazla Mesai, Gece Mesaisi
        // SGK Eksik Gün Neden: 1=İstirahat(Rapor), 14=Devamsızlık, vb.
        let eksikGunNeden = '';
        if ((summary.sickLeaveDays || 0) > 0) {
          eksikGunNeden = 1; // İstirahat (Raporlu)
        }
        row.push(eksikGunNeden); // AP: Eksik Gün Neden
        const dayOT = (summary.dayOvertimeHours || 0) + (puantaj?.manualOvertime?.dayOvertimeHours || 0);
        const nightOT = (summary.nightOvertimeHours || 0) + (puantaj?.manualOvertime?.nightOvertimeHours || 0);
        row.push(dayOT || ''); // AQ: Fazla Mesai Saat
        row.push(nightOT || ''); // AR: Gece Mesaisi Saat

        // Kalan ek kolonlar (boş - manuel doldurulacak)
        for (let i = row.length; i < 105; i++) row.push('');

        rows.push(row);
      }
    }

    // Workbook oluştur
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // XLS için hücre birleştirme (merge cells)
    if (exportFormat !== 'csv') {
      const merges = [];

      // A1:BG1 - İşyeri başlığı (tüm satır)
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 58 } });

      // A2:BG2 - Şirket adı (tüm satır)
      merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 58 } });

      // Satır 7-8-9 birleştirmeleri (row index 6-7-8)
      // AK7:AO7 - "Toplam" başlığı (5 kolon birleşik)
      merges.push({ s: { r: 6, c: 36 }, e: { r: 6, c: 40 } });

      // AP7:AP9 - Eksik Gün Neden (3 satır birleşik)
      merges.push({ s: { r: 6, c: 41 }, e: { r: 8, c: 41 } });

      // AQ7:AQ8, AR7:AR8, ... (2 satır birleşik, 9'da alt başlık)
      const twoRowMergeCols = [
        'Fazla Mesai', 'Gece Mesaisi', 'Tatil Mesaisi', 'Yol', 'Yemek',
        'Aile', 'Çocuk', 'Evlenme', 'Doğum', 'Ölüm', 'Askerlik',
        'Özel Sigorta', 'Bireysel Emeklilik', 'Prim', 'İkramiye', 'Kıdem Tazminatı', 'İhbar Tazminatı', 'Bayram',
        'Yakacak', 'Huzur Hakkı', 'Hayat Sigortası', 'Avans', 'icra', 'Sendika'
      ];

      for (let i = 0; i < twoRowMergeCols.length; i++) {
        merges.push({ s: { r: 6, c: 42 + i }, e: { r: 7, c: 42 + i } });
      }

      // BO7:BO9 - İMZA (3 satır birleşik, BO sütunu = column 66)
      merges.push({ s: { r: 6, c: 66 }, e: { r: 8, c: 66 } });

      ws['!merges'] = merges;
    }

    // Sütun genişliklerini ayarla
    let colWidths = [];
    if (exportFormat === 'csv') {
      // CSV için basit genişlikler
      colWidths = [
        { wch: 8 },   // Ay
        { wch: 6 },   // Yıl
        { wch: 14 },  // TC Kimlik
        { wch: 12 },  // SGK No
        { wch: 15 },  // Ad
        { wch: 15 },  // Soyad
      ];
      for (let i = 0; i < 31; i++) {
        colWidths.push({ wch: 4 }); // Günler
      }
      colWidths.push({ wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 18 }); // 3 boş + Eksik Gün
    } else {
      // XLS için detaylı genişlikler
      colWidths = [
        { wch: 6 },   // SIRA NO
        { wch: 25 },  // ADI SOYADI
        { wch: 14 },  // TC KİMLİK NO
        { wch: 12 },  // GİRİŞ TARİHİ
        { wch: 12 },  // ÇIKIŞ TARİHİ
      ];
      for (let i = 0; i < 31; i++) {
        colWidths.push({ wch: 4 }); // Günler
      }
      // İstatistikler ve ek kolonlar
      for (let i = 0; i < 15; i++) {
        colWidths.push({ wch: 8 });
      }
    }
    ws['!cols'] = colWidths;

    // Sheet adı
    const sheetName = `Sheet1`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const baseFileName = `Puantaj_${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthNames[month - 1]}_${year}`;

    if (exportFormat === 'csv') {
      // CSV olarak export — Windows-1254 (Türkçe) kodlama
      const csvString = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
      const csvBuffer = iconv.encode(csvString, 'windows-1254');
      const fileName = `${baseFileName}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=windows-1254');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', csvBuffer.length);
      res.send(csvBuffer);
    } else {
      // XLS formatında export
      const xlsBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xls' });
      const fileName = `${baseFileName}.xls`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', xlsBuffer.length);
      res.send(xlsBuffer);
    }
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

