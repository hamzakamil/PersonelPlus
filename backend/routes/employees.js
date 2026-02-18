const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const WorkplaceSection = require('../models/WorkplaceSection');
const User = require('../models/User');
const Role = require('../models/Role');
const { auth, requireRole } = require('../middleware/auth');
const { normalizePhone } = require('../utils/phoneUtils');
const { successResponse, errorResponse, notFound, forbidden, serverError, createdResponse } = require('../utils/responseHelper');
const ProfileChangeRequest = require('../models/ProfileChangeRequest');
const EmployeePuantaj = require('../models/EmployeePuantaj');
const notificationService = require('../services/notificationService');
const smsService = require('../services/smsService');

const upload = multer({ dest: 'uploads/' });

// Email transporter helper
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Get all employees
// Query params: status (active|separated|all), year, month
router.get('/', auth, async (req, res) => {
  try {
    const { status, year, month } = req.query;
    let query = {};

    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      // req.user.company populated obje olabilir, _id'yi al
      query.company = req.user.company?._id || req.user.company;
    }

    // Durum filtresi
    if (status === 'active') {
      query.status = 'active';
    } else if (status === 'separated') {
      query.status = 'separated';
    } else if (status === 'all' || !status) {
      // Tümünü göster (active ve separated)
      query.status = { $in: ['active', 'separated'] };
    } else {
      // Varsayılan: sadece aktif
      query.status = 'active';
    }

    // Yıl ve ay bazlı filtreleme
    if (year) {
      const yearNum = parseInt(year);
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);

      if (month) {
        // Belirli ay için: O ayda aktif olan veya o ayda/sonra ayrılan
        const monthNum = parseInt(month);
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        // Aktifler: işe giriş o aydan önce veya o ay içinde
        // Ayrılanlar: çıkış o ay veya sonra
        const statusConditions = [];

        if (!status || status === 'all' || status === 'active') {
          statusConditions.push({
            status: 'active',
            $or: [
              { hireDate: { $lte: monthEnd } },
              { hireDate: null }
            ]
          });
        }

        if (!status || status === 'all' || status === 'separated') {
          statusConditions.push({
            status: 'separated',
            separationDate: { $gte: monthStart }
          });
        }

        if (statusConditions.length > 0) {
          delete query.status;
          query.$or = statusConditions;
        }
      } else {
        // Sadece yıl için: O yılda aktif olan veya o yılda/sonra ayrılan
        const statusConditions = [];

        if (!status || status === 'all' || status === 'active') {
          statusConditions.push({
            status: 'active',
            $or: [
              { hireDate: { $lte: yearEnd } },
              { hireDate: null }
            ]
          });
        }

        if (!status || status === 'all' || status === 'separated') {
          statusConditions.push({
            status: 'separated',
            separationDate: { $gte: yearStart }
          });
        }

        if (statusConditions.length > 0) {
          delete query.status;
          query.$or = statusConditions;
        }
      }
    }

    const employees = await Employee.find(query)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name')
      .sort({ status: 1, createdAt: -1 }); // Önce aktifler, sonra ayrılanlar

    // SGK gün müdahalesi yapılmış çalışanları işaretle
    const now = new Date();
    const puantajYear = year ? parseInt(year) : now.getFullYear();
    const puantajMonth = month ? parseInt(month) : now.getMonth() + 1;

    const employeeIds = employees.map(e => e._id);
    const sgkOverrides = await EmployeePuantaj.find({
      employee: { $in: employeeIds },
      year: puantajYear,
      month: puantajMonth,
      sgkGunManuallyEdited: true
    }).select('employee').lean();

    const sgkOverrideSet = new Set(sgkOverrides.map(p => p.employee.toString()));

    const enrichedEmployees = employees.map(emp => {
      const empObj = emp.toObject();
      empObj.hasSgkGunOverride = sgkOverrideSet.has(emp._id.toString());
      return empObj;
    });

    return successResponse(res, { data: enrichedEmployees });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get employees by company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Check access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer.toString()) {
      return forbidden(res);
    }
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== req.params.companyId) {
        return forbidden(res);
      }
    }

    const employees = await Employee.find({ company: req.params.companyId })
      .populate('department')
      .sort({ employeeNumber: 1 }); // Çalışan Sıra No'ya göre artan sıralama

    return successResponse(res, { data: employees });
  } catch (error) {
    return serverError(res, error);
  }
});

// Download Excel template - MUST be before /:id route
router.get('/template', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    // Zorunlu alanlar
    const requiredFields = [
      'Adı Soyadı',
      'TC Kimlik No',
      'İşe Giriş Tarihi',
      'Görevi'
    ];

    // Tüm personel alanları (zorunlu alanlar + opsiyonel)
    const allFields = [
      ...requiredFields,
      'Doğum Tarihi',
      'Email Adresi',
      'Telefon Numarası',
      'Personel Numarası',
      'Departman',
      'SGK İşyeri',
      'İşyeri Bölümü',
      'Doğum Yeri',
      'Pasaport No',
      'Kan Grubu',
      'Askerlik Durumu',
      'Sabıka Kaydı Var mı?',
      'Ehliyet Var mı?',
      'Emekli Mi?'
    ];

    // Excel şablonu oluştur
    const workbook = xlsx.utils.book_new();

    const worksheetData = [
      allFields, // Başlık satırı
      // Örnek satır (örnek verilerle)
      [
        'Ahmet Yılmaz', // Adı Soyadı
        '12345678901', // TC Kimlik No
        '15.01.2024', // İşe Giriş Tarihi (GG.AA.YYYY formatı)
        '20.05.1990', // Doğum Tarihi (GG.AA.YYYY formatı)
        'Yazılım Geliştirici', // Görevi
        'ahmet.yilmaz@example.com', // Email Adresi
        '05551234567', // Telefon Numarası
        'P001', // Personel Numarası
        'Bilgi İşlem', // Departman
        '', // SGK İşyeri (boş bırakılırsa varsayılan kullanılır)
        '', // İşyeri Bölümü
        'İstanbul', // Doğum Yeri
        '', // Pasaport No
        'A+', // Kan Grubu
        'Yapıldı', // Askerlik Durumu
        'Hayır', // Sabıka Kaydı Var mı?
        'Evet', // Ehliyet Var mı?
        'Hayır' // Emekli Mi?
      ],
      [], // Boş satır
      [], // Boş satır
      ['Powered By Personel Plus'] // Footer
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

    // Sütun genişliklerini ayarla
    worksheet['!cols'] = allFields.map(() => ({ wch: 20 }));

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Personel');

    // Excel dosyasını buffer olarak oluştur
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=personel_sablon.xlsx');

    res.send(buffer);
  } catch (error) {
    console.error('Şablon oluşturma hatası:', error);
    return serverError(res, error, 'Şablon oluşturulamadı');
  }
});

// İsim ayırma helper fonksiyonu
const splitFullName = (fullName) => {
  if (!fullName || !fullName.trim()) return { error: 'Adı Soyadı boş' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { error: 'Soyadı eksik - en az ad ve soyad girilmelidir' };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1], ambiguous: false };
  }
  // 3+ kelime: iki alternatif sun
  return {
    fullName: fullName.trim(),
    ambiguous: true,
    optionA: {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1]
    },
    optionB: {
      firstName: parts.slice(0, -2).join(' '),
      lastName: parts.slice(-2).join(' ')
    }
  };
};

// Excel import helper: bir satırdan alan değeri oku
const getFieldValue = (row, possibleKeys) => {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]);
    }
  }
  return null;
};

// Excel tarih parse helper
const parseExcelDate = (value) => {
  if (!value) return null;
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
    const EXCEL_EPOCH_DIFF = 25569;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return new Date((numValue - EXCEL_EPOCH_DIFF) * MS_PER_DAY);
  }
  const strValue = String(value).trim();
  const dotMatch = strValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  const slashMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  const isoMatch = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  const parsed = new Date(strValue);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

// Ortak alan haritası
const buildRequiredFieldsMap = () => ({
  'Adı Soyadı': ['Adı Soyadı', 'adı soyadı', 'Ad Soyad', 'ad soyad', 'fullName', 'full_name', 'Ad Soyadı', 'ad soyadı'],
  'TC Kimlik No': ['TC Kimlik No', 'tcKimlik', 'tc_kimlik', 'tc', 'tckimlik', 'tc kimlik no'],
  'İşe Giriş Tarihi': ['İşe Giriş Tarihi', 'işe giriş tarihi', 'işeGirişTarihi', 'hireDate', 'hire_date', 'ise_giris_tarihi', 'işeGiriş', 'iseGiris'],
  'Doğum Tarihi': ['Doğum Tarihi', 'doğum tarihi', 'doğumTarihi', 'birthDate', 'birth_date', 'dogum_tarihi', 'doğumTarih', 'dogumTarih'],
  'Görevi': ['Görevi', 'görevi', 'görev', 'position', 'gorev', 'gorevi'],
  'Email Adresi': ['Email Adresi', 'email', 'email adresi', 'e-mail', 'e_mail'],
  'Telefon Numarası': ['Telefon Numarası', 'telefon', 'telefon numarası', 'phone', 'telefon_numarası', 'tel']
});

// Geriye uyumluluk: Ayrı Adı/Soyadı sütunlarını da destekle
const getNameFromRow = (row, requiredFieldsMap) => {
  // Önce birleşik "Adı Soyadı" alanını dene
  const fullName = getFieldValue(row, requiredFieldsMap['Adı Soyadı']);
  if (fullName) return { fullName, source: 'combined' };

  // Geriye uyumluluk: ayrı Adı ve Soyadı sütunları
  const firstName = getFieldValue(row, ['Adı', 'ad', 'adı', 'firstName', 'first_name', 'firstname']);
  const lastName = getFieldValue(row, ['Soyadı', 'soyad', 'soyadı', 'lastName', 'last_name', 'lastname']);
  if (firstName && lastName) return { fullName: `${firstName} ${lastName}`, source: 'separate' };
  if (firstName) return { fullName: firstName, source: 'separate' };

  return { fullName: null, source: 'none' };
};

// Ortak import mantığı
const processImportRows = async (data, companyId, nameResolutions = {}) => {
  const requiredFieldsMap = buildRequiredFieldsMap();
  const employeesList = [];
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowErrors = [];

    // İsim al
    const nameResult = getNameFromRow(row, requiredFieldsMap);
    const fullNameRaw = nameResult.fullName;

    // Diğer zorunlu alanlar
    const tcKimlik = getFieldValue(row, requiredFieldsMap['TC Kimlik No']);
    const hireDate = getFieldValue(row, requiredFieldsMap['İşe Giriş Tarihi']);
    const birthDate = getFieldValue(row, requiredFieldsMap['Doğum Tarihi']);
    const position = getFieldValue(row, requiredFieldsMap['Görevi']);
    const email = getFieldValue(row, requiredFieldsMap['Email Adresi']);
    const phone = getFieldValue(row, requiredFieldsMap['Telefon Numarası']);

    if (!fullNameRaw || fullNameRaw.trim() === '') rowErrors.push('Adı Soyadı');
    if (!tcKimlik || tcKimlik.trim() === '') rowErrors.push('TC Kimlik No');
    if (!hireDate || hireDate.trim() === '') rowErrors.push('İşe Giriş Tarihi');
    if (!position || position.trim() === '') rowErrors.push('Görevi');
    // Email ve telefon artık opsiyonel

    if (rowErrors.length > 0) {
      errors.push(`Satır ${i + 2}: Eksik zorunlu alanlar - ${rowErrors.join(', ')}. Lütfen bu alanları doldurun.`);
      continue;
    }

    // Email yoksa TC Kimlik ile placeholder email oluştur
    const finalEmail = (email && email.trim()) ? email.trim() : `${tcKimlik.trim()}@personelplus.com`;
    const isPlaceholderEmail = !email || !email.trim();
    const finalPhone = (phone && phone.trim()) ? phone.trim() : undefined;

    // İsim ayırma
    let firstName, lastName;
    const nameSplit = splitFullName(fullNameRaw);
    if (nameSplit.error) {
      errors.push(`Satır ${i + 2}: ${nameSplit.error}`);
      continue;
    }
    if (nameSplit.ambiguous) {
      const resolution = nameResolutions[String(i + 2)]; // satır numarası ile eşleş
      if (resolution === 'B') {
        firstName = nameSplit.optionB.firstName;
        lastName = nameSplit.optionB.lastName;
      } else {
        // Varsayılan: Seçenek A (son kelime = soyadı)
        firstName = nameSplit.optionA.firstName;
        lastName = nameSplit.optionA.lastName;
      }
    } else {
      firstName = nameSplit.firstName;
      lastName = nameSplit.lastName;
    }

    try {
      // Workplace kontrolü
      const workplaceName = row['SGK İşyeri'] || row['İşyeri'] || row.workplace || row['SGK İşyeri Dosyası'];
      let workplaceDoc = null;
      if (workplaceName) {
        workplaceDoc = await Workplace.findOne({ name: workplaceName, company: companyId });
        if (!workplaceDoc) {
          errors.push(`Satır ${i + 2}: SGK İşyeri bulunamadı - ${workplaceName}`);
          continue;
        }
      } else {
        workplaceDoc = await Workplace.findOne({ company: companyId });
        if (!workplaceDoc) {
          errors.push(`Satır ${i + 2}: Şirket için varsayılan işyeri bulunamadı`);
          continue;
        }
      }

      // WorkplaceSection kontrolü
      let workplaceSectionDoc = null;
      const sectionName = row['İşyeri Bölümü'] || row['Bölüm'] || row.workplaceSection;
      if (sectionName) {
        workplaceSectionDoc = await WorkplaceSection.findOne({ name: sectionName, workplace: workplaceDoc._id });
        if (!workplaceSectionDoc) {
          errors.push(`Satır ${i + 2}: İşyeri bölümü bulunamadı - ${sectionName}`);
          continue;
        }
      }

      // Departman kontrolü
      let departmentDoc = null;
      const departmentName = row['Departman'] || row.departman || row.department;
      if (departmentName) {
        departmentDoc = await Department.findOne({ name: departmentName, company: companyId });
        if (!departmentDoc) {
          errors.push(`Satır ${i + 2}: Departman bulunamadı - ${departmentName}`);
          continue;
        }
      }

      // Tarih parse
      const parsedHireDate = parseExcelDate(hireDate);
      if (!parsedHireDate || isNaN(parsedHireDate.getTime())) {
        errors.push(`Satır ${i + 2}: İşe Giriş Tarihi geçersiz format - ${hireDate}`);
        continue;
      }
      let parsedBirthDate = null;
      if (birthDate && birthDate.trim() !== '') {
        parsedBirthDate = parseExcelDate(birthDate);
        if (!parsedBirthDate || isNaN(parsedBirthDate.getTime())) {
          errors.push(`Satır ${i + 2}: Doğum Tarihi geçersiz format - ${birthDate}`);
          continue;
        }
      }

      // Email kontrolü (sadece gerçek email varsa)
      if (!isPlaceholderEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(finalEmail)) {
          errors.push(`Satır ${i + 2}: Geçersiz email formatı - ${finalEmail}`);
          continue;
        }
      }

      // TC Kimlik tekrar kontrolü
      const existingEmployee = await Employee.findOne({ tcKimlik: tcKimlik.trim(), company: companyId });
      if (existingEmployee) {
        errors.push(`Satır ${i + 2}: Bu TC Kimlik No ile kayıtlı bir çalışan zaten mevcut - ${tcKimlik}`);
        continue;
      }

      // Diğer alanlar
      const personelNumarasi = row['Personel Numarası'] || row.personelNumarasi || row.personel_numarasi;
      const birthPlace = row['Doğum Yeri'] || row.doğumYeri || row.birthPlace || row.birth_place;
      const passportNumber = row['Pasaport No'] || row.pasaportNo || row.passportNumber || row.passport_number;
      const bloodType = row['Kan Grubu'] || row.kanGrubu || row.bloodType || row.blood_type;
      const militaryStatus = row['Askerlik Durumu'] || row.askerlikDurumu || row.militaryStatus || row.military_status;
      const hasCriminalRecord = row['Sabıka Kaydı Var mı?'] === 'Evet' || row['Sabıka Kaydı Var mı?'] === 'evet' || row['Sabıka Kaydı Var mı?'] === true || row.hasCriminalRecord === true;
      const hasDrivingLicense = row['Ehliyet Var mı?'] === 'Evet' || row['Ehliyet Var mı?'] === 'evet' || row['Ehliyet Var mı?'] === true || row.hasDrivingLicense === true;
      const isRetired = row['Emekli Mi?'] === 'Evet' || row['Emekli Mi?'] === 'evet' || row['Emekli Mi?'] === true || row.isRetired === true;

      // Otomatik sıra numarası
      const allExistingEmployees = await Employee.find({ company: companyId }).select('employeeNumber').lean();
      let maxNum = 0;
      for (const emp of allExistingEmployees) {
        if (emp && emp.employeeNumber) {
          const num = parseInt(emp.employeeNumber);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const finalEmployeeNumber = String(maxNum + 1 + employeesList.length);

      const employee = new Employee({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: isPlaceholderEmail ? undefined : finalEmail.toLowerCase(),
        phone: finalPhone || undefined,
        tcKimlik: tcKimlik.trim(),
        position: position.trim(),
        company: companyId,
        workplace: workplaceDoc._id,
        workplaceSection: workplaceSectionDoc ? workplaceSectionDoc._id : null,
        department: departmentDoc ? departmentDoc._id : null,
        employeeNumber: finalEmployeeNumber,
        personelNumarasi: personelNumarasi?.trim() || undefined,
        hireDate: parsedHireDate,
        birthDate: parsedBirthDate || undefined,
        birthPlace: birthPlace?.trim() || undefined,
        passportNumber: passportNumber?.trim() || undefined,
        bloodType: bloodType?.trim() || undefined,
        militaryStatus: militaryStatus?.trim() || undefined,
        hasCriminalRecord: hasCriminalRecord || false,
        hasDrivingLicense: hasDrivingLicense || false,
        isRetired: isRetired || false
      });

      await employee.save();

      // User account oluştur
      const role = await Role.findOne({ name: 'employee' });
      if (role) {
        const userEmail = finalEmail.toLowerCase();
        let user = await User.findOne({ email: userEmail });
        if (!user) {
          const userData = {
            email: userEmail,
            role: role._id,
            company: companyId,
            employee: employee._id,
            isActive: true,
            mustChangePassword: true
          };
          if (isPlaceholderEmail) {
            // Placeholder email: TC ile giriş yapılacak, varsayılan şifre 123456
            userData.password = await bcrypt.hash('123456', 10);
          } else {
            userData.password = null;
          }
          user = new User(userData);
          await user.save();
        } else if (!user.employee) {
          user.employee = employee._id;
          await user.save();
        }
      }

      employeesList.push(employee);
    } catch (error) {
      let friendlyError = error.message;
      if (error.code === 11000 || error.message.includes('E11000')) {
        const duplicateField = error.message.match(/index: (\w+)_/)?.[1];
        const duplicateValue = error.message.match(/dup key: \{ \w+: "?([^"}\s]+)"? \}/)?.[1];
        const fieldNames = { 'employeeNumber': 'Personel Numarası', 'tcKimlik': 'TC Kimlik No', 'email': 'Email Adresi', 'personelNumarasi': 'Personel Numarası' };
        const fieldName = fieldNames[duplicateField] || duplicateField;
        friendlyError = `${fieldName} "${duplicateValue}" zaten sistemde kayıtlı. Farklı bir değer kullanın.`;
      } else if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(e => e.message);
        friendlyError = validationErrors.join(', ');
      } else if (error.message.includes('TC Kimlik')) {
        friendlyError = error.message;
      } else if (error.message.includes('Cast to ObjectId failed')) {
        friendlyError = 'Geçersiz referans değeri (Departman, İşyeri vb. kontrol edin)';
      }
      errors.push(`Satır ${i + 2}: ${friendlyError}`);
    }
  }

  return { employeesList, errors };
};

// Bulk import preview - MUST be before /:id route
router.post('/bulk-import-preview', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, { message: 'Dosya yüklenmedi' });
    }

    let companyId = req.body.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company?._id || req.user.company;
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const requiredFieldsMap = buildRequiredFieldsMap();
    const ambiguousNames = [];
    let autoResolvedCount = 0;

    // Boş/footer satırları filtrele
    const validData = data.filter(row => {
      const values = Object.values(row).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
      return values.length > 1; // En az 2 dolu alan
    });

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i];
      const nameResult = getNameFromRow(row, requiredFieldsMap);
      const fullName = nameResult.fullName;

      if (!fullName || !fullName.trim()) continue;

      const nameSplit = splitFullName(fullName);
      if (nameSplit.error) continue; // Hatalar import sırasında yakalanacak
      if (nameSplit.ambiguous) {
        ambiguousNames.push({
          row: i + 2, // Excel satır numarası (1-based + header)
          fullName: nameSplit.fullName,
          optionA: nameSplit.optionA,
          optionB: nameSplit.optionB
        });
      } else {
        autoResolvedCount++;
      }
    }

    if (ambiguousNames.length === 0) {
      // Tüm isimler otomatik çözüldü - direkt import yap
      const { employeesList, errors } = await processImportRows(validData, companyId, {});

      // Dosyayı temizle
      fs.unlinkSync(req.file.path);

      return successResponse(res, {
        data: {
          needsConfirmation: false,
          added: employeesList.length,
          errors: errors.length > 0 ? errors : undefined
        },
        message: `${employeesList.length} çalışan eklendi`
      });
    }

    // Belirsiz isimler var - dosyayı sakla, preview dön
    const previewId = crypto.randomBytes(16).toString('hex');
    const previewPath = path.join(__dirname, '..', 'uploads', `preview_${previewId}.xlsx`);
    fs.copyFileSync(req.file.path, previewPath);
    fs.unlinkSync(req.file.path);

    return successResponse(res, {
      data: {
        needsConfirmation: true,
        previewId,
        ambiguousNames,
        totalRows: validData.length,
        autoResolvedCount,
        companyId
      },
      message: `${ambiguousNames.length} isim için onay gerekiyor`
    });
  } catch (error) {
    // Dosya temizliği
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return serverError(res, error);
  }
});

// Bulk import confirm - MUST be before /:id route
router.post('/bulk-import-confirm', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { previewId, nameResolutions, company } = req.body;

    if (!previewId) {
      return errorResponse(res, { message: 'Preview ID gerekli' });
    }

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company?._id || req.user.company;
    }

    // Deneme modu kota kontrolü
    const companyForQuota = await Company.findById(companyId);
    if (companyForQuota && companyForQuota.subscription && companyForQuota.subscription.status === 'trial') {
      const activeEmployeeCount = await Employee.countDocuments({ company: companyId, status: 'active' });
      const trialLimit = companyForQuota.quota?.allocated || 1;
      if (activeEmployeeCount >= trialLimit) {
        return errorResponse(res, {
          message: `Deneme hesabınızda en fazla ${trialLimit} çalışan ekleyebilirsiniz. Daha fazla çalışan eklemek için abonelik satın alın.`,
          statusCode: 403,
          errorCode: 'TRIAL_QUOTA_EXCEEDED',
        });
      }
    }

    const previewPath = path.join(__dirname, '..', 'uploads', `preview_${previewId}.xlsx`);
    if (!fs.existsSync(previewPath)) {
      return errorResponse(res, { message: 'Preview dosyası bulunamadı veya süresi dolmuş', statusCode: 404 });
    }

    const workbook = xlsx.readFile(previewPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Boş/footer satırları filtrele
    const validData = data.filter(row => {
      const values = Object.values(row).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
      return values.length > 1;
    });

    const { employeesList, errors } = await processImportRows(validData, companyId, nameResolutions || {});

    // Preview dosyasını temizle
    fs.unlinkSync(previewPath);

    return successResponse(res, {
      data: { added: employeesList.length, errors: errors.length > 0 ? errors : undefined },
      message: `${employeesList.length} çalışan eklendi`
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Bulk import from Excel (geriye uyumluluk) - MUST be before /:id route
router.post('/bulk-import', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, { message: 'Dosya yüklenmedi' });
    }

    let companyId = req.body.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company?._id || req.user.company;
    }

    // Deneme modu kota kontrolü
    const companyForQuota = await Company.findById(companyId);
    if (companyForQuota && companyForQuota.subscription && companyForQuota.subscription.status === 'trial') {
      const activeEmployeeCount = await Employee.countDocuments({ company: companyId, status: 'active' });
      const trialLimit = companyForQuota.quota?.allocated || 1;
      if (activeEmployeeCount >= trialLimit) {
        if (req.file) fs.unlinkSync(req.file.path);
        return errorResponse(res, {
          message: `Deneme hesabınızda en fazla ${trialLimit} çalışan ekleyebilirsiniz. Daha fazla çalışan eklemek için abonelik satın alın.`,
          statusCode: 403,
          errorCode: 'TRIAL_QUOTA_EXCEEDED',
        });
      }
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Boş/footer satırları filtrele
    const validData = data.filter(row => {
      const values = Object.values(row).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
      return values.length > 1;
    });

    const { employeesList, errors } = await processImportRows(validData, companyId, {});

    // Dosya temizliği
    fs.unlinkSync(req.file.path);

    return successResponse(res, {
      data: { added: employeesList.length, errors: errors.length > 0 ? errors : undefined },
      message: `${employeesList.length} çalışan eklendi`
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get current logged-in employee's data
router.get('/me', auth, async (req, res) => {
  try {
    // Önce user.employee referansı ile ara, yoksa email ile dene
    let employee = null;
    if (req.user.employee) {
      const empId = req.user.employee._id || req.user.employee;
      employee = await Employee.findById(empId)
        .populate('company')
        .populate('workplace', 'name sgkRegisterNumber')
        .populate('workplaceSection', 'name')
        .populate('department', 'name');
    }
    if (!employee) {
      employee = await Employee.findOne({ email: req.user.email })
        .populate('company')
        .populate('workplace', 'name sgkRegisterNumber')
        .populate('workplaceSection', 'name')
        .populate('department', 'name');
    }

    if (!employee) {
      return notFound(res, 'Çalışan kaydınız bulunamadı');
    }

    return successResponse(res, { data: employee });
  } catch (error) {
    return serverError(res, error);
  }
});

// Employee self-update - Bilgi değişiklik talebi oluştur (şirket admin onayı gerekir)
router.put('/me', auth, async (req, res) => {
  try {
    let employee = null;
    if (req.user.employee) {
      const empId = req.user.employee._id || req.user.employee;
      employee = await Employee.findById(empId);
    }
    if (!employee) {
      employee = await Employee.findOne({ email: req.user.email });
    }

    if (!employee) {
      return notFound(res, 'Çalışan kaydınız bulunamadı');
    }

    // Çalışanın değiştirebileceği alanlar
    const allowedFields = ['phone', 'birthDate', 'birthPlace', 'bloodType', 'militaryStatus', 'passportNumber'];
    const fieldLabels = {
      phone: 'Telefon',
      birthDate: 'Doğum Tarihi',
      birthPlace: 'Doğum Yeri',
      bloodType: 'Kan Grubu',
      militaryStatus: 'Askerlik Durumu',
      passportNumber: 'Pasaport No'
    };

    // Değişiklikleri tespit et
    const changes = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let newVal = req.body[field];
        let oldVal = employee[field];

        // Normalize
        if (field === 'phone' && newVal) newVal = normalizePhone(newVal) || newVal;
        if (field === 'birthDate' && newVal) newVal = new Date(newVal).toISOString().split('T')[0];
        if (field === 'birthDate' && oldVal) oldVal = new Date(oldVal).toISOString().split('T')[0];
        if (typeof newVal === 'string') newVal = newVal.trim();
        if (typeof oldVal === 'string') oldVal = oldVal?.trim();

        // Sadece gerçekten değişen alanları kaydet
        if (String(newVal || '') !== String(oldVal || '')) {
          changes[field] = { old: oldVal || null, new: newVal || null, label: fieldLabels[field] };
        }
      }
    }

    if (Object.keys(changes).length === 0) {
      return errorResponse(res, { message: 'Değişiklik yapılmadı' });
    }

    // Bekleyen talep var mı kontrol et
    const pendingRequest = await ProfileChangeRequest.findOne({
      employee: employee._id,
      status: 'pending'
    });
    if (pendingRequest) {
      return errorResponse(res, { message: 'Zaten bekleyen bir bilgi değişiklik talebiniz var. Lütfen onaylanmasını veya reddedilmesini bekleyin.' });
    }

    // Değişiklik talebi oluştur
    const changeRequest = new ProfileChangeRequest({
      employee: employee._id,
      user: req.user._id,
      company: employee.company,
      changes
    });
    await changeRequest.save();

    // Şirket admin'lerine bildirim gönder
    const companyAdminRole = await Role.findOne({ name: 'company_admin' });
    if (companyAdminRole) {
      const companyAdmins = await User.find({
        company: employee.company,
        role: companyAdminRole._id,
        isActive: true
      });

      const changedFieldNames = Object.values(changes).map(c => c.label).join(', ');

      for (const admin of companyAdmins) {
        try {
          await notificationService.send({
            recipient: admin._id,
            recipientType: 'company_admin',
            company: employee.company,
            type: 'PROFILE_CHANGE_REQUEST',
            title: 'Bilgi Değişiklik Talebi',
            body: `${employee.firstName} ${employee.lastName} bilgilerinde değişiklik talep etti: ${changedFieldNames}`,
            data: { changeRequestId: changeRequest._id, employeeId: employee._id },
            relatedModel: 'ProfileChangeRequest',
            relatedId: changeRequest._id,
            priority: 'normal'
          });
        } catch (err) {
          console.error('Bildirim gönderilemedi:', err.message);
        }
      }
    }

    return successResponse(res, {
      data: changeRequest,
      message: 'Bilgi değişiklik talebiniz oluşturuldu. Şirket yöneticinizin onayı bekleniyor.'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Çalışanın kendi bekleyen değişiklik taleplerini görüntüle
router.get('/me/change-requests', auth, async (req, res) => {
  try {
    let employee = null;
    if (req.user.employee) {
      const empId = req.user.employee._id || req.user.employee;
      employee = await Employee.findById(empId);
    }
    if (!employee) {
      employee = await Employee.findOne({ email: req.user.email });
    }
    if (!employee) {
      return notFound(res, 'Çalışan kaydınız bulunamadı');
    }

    const requests = await ProfileChangeRequest.find({ employee: employee._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return successResponse(res, { data: requests });
  } catch (error) {
    return serverError(res, error);
  }
});

// Şirket admin: Bilgi değişiklik taleplerini listele
router.get('/change-requests/pending', auth, requireRole('company_admin', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const query = { status: 'pending' };

    // Şirket admin sadece kendi şirketindeki talepleri görsün
    if (req.user.role.name === 'company_admin') {
      const companyId = req.user.company?._id || req.user.company;
      query.company = companyId;
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin: kendi bayisindeki şirketlerin talepleri
      const companies = await Company.find({ dealer: req.user.dealer?._id || req.user.dealer }).select('_id');
      query.company = { $in: companies.map(c => c._id) };
    }

    const requests = await ProfileChangeRequest.find(query)
      .populate('employee', 'firstName lastName tcKimlik')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, { data: requests });
  } catch (error) {
    return serverError(res, error);
  }
});

// Şirket admin: Bilgi değişiklik talebini onayla/reddet
router.put('/change-requests/:id', auth, requireRole('company_admin', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { action, reviewNote } = req.body; // action: 'approve' veya 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse(res, { message: 'Geçersiz işlem. approve veya reject olmalı.' });
    }

    const changeRequest = await ProfileChangeRequest.findById(req.params.id)
      .populate('employee')
      .populate('user');

    if (!changeRequest) {
      return notFound(res, 'Değişiklik talebi bulunamadı');
    }

    if (changeRequest.status !== 'pending') {
      return errorResponse(res, { message: 'Bu talep zaten işlenmiş' });
    }

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (changeRequest.company.toString() !== companyId.toString()) {
        return forbidden(res);
      }
    }

    changeRequest.status = action === 'approve' ? 'approved' : 'rejected';
    changeRequest.reviewedBy = req.user._id;
    changeRequest.reviewedAt = new Date();
    changeRequest.reviewNote = reviewNote || null;

    // Onaylandıysa değişiklikleri uygula
    if (action === 'approve') {
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
    }

    await changeRequest.save();

    // Çalışana bildirim gönder
    if (changeRequest.user) {
      try {
        await notificationService.send({
          recipient: changeRequest.user._id,
          recipientType: 'employee',
          company: changeRequest.company,
          type: action === 'approve' ? 'PROFILE_CHANGE_APPROVED' : 'PROFILE_CHANGE_REJECTED',
          title: action === 'approve' ? 'Bilgi Değişikliğiniz Onaylandı' : 'Bilgi Değişikliğiniz Reddedildi',
          body: action === 'approve'
            ? 'Bilgi değişiklik talebiniz onaylandı ve güncellendi.'
            : `Bilgi değişiklik talebiniz reddedildi.${reviewNote ? ' Neden: ' + reviewNote : ''}`,
          data: { changeRequestId: changeRequest._id },
          relatedModel: 'ProfileChangeRequest',
          relatedId: changeRequest._id,
          priority: 'high'
        });
      } catch (err) {
        console.error('Bildirim gönderilemedi:', err.message);
      }
    }

    return successResponse(res, {
      data: changeRequest,
      message: action === 'approve' ? 'Değişiklik onaylandı' : 'Değişiklik reddedildi'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ==================== PROFİL FOTOĞRAFI ====================

// Profil fotoğrafı multer config
const profilePhotoUpload = multer({
  dest: 'uploads/profilePhotos/',
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WebP)'));
  }
});

// Profil fotoğrafı yükle (çalışan kendisi veya admin)
router.put('/:id/profile-photo', auth, profilePhotoUpload.single('photo'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü: çalışan kendisi veya admin roller
    const isOwnProfile = req.user.employee && req.user.employee._id.toString() === req.params.id;
    const isAdmin = ['super_admin', 'bayi_admin', 'company_admin', 'hr_manager'].includes(req.user.role.name);

    if (!isOwnProfile && !isAdmin) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    if (!req.file) {
      return errorResponse(res, { message: 'Fotoğraf dosyası gerekli' });
    }

    // Eski fotoğrafı sil
    if (employee.profilePhoto) {
      const oldPath = path.join(__dirname, '..', 'uploads', 'profilePhotos', path.basename(employee.profilePhoto));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Yeni dosyayı taşı
    const fileName = `profile_${employee._id}_${Date.now()}${path.extname(req.file.originalname)}`;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profilePhotos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileName);
    fs.renameSync(req.file.path, filePath);

    employee.profilePhoto = `/uploads/profilePhotos/${fileName}`;
    await employee.save();

    return successResponse(res, { data: { profilePhoto: employee.profilePhoto }, message: 'Fotoğraf yüklendi' });
  } catch (error) {
    // Multer hata yakalama
    if (error.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, { message: 'Dosya boyutu maksimum 2MB olabilir' }, 400);
    }
    return serverError(res, error);
  }
});

// Profil fotoğrafı sil
router.delete('/:id/profile-photo', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const isOwnProfile = req.user.employee && req.user.employee._id.toString() === req.params.id;
    const isAdmin = ['super_admin', 'bayi_admin', 'company_admin', 'hr_manager'].includes(req.user.role.name);

    if (!isOwnProfile && !isAdmin) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    if (employee.profilePhoto) {
      const oldPath = path.join(__dirname, '..', 'uploads', 'profilePhotos', path.basename(employee.profilePhoto));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      employee.profilePhoto = null;
      await employee.save();
    }

    return successResponse(res, { message: 'Fotoğraf silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get single employee
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');

    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company._id.toString()) {
        return forbidden(res);
      }
    }

    return successResponse(res, { data: employee });
  } catch (error) {
    return serverError(res, error);
  }
});

// Create employee
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  console.log('===== POST /employees STARTED =====');
  console.log('POST /employees - Request body:', JSON.stringify(req.body, null, 2));
  console.log('POST /employees - User role:', req.user?.role?.name);
  console.log('POST /employees - User company:', req.user?.company);
  try {
    console.log('STEP 1: Parsing request body...');
    // Güvenli property erişimi - her değişken ayrı ayrı tanımlanıyor (TDZ riskini önler)
    // ÖNEMLİ: Destructuring kullanılmıyor çünkü TDZ hatasına neden olabilir
    const firstName = (req.body && req.body.firstName) ? String(req.body.firstName) : '';
    const lastName = (req.body && req.body.lastName) ? String(req.body.lastName) : '';
    const email = (req.body && req.body.email) ? String(req.body.email) : '';
    const phone = (req.body && req.body.phone) ? String(req.body.phone) : '';
    const company = (req.body && req.body.company) ? req.body.company : null;
    let workplace = (req.body && req.body.workplace) ? req.body.workplace : null;
    let workplaceSection = (req.body && req.body.workplaceSection) ? req.body.workplaceSection : null;
    const department = (req.body && req.body.department) ? req.body.department : null;
    // employeeNumber artık client'tan alınmayacak, sadece backend tarafından otomatik atanacak
    const personelNumarasi = (req.body && req.body.personelNumarasi) ? String(req.body.personelNumarasi).trim() : null;
    // Position değişkeni güvenli şekilde tanımlanıyor
    const position = (req.body && req.body.position) ? String(req.body.position) : '';
    const tcKimlik = (req.body && req.body.tcKimlik) ? String(req.body.tcKimlik) : null;
    const manager = (req.body && req.body.manager) ? req.body.manager : null;
    const hireDate = (req.body && req.body.hireDate) ? req.body.hireDate : null;
    const birthDate = (req.body && req.body.birthDate) ? req.body.birthDate : null;
    console.log('STEP 1 DONE: Parsed values - firstName:', firstName, ', lastName:', lastName, ', tcKimlik:', tcKimlik);

    console.log('STEP 2: Basic validation...');
    // Validation
    if (!firstName || firstName.trim() === '') {
      console.log('VALIDATION FAILED: firstName is required');
      return errorResponse(res, { message: 'Ad gereklidir' });
    }
    if (!lastName || lastName.trim() === '') {
      console.log('VALIDATION FAILED: lastName is required');
      return errorResponse(res, { message: 'Soyad gereklidir' });
    }
    if (!tcKimlik || tcKimlik.trim() === '') {
      console.log('VALIDATION FAILED: tcKimlik is required');
      return errorResponse(res, { message: 'TC Kimlik gereklidir' });
    }
    if (!position || (typeof position === 'string' && position.trim() === '')) {
      console.log('VALIDATION FAILED: position is required');
      return errorResponse(res, { message: 'Görevi gereklidir' });
    }

    // TC Kimlik No validation
    if (tcKimlik && tcKimlik.trim().length !== 11) {
      console.log('VALIDATION FAILED: tcKimlik must be 11 digits');
      return errorResponse(res, { message: 'TC Kimlik No 11 haneli olmalıdır' });
    }
    console.log('STEP 2 DONE: Basic validation passed');

    console.log('STEP 3: Determining company ID...');
    // Company ID'yi önce belirle (workplace kontrolü için gerekli)
    // NOT: req.user.company auth middleware'de populate edildiği için tam bir Company objesi olabilir
    // Bu yüzden _id'yi almalıyız - typeof kontrolü ile güvenli şekilde
    let companyIdForValidation = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // req.user.company populated obje olabilir, _id'yi al
      // typeof ile kontrol edelim - obje ise _id'yi al, değilse direkt kullan
      if (req.user.company && typeof req.user.company === 'object' && req.user.company._id) {
        companyIdForValidation = req.user.company._id;
      } else {
        companyIdForValidation = req.user.company;
      }
      console.log('STEP 3: Using user company ID:', companyIdForValidation);
    } else if (req.user.role.name === 'bayi_admin') {
      if (!company) {
        console.log('VALIDATION FAILED: bayi_admin requires company');
        return errorResponse(res, { message: 'Lütfen işlem yapmak istediğiniz şirketi seçiniz.' });
      }
      companyIdForValidation = company;
    } else if (req.user.role.name === 'super_admin') {
      if (!company) {
        console.log('VALIDATION FAILED: super_admin requires company');
        return errorResponse(res, { message: 'Şirket seçilmelidir' });
      }
      companyIdForValidation = company;
    }
    console.log('STEP 3 DONE: companyIdForValidation =', companyIdForValidation);

    // Deneme modu kota kontrolü
    const companyForQuota = await Company.findById(companyIdForValidation);
    if (companyForQuota && companyForQuota.subscription && companyForQuota.subscription.status === 'trial') {
      const activeEmployeeCount = await Employee.countDocuments({ company: companyIdForValidation, status: 'active' });
      const trialLimit = companyForQuota.quota?.allocated || 1;
      if (activeEmployeeCount >= trialLimit) {
        return errorResponse(res, {
          message: `Deneme hesabınızda en fazla ${trialLimit} çalışan ekleyebilirsiniz. Daha fazla çalışan eklemek için abonelik satın alın.`,
          statusCode: 403,
          errorCode: 'TRIAL_QUOTA_EXCEEDED',
        });
      }
    }

    console.log('STEP 4: Checking workplace...');
    // Workplace zorunlu kontrolü - şirkette birden fazla varsa zorunlu
    const Workplace = require('../models/Workplace');
    const workplaceCount = await Workplace.countDocuments({ company: companyIdForValidation });
    console.log('STEP 4: workplaceCount =', workplaceCount, ', provided workplace =', workplace);

    if (workplaceCount > 1 && !workplace) {
      console.log('VALIDATION FAILED: Multiple workplaces require selection');
      return errorResponse(res, { message: 'Bu şirket birden fazla SGK işyerine sahiptir. Lütfen SGK işyerini seçiniz.' });
    } else if (workplaceCount === 1 && !workplace) {
      // Tek işyeri varsa otomatik seç
      const defaultWorkplace = await Workplace.findOne({ company: companyIdForValidation });
      if (defaultWorkplace) {
        workplace = defaultWorkplace._id;
        console.log('STEP 4: Auto-selected workplace =', workplace);
      } else {
        console.log('VALIDATION FAILED: No workplace found');
        return errorResponse(res, { message: 'SGK İşyeri bulunamadı' });
      }
    } else if (!workplace) {
      console.log('VALIDATION FAILED: Workplace is required');
      return errorResponse(res, { message: 'SGK İşyeri seçilmelidir' });
    }

    // Workplace'nin şirkete ait olduğunu kontrol et
    console.log('STEP 4: Verifying workplace belongs to company...');
    const workplaceDoc = await Workplace.findById(workplace);
    if (!workplaceDoc) {
      console.log('VALIDATION FAILED: Workplace not found');
      return notFound(res, 'İşyeri bulunamadı');
    }
    if (workplaceDoc.company.toString() !== companyIdForValidation.toString()) {
      console.log('VALIDATION FAILED: Workplace does not belong to company');
      return errorResponse(res, { message: 'İşyeri seçilen şirkete ait değil' });
    }
    console.log('STEP 4 DONE: Workplace validation passed');

    console.log('STEP 5: Checking workplace section...');
    // WorkplaceSection kontrolü - işyerinde birden fazla bölüm varsa zorunlu
    const sectionCount = await WorkplaceSection.countDocuments({ workplace: workplace });
    console.log('STEP 5: sectionCount =', sectionCount);
    if (sectionCount > 1 && !workplaceSection) {
      console.log('VALIDATION FAILED: Multiple sections require selection');
      return errorResponse(res, { message: 'Bu SGK işyerinde birden fazla bölüm bulunmaktadır. Lütfen bölüm seçiniz.' });
    } else if (sectionCount === 1 && !workplaceSection) {
      // Tek bölüm varsa otomatik seç
      const defaultSection = await WorkplaceSection.findOne({ workplace: workplace });
      if (defaultSection) {
        workplaceSection = defaultSection._id;
        console.log('STEP 5: Auto-selected section =', workplaceSection);
      }
    }

    // WorkplaceSection varsa doğrula
    if (workplaceSection) {
      const sectionDoc = await WorkplaceSection.findById(workplaceSection);
      if (!sectionDoc) {
        console.log('VALIDATION FAILED: Section not found');
        return notFound(res, 'İşyeri bölümü bulunamadı');
      }
      if (sectionDoc.workplace.toString() !== workplace.toString()) {
        console.log('VALIDATION FAILED: Section does not belong to workplace');
        return errorResponse(res, { message: 'İşyeri bölümü seçilen işyerine ait olmalıdır' });
      }
    }
    console.log('STEP 5 DONE: Section validation passed');

    console.log('STEP 6: Checking department and TC Kimlik...');
    // Department kontrolü (opsiyonel ama varsa doğrula)
    if (department) {
      const departmentDoc = await Department.findById(department);
      if (!departmentDoc) {
        console.log('VALIDATION FAILED: Department not found');
        return notFound(res, 'Departman bulunamadı');
      }
    }

    // TC Kimlik No uniqueness check (company bazında)
    if (tcKimlik && tcKimlik.trim().length === 11) {
      console.log('STEP 6: Checking TC Kimlik uniqueness...');
      const existingEmployeeWithTC = await Employee.findOne({
        tcKimlik: tcKimlik.trim(),
        company: companyIdForValidation
      });
      if (existingEmployeeWithTC) {
        console.log('VALIDATION FAILED: TC Kimlik already exists');
        return errorResponse(res, { message: 'Bu TC Kimlik No ile kayıtlı bir çalışan zaten mevcut.' });
      }
    }
    console.log('STEP 6 DONE: Department and TC validation passed');

    // Company ID'yi belirle (yukarıda zaten belirlendi ama tekrar kullan)
    let companyId = companyIdForValidation;
    
    // Bayi admin için şirket erişim kontrolü (yukarıda zaten yapıldı ama tekrar kontrol edelim)
    if (req.user.role.name === 'bayi_admin') {
      const Company = require('../models/Company');
      const companyDoc = await Company.findById(companyId);
      if (!companyDoc) {
        return notFound(res, 'Şirket bulunamadı');
      }
      if (companyDoc.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu şirket için yetkiniz yok');
      }
    }

    // Position değerini güvenli şekilde işle
    // Position değişkeni zaten tanımlı, güvenli şekilde işleniyor
    let positionValue = undefined;
    if (position && typeof position === 'string' && position.trim() !== '') {
      positionValue = position.trim();
    } else if (position) {
      positionValue = String(position);
    }

    // TC Kimlik güvenli işleme
    const tcKimlikValue = (tcKimlik && typeof tcKimlik === 'string' && tcKimlik.trim().length === 11) ? tcKimlik.trim() : undefined;
    
    // Personel numarası unique kontrolü (şirket bazında)
    if (personelNumarasi && personelNumarasi !== '') {
      const existingPersonelNo = await Employee.findOne({
        company: companyId,
        personelNumarasi: personelNumarasi
      });
      if (existingPersonelNo) {
        return errorResponse(res, { message: 'Bu personel numarası başka bir çalışanda kullanılıyor.' });
      }
    }

    console.log('STEP 7: Calculating employeeNumber...');
    // Otomatik employeeNumber atama: Şirket bazında en yüksek numaradan devam et
    // Silinen çalışanların numaraları geri alınmaz, mevcut en büyük numaradan devam edilir

    let finalEmployeeNumber;
    try {
      // Şirketteki tüm çalışanları al ve en yüksek sayısal employeeNumber'ı bul
      const allEmployees = await Employee.find({ company: companyId })
        .select('employeeNumber')
        .lean();

      let maxNum = 0;
      for (const emp of allEmployees) {
        if (emp && emp.employeeNumber) {
          const num = parseInt(emp.employeeNumber);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }

      // Yeni numara: en yüksek numara + 1
      finalEmployeeNumber = String(maxNum + 1);
      console.log('STEP 7: Calculated employeeNumber =', finalEmployeeNumber);
    } catch (calcError) {
      console.error('STEP 7: Error calculating employeeNumber:', calcError);
      // Hata durumunda varsayılan değer
      finalEmployeeNumber = '1';
    }

    // finalEmployeeNumber kontrolü - eğer tanımlı değilse varsayılan değer ata
    if (typeof finalEmployeeNumber === 'undefined' || finalEmployeeNumber === null) {
      finalEmployeeNumber = '1';
    }

    // Bayi admin için createdByBayiId ekle
    let createdByBayiId = null;
    if (req.user.role.name === 'bayi_admin' && req.user.dealer) {
      createdByBayiId = req.user.dealer;
    }

    console.log('STEP 8: Creating Employee object...');
    console.log('STEP 8 DATA: {');
    console.log('  firstName:', firstName.trim());
    console.log('  lastName:', lastName.trim());
    console.log('  tcKimlik:', tcKimlikValue);
    console.log('  position:', positionValue);
    console.log('  company:', companyId);
    console.log('  workplace:', workplace);
    console.log('  workplaceSection:', workplaceSection);
    console.log('  employeeNumber:', finalEmployeeNumber);
    console.log('}');

    // Employee objesi oluştur
    const employee = new Employee({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: normalizePhone(phone),
      tcKimlik: tcKimlikValue,
      position: positionValue,
      company: companyId,
      workplace: workplace, // Zorunlu
      workplaceSection: workplaceSection || null, // Opsiyonel
      department: department || null, // Opsiyonel (artık zorunlu değil)
      manager: manager || null, // Opsiyonel
      employeeNumber: finalEmployeeNumber,
      personelNumarasi: personelNumarasi || undefined,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      createdByBayiId: createdByBayiId
    });

    console.log('STEP 9: Saving employee to database...');
    await employee.save();
    console.log('STEP 9 DONE: Employee saved with ID:', employee._id);

    // Manager değiştiyse approval chain'i güncelle
    if (manager) {
      const { updateEmployeeApprovalChain } = require('../services/approvalChainService');
      try {
        await updateEmployeeApprovalChain(employee._id);
      } catch (error) {
        console.error('Approval chain güncelleme hatası:', error);
      }
    }

    console.log('STEP 10: Creating user account...');
    // Create user account for employee (without password - will be set on first login)
    const role = await Role.findOne({ name: 'employee' });
    if (!role) {
      console.error('employee rolü bulunamadı');
    } else {
      // Check if user already exists
      const emailToCheck = email.toLowerCase().trim();
      console.log('STEP 10: Checking for existing user with email:', emailToCheck);
      let user = await User.findOne({ email: emailToCheck });
      if (!user && emailToCheck) {
        try {
          console.log('STEP 10: Creating new user...');
          user = new User({
            email: emailToCheck,
            password: null, // Null password - will be set on first login
            role: role._id,
            company: companyId,
            employee: employee._id,
            isActive: true,
            mustChangePassword: true // İlk girişte şifre belirleme zorunlu
          });
          await user.save();
          console.log('STEP 10: User created with ID:', user._id);
        } catch (userError) {
          console.error('User oluşturma hatası:', userError);
          // User oluşturulamazsa bile employee kaydı başarılı sayılır
        }
      } else if (user && !user.employee) {
        // Mevcut kullanıcıya employee referansı ekle
        console.log('STEP 10: Linking existing user to employee');
        user.employee = employee._id;
        await user.save();
      } else {
        console.log('STEP 10: Skipped user creation (no email or user exists with employee link)');
      }
    }

    console.log('STEP 11: Populating employee data...');
    const populated = await Employee.findById(employee._id)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');

    console.log('===== POST /employees SUCCESS - Sending response =====');
    return createdResponse(res, { data: populated, message: 'Çalışan oluşturuldu' });
  } catch (error) {
    console.error('===============================');
    console.error('CALISAN OLUSTURMA HATASI:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    console.error('===============================');

    // ReferenceError özel işleme (employeeNumber is not defined gibi)
    if (error.name === 'ReferenceError' || (error.message && error.message.includes('is not defined'))) {
      // Hata mesajını güvenli şekilde işle
      const errorMessage = error.message || 'Bilinmeyen hata';
      return serverError(res, error, errorMessage.includes('employeeNumber is not defined')
        ? 'Çalışan numarası hesaplanırken bir hata oluştu. Lütfen tekrar deneyin.'
        : `Kod hatası: ${errorMessage}. Lütfen sistem yöneticisine bildirin.`);
    }

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message).join(', ');
      return errorResponse(res, { message: `Validasyon hatası: ${validationErrors}` });
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'email') {
        return errorResponse(res, { message: 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi girin.' });
      }
      return errorResponse(res, { message: `${field} alanı için bu değer zaten kullanılıyor.` });
    }

    return serverError(res, error, 'Çalışan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
  }
});

// Update employee
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
    }

    // Update all fields - Güvenli destructuring ile default değerler
    const firstName = req.body?.firstName;
    const lastName = req.body?.lastName;
    const email = req.body?.email;
    const phone = req.body?.phone;
    const workplace = req.body?.workplace;
    const workplaceSection = req.body?.workplaceSection;
    const department = req.body?.department;
    const tcKimlik = req.body?.tcKimlik;
    const position = req.body?.position;
    const birthDate = req.body?.birthDate;
    const hireDate = req.body?.hireDate;
    const exitDate = req.body?.exitDate;
    const exitReason = req.body?.exitReason;
    const exitReasonCode = req.body?.exitReasonCode;
    const salary = req.body?.salary;
    const isNetSalary = req.body?.isNetSalary;
    const contractType = req.body?.contractType;
    const birthPlace = req.body?.birthPlace;
    const passportNumber = req.body?.passportNumber;
    const bloodType = req.body?.bloodType;
    const militaryStatus = req.body?.militaryStatus;
    const hasCriminalRecord = req.body?.hasCriminalRecord;
    const hasDrivingLicense = req.body?.hasDrivingLicense;
    const isRetired = req.body?.isRetired;
    const customFields = req.body?.customFields;
    // employeeNumber read-only - client'tan alınmaz
    const personelNumarasi = req.body?.personelNumarasi;
    const manager = req.body?.manager;

    employee.firstName = firstName !== undefined && firstName !== "" ? firstName : employee.firstName;
    employee.lastName = lastName !== undefined && lastName !== "" ? lastName : employee.lastName;
    employee.email = email !== undefined && email !== "" ? email : employee.email;
    employee.phone = phone !== undefined && phone !== "" ? normalizePhone(phone) : employee.phone;
    employee.department = department !== undefined && department !== "" ? department : employee.department;
    // TC Kimlik validation
    if (tcKimlik !== undefined) {
      if (tcKimlik && tcKimlik.trim() && tcKimlik.trim().length !== 11) {
        return errorResponse(res, { message: 'TC Kimlik No 11 haneli olmalıdır' });
      }
      employee.tcKimlik = tcKimlik?.trim() && tcKimlik.trim().length === 11 ? tcKimlik.trim() : undefined;
    }
    // Position güvenli güncelleme
    if (position !== undefined) {
      employee.position = (position && typeof position === 'string' && position.trim()) ? position.trim() : undefined;
    }
    employee.birthDate = birthDate ? new Date(birthDate) : employee.birthDate;
    employee.hireDate = hireDate ? new Date(hireDate) : employee.hireDate;
    employee.exitDate = exitDate !== undefined ? (exitDate ? new Date(exitDate) : null) : employee.exitDate;
    employee.exitReason = exitReason !== undefined ? (exitReason || undefined) : employee.exitReason;
    employee.exitReasonCode = exitReasonCode !== undefined ? (exitReasonCode || undefined) : employee.exitReasonCode;
    employee.salary = salary !== undefined ? (salary || null) : employee.salary;
    employee.isNetSalary = isNetSalary !== undefined ? isNetSalary : employee.isNetSalary;
    if (contractType !== undefined && ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ', 'UZAKTAN_ÇALIŞMA'].includes(contractType)) {
      employee.contractType = contractType;
    }
    // Sözleşme bitiş tarihi (belirli süreli için)
    if (req.body.contractEndDate !== undefined) {
      employee.contractEndDate = req.body.contractEndDate ? new Date(req.body.contractEndDate) : null;
    }
    // employeeNumber read-only - güncelleme yapılamaz (sadece backend tarafından atanır)
    
    // Personel numarası güncelleme (unique kontrolü ile)
    if (personelNumarasi !== undefined) {
      const trimmedPersonelNo = personelNumarasi ? personelNumarasi.trim() : null;
      if (trimmedPersonelNo && trimmedPersonelNo !== '') {
        // Aynı personel numarası başka bir çalışanda var mı kontrol et
        const existingPersonelNo = await Employee.findOne({
          company: employee.company,
          personelNumarasi: trimmedPersonelNo,
          _id: { $ne: employee._id } // Mevcut çalışan hariç
        });
        if (existingPersonelNo) {
          return errorResponse(res, { message: 'Bu personel numarası başka bir çalışanda kullanılıyor.' });
        }
      }
      employee.personelNumarasi = trimmedPersonelNo || undefined;
    }
    
    // İşten çıkış tarihi girildiğinde çalışanı pasif yap
    if (exitDate !== undefined) {
      if (exitDate && new Date(exitDate) <= new Date()) {
        employee.isActive = false;
        
        // User hesabını da pasif yap
        const user = await User.findOne({ email: employee.email });
        if (user) {
          user.isActive = false;
          await user.save();
        }
      } else if (exitDate === null || exitDate === '') {
        // İşten çıkış tarihi kaldırıldıysa aktif yap
        employee.isActive = true;
        
        // User hesabını da aktif yap
        const user = await User.findOne({ email: employee.email });
        if (user) {
          user.isActive = true;
          await user.save();
        }
      }
    }
    employee.birthPlace = birthPlace !== undefined ? birthPlace : employee.birthPlace;
    employee.passportNumber = passportNumber !== undefined ? passportNumber : employee.passportNumber;
    employee.bloodType = bloodType !== undefined ? bloodType : employee.bloodType;
    employee.militaryStatus = militaryStatus !== undefined ? militaryStatus : employee.militaryStatus;
    employee.hasCriminalRecord = hasCriminalRecord !== undefined ? hasCriminalRecord : employee.hasCriminalRecord;
    employee.hasDrivingLicense = hasDrivingLicense !== undefined ? hasDrivingLicense : employee.hasDrivingLicense;
    employee.isRetired = isRetired !== undefined ? isRetired : employee.isRetired;

    // Workplace ve workplaceSection güncellemesi
    if (workplace !== undefined) {
      if (workplace) {
        const Workplace = require('../models/Workplace');
        const workplaceDoc = await Workplace.findById(workplace);
        if (!workplaceDoc) {
          return notFound(res, 'İşyeri bulunamadı');
        }
        if (workplaceDoc.company.toString() !== employee.company.toString()) {
          return errorResponse(res, { message: 'İşyeri bu şirkete ait olmalıdır' });
        }
        employee.workplace = workplace;
      } else {
        employee.workplace = null;
      }
    }

    if (workplaceSection !== undefined) {
      if (workplaceSection) {
        const WorkplaceSection = require('../models/WorkplaceSection');
        const sectionDoc = await WorkplaceSection.findById(workplaceSection);
        if (!sectionDoc) {
          return notFound(res, 'İşyeri bölümü bulunamadı');
        }
        // workplace kontrolü - ya mevcut workplace ya da yeni seçilen workplace ile eşleşmeli
        const currentWorkplace = workplace || employee.workplace;
        if (currentWorkplace && sectionDoc.workplace.toString() !== currentWorkplace.toString()) {
          return errorResponse(res, { message: 'İşyeri bölümü seçilen işyerine ait olmalıdır' });
        }
        employee.workplaceSection = workplaceSection;
      } else {
        employee.workplaceSection = null;
      }
    }

    // Manager güncellemesi
    const oldManager = employee.manager ? employee.manager.toString() : null;
    const newManager = manager ? manager.toString() : null;

    if (newManager !== oldManager) {
      if (manager) {
        const managerEmployee = await Employee.findById(manager);
        if (!managerEmployee) {
          return notFound(res, 'Yönetici olarak seçilen çalışan bulunamadı.');
        }
        if (managerEmployee.company.toString() !== employee.company.toString()) {
          return errorResponse(res, { message: 'Yönetici olarak seçilen çalışan aynı şirkete ait olmalıdır.' });
        }
      }
      employee.manager = manager || null;
      // Manager değiştiyse, approval chain'i yeniden hesapla (pre-save hook tarafından yapılacak)
    }

    // Custom fields güncellemesi - yeni alanlar şirketteki tüm personellere eklenir
    if (customFields !== undefined) {
      const newFields = customFields.filter(cf => cf.name && cf.value)
      const existingFieldNames = employee.customFields.map(cf => cf.name)
      
      // Yeni eklenen alanları bul
      const newlyAddedFields = newFields.filter(cf => !existingFieldNames.includes(cf.name))
      
      // Eğer yeni alanlar eklendiyse, şirketteki tüm personellere ekle
      if (newlyAddedFields.length > 0) {
        const allEmployees = await Employee.find({ company: employee.company })
        
        for (const emp of allEmployees) {
          // Sadece bu personelde olmayan alanları ekle
          const empFieldNames = emp.customFields.map(cf => cf.name)
          const fieldsToAdd = newlyAddedFields.filter(cf => !empFieldNames.includes(cf.name))
          
          if (fieldsToAdd.length > 0) {
            emp.customFields = [...emp.customFields, ...fieldsToAdd]
            await emp.save()
          }
        }
      }
      
      employee.customFields = customFields
    }

    await employee.save();

    const populated = await Employee.findById(employee._id)
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');

    return successResponse(res, { data: populated, message: 'Çalışan güncellendi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Send activation link to employee
router.post('/:id/send-activation-link', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
    }

    if (employee.isActivated) {
      return errorResponse(res, { message: 'Çalışan zaten aktif' });
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    employee.activationToken = activationToken;
    await employee.save();

    // Create activation link
    const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate-employee?token=${activationToken}&email=${encodeURIComponent(employee.email)}`;

    // Send email
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: employee.email,
        subject: 'Personel Yönetim Sistemi - Hesap Aktivasyonu',
        html: `
          <h2>Hesap Aktivasyonu</h2>
          <p>Merhaba ${employee.firstName} ${employee.lastName},</p>
          <p>Personel Yönetim Sistemine hesabınızı aktif etmek için aşağıdaki linke tıklayın:</p>
          <p><a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Hesabı Aktif Et</a></p>
          <p>Veya aşağıdaki linki tarayıcınıza yapıştırın:</p>
          <p>${activationLink}</p>
          <p>İyi çalışmalar,<br>Personel Yönetim Sistemi</p>
        `
      });

      return successResponse(res, { message: 'Aktivasyon linki gönderildi' });
    } catch (emailError) {
      console.error('Email gönderme hatası:', emailError);
      return serverError(res, emailError, 'Email gönderilemedi');
    }
  } catch (error) {
    return serverError(res, error);
  }
});

// Bulk send activation links
router.post('/bulk-send-activation-links', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return errorResponse(res, { message: 'Çalışan ID listesi gereklidir' });
    }

    let query = { _id: { $in: employeeIds }, isActivated: false };
    
    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // req.user.company populated obje olabilir, _id'yi al
      query.company = req.user.company?._id || req.user.company;
    }

    const employees = await Employee.find(query);

    if (employees.length === 0) {
      return notFound(res, 'Aktivasyon linki gönderilecek çalışan bulunamadı');
    }

    const transporter = createTransporter();
    let successCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        // Generate activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        employee.activationToken = activationToken;
        await employee.save();

        // Create activation link
        const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate-employee?token=${activationToken}&email=${encodeURIComponent(employee.email)}`;

        // Send email
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: employee.email,
          subject: 'Personel Yönetim Sistemi - Hesap Aktivasyonu',
          html: `
            <h2>Hesap Aktivasyonu</h2>
            <p>Merhaba ${employee.firstName} ${employee.lastName},</p>
            <p>Personel Yönetim Sistemine hesabınızı aktif etmek için aşağıdaki linke tıklayın:</p>
            <p><a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Hesabı Aktif Et</a></p>
            <p>Veya aşağıdaki linki tarayıcınıza yapıştırın:</p>
            <p>${activationLink}</p>
            <p>İyi çalışmalar,<br>Personel Yönetim Sistemi</p>
          `
        });

        successCount++;
      } catch (error) {
        console.error(`Email gönderme hatası (${employee.email}):`, error);
        errorCount++;
      }
    }

    return successResponse(res, {
      data: { success: successCount, errors: errorCount > 0 ? errorCount : undefined },
      message: `${successCount} çalışan için aktivasyon linki gönderildi`
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Activate employee (public endpoint)
router.post('/activate', async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return errorResponse(res, { message: 'Token, email ve şifre gereklidir' });
    }

    if (password.length < 6) {
      return errorResponse(res, { message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const employee = await Employee.findOne({
      activationToken: token,
      email: email,
      isActivated: false
    });

    if (!employee) {
      return notFound(res, 'Geçersiz veya süresi dolmuş aktivasyon linki');
    }

    // Create user account for employee
    const role = await Role.findOne({ name: 'employee' });
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      // Update existing user
      user.password = hashedPassword;
      user.role = role._id;
      user.company = employee.company;
      user.employee = employee._id;
      user.isActive = true;
      user.mustChangePassword = false;
      await user.save();
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role._id,
        company: employee.company,
        employee: employee._id,
        isActive: true,
        mustChangePassword: false
      });
      await user.save();
    }

    // Activate employee
    employee.isActivated = true;
    employee.activatedAt = new Date();
    employee.activationToken = null;
    await employee.save();

    return successResponse(res, { message: 'Hesap başarıyla aktif edildi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Manuel aktivasyon - email göndermeden çalışanı aktif et
router.post('/:id/manual-activate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      if (userCompanyId !== employee.company.toString()) {
        return forbidden(res, 'Bu çalışanı aktif etme yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const Company = require('../models/Company');
      const employeeCompany = await Company.findById(employee.company);
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (employeeCompany?.dealer?.toString() !== userDealerId) {
        return forbidden(res, 'Bu çalışanı aktif etme yetkiniz yok');
      }
    }

    if (employee.isActivated) {
      return errorResponse(res, { message: 'Çalışan zaten aktif' });
    }

    // Çalışanı aktif et - mevcut veri validasyonunu atla
    employee.isActivated = true;
    employee.activatedAt = new Date();
    employee.activationToken = null;
    await employee.save({ validateBeforeSave: false });

    // Eğer çalışanın kullanıcı hesabı yoksa oluştur (şifre: 123456)
    const User = require('../models/User');
    const Role = require('../models/Role');
    const bcrypt = require('bcryptjs');

    let existingUser = await User.findOne({ email: employee.email?.toLowerCase() });

    if (!existingUser && employee.email) {
      const employeeRole = await Role.findOne({ name: 'employee' });
      if (employeeRole) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        existingUser = new User({
          email: employee.email.toLowerCase(),
          password: hashedPassword,
          role: employeeRole._id,
          company: employee.company,
          employee: employee._id,
          isActive: true,
          mustChangePassword: true
        });
        await existingUser.save();
      }
    }

    return successResponse(res, {
      data: {
        employeeId: employee._id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        userCreated: !existingUser ? false : true,
        defaultPassword: existingUser ? '123456' : null,
        note: 'İlk girişte şifre değiştirmesi gerekecektir'
      },
      message: 'Çalışan başarıyla aktif edildi'
    });
  } catch (error) {
    console.error('Manuel aktivasyon hatası:', error);

    // Mongoose validation hatası için daha açıklayıcı mesaj
    if (error.name === 'ValidationError') {
      const missingFields = Object.keys(error.errors).map(field => {
        const fieldNames = {
          tcKimlik: 'TC Kimlik No',
          workplace: 'SGK İşyeri',
          firstName: 'Ad',
          lastName: 'Soyad',
          email: 'Email'
        };
        return fieldNames[field] || field;
      });
      return errorResponse(res, { message: `Çalışan kaydında eksik zorunlu alanlar: ${missingFields.join(', ')}` });
    }

    return serverError(res, error, 'Aktivasyon sırasında hata oluştu');
  }
});

// Toplu manuel aktivasyon
router.post('/bulk-manual-activate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return errorResponse(res, { message: 'Çalışan ID listesi gereklidir' });
    }

    let query = { _id: { $in: employeeIds }, isActivated: false };

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      query.company = userCompanyId;
    }

    const employees = await Employee.find(query);

    if (employees.length === 0) {
      return notFound(res, 'Aktif edilecek çalışan bulunamadı');
    }

    const User = require('../models/User');
    const Role = require('../models/Role');
    const bcrypt = require('bcryptjs');
    const employeeRole = await Role.findOne({ name: 'employee' });

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const employee of employees) {
      try {
        // Çalışanı aktif et - mevcut veri validasyonunu atla
        employee.isActivated = true;
        employee.activatedAt = new Date();
        employee.activationToken = null;
        await employee.save({ validateBeforeSave: false });

        // Kullanıcı hesabı oluştur
        let userCreated = false;
        if (employee.email && employeeRole) {
          const existingUser = await User.findOne({ email: employee.email?.toLowerCase() });
          if (!existingUser) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            const newUser = new User({
              email: employee.email.toLowerCase(),
              password: hashedPassword,
              role: employeeRole._id,
              company: employee.company,
              employee: employee._id,
              isActive: true,
              mustChangePassword: true
            });
            await newUser.save();
            userCreated = true;
          }
        }

        successCount++;
        results.push({
          employeeId: employee._id,
          fullName: `${employee.firstName} ${employee.lastName}`,
          success: true,
          userCreated
        });
      } catch (err) {
        errorCount++;
        results.push({
          employeeId: employee._id,
          fullName: `${employee.firstName} ${employee.lastName}`,
          success: false,
          error: err.message
        });
      }
    }

    return successResponse(res, {
      data: {
        successCount,
        errorCount,
        defaultPassword: '123456',
        note: 'İlk girişte şifre değiştirmeleri gerekecektir',
        results
      },
      message: `${successCount} çalışan aktif edildi${errorCount > 0 ? `, ${errorCount} hata oluştu` : ''}`
    });
  } catch (error) {
    console.error('Toplu manuel aktivasyon hatası:', error);
    return serverError(res, error);
  }
});

// SMS ile aktivasyon OTP gönder
router.post('/:id/send-sms-activation', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      if (userCompanyId !== employee.company.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const employeeCompany = await Company.findById(employee.company);
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (employeeCompany?.dealer?.toString() !== userDealerId) {
        return forbidden(res);
      }
    }

    if (employee.isActivated) {
      return errorResponse(res, { message: 'Çalışan zaten aktif' });
    }

    if (!employee.phone) {
      return errorResponse(res, { message: 'Çalışanın telefon numarası kayıtlı değil. Önce telefon numarası ekleyin.' });
    }

    const result = await smsService.sendEmployeeActivationOtp({
      phone: employee.phone,
      employeeId: employee._id,
      employee: employee._id,
      company: employee.company,
    });

    return successResponse(res, {
      data: {
        verificationId: result.verificationId,
        maskedPhone: result.maskedPhone,
        expiresAt: result.expiresAt,
        expiresInMinutes: result.expiresInMinutes,
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
      },
      message: `Aktivasyon kodu ${result.maskedPhone} numarasına gönderildi`,
    });
  } catch (error) {
    console.error('SMS aktivasyon gönderme hatası:', error);
    return errorResponse(res, { message: error.message || 'SMS gönderilemedi' });
  }
});

// SMS OTP doğrula ve çalışanı aktif et
router.post('/verify-sms-activation', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { verificationId, code, employeeId } = req.body;

    if (!verificationId || !code || !employeeId) {
      return errorResponse(res, { message: 'Doğrulama ID, kod ve çalışan ID gereklidir' });
    }

    // OTP doğrula
    const ip = req.ip || req.connection?.remoteAddress;
    const verifyResult = await smsService.verifyOtp(verificationId, code, ip);

    if (!verifyResult.success) {
      return errorResponse(res, { message: 'Doğrulama başarısız' });
    }

    // Çalışanı aktif et
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    if (employee.isActivated) {
      return successResponse(res, { message: 'Çalışan zaten aktif' });
    }

    employee.isActivated = true;
    employee.activatedAt = new Date();
    employee.activationToken = null;
    await employee.save({ validateBeforeSave: false });

    // Kullanıcı hesabı oluştur (manuel aktivasyonla aynı mantık)
    let userCreated = false;
    if (employee.email) {
      const existingUser = await User.findOne({ email: employee.email?.toLowerCase() });
      if (!existingUser) {
        const employeeRole = await Role.findOne({ name: 'employee' });
        if (employeeRole) {
          const hashedPassword = await bcrypt.hash('123456', 10);
          const newUser = new User({
            email: employee.email.toLowerCase(),
            password: hashedPassword,
            role: employeeRole._id,
            company: employee.company,
            employee: employee._id,
            isActive: true,
            mustChangePassword: true,
          });
          await newUser.save();
          userCreated = true;
        }
      }
    }

    return successResponse(res, {
      data: {
        employeeId: employee._id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        userCreated,
        defaultPassword: userCreated ? '123456' : null,
        note: userCreated ? 'İlk girişte şifre değiştirmesi gerekecektir' : null,
      },
      message: `${employee.firstName} ${employee.lastName} başarıyla aktif edildi`,
    });
  } catch (error) {
    console.error('SMS aktivasyon doğrulama hatası:', error);
    return errorResponse(res, { message: error.message || 'Doğrulama sırasında hata oluştu' });
  }
});

// Toplu SMS aktivasyon gönder
router.post('/bulk-send-sms-activation', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return errorResponse(res, { message: 'Çalışan ID listesi gereklidir' });
    }

    let query = { _id: { $in: employeeIds }, isActivated: false };

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      query.company = userCompanyId;
    }

    const employees = await Employee.find(query);

    if (employees.length === 0) {
      return notFound(res, 'SMS gönderilecek çalışan bulunamadı');
    }

    let successCount = 0;
    let errorCount = 0;
    let noPhoneCount = 0;
    const results = [];

    for (const employee of employees) {
      if (!employee.phone) {
        noPhoneCount++;
        results.push({
          employeeId: employee._id,
          fullName: `${employee.firstName} ${employee.lastName}`,
          success: false,
          error: 'Telefon numarası yok',
        });
        continue;
      }

      try {
        const result = await smsService.sendEmployeeActivationOtp({
          phone: employee.phone,
          employeeId: employee._id,
          employee: employee._id,
          company: employee.company,
        });

        successCount++;
        results.push({
          employeeId: employee._id,
          fullName: `${employee.firstName} ${employee.lastName}`,
          success: true,
          verificationId: result.verificationId,
          maskedPhone: result.maskedPhone,
        });
      } catch (err) {
        errorCount++;
        results.push({
          employeeId: employee._id,
          fullName: `${employee.firstName} ${employee.lastName}`,
          success: false,
          error: err.message,
        });
      }
    }

    return successResponse(res, {
      data: { successCount, errorCount, noPhoneCount, results },
      message: `${successCount} çalışana SMS gönderildi${errorCount > 0 ? `, ${errorCount} hata` : ''}${noPhoneCount > 0 ? `, ${noPhoneCount} telefonsuz` : ''}`,
    });
  } catch (error) {
    console.error('Toplu SMS aktivasyon hatası:', error);
    return serverError(res, error);
  }
});

// Delete employee
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
    }

    await Employee.findByIdAndDelete(req.params.id);
    return successResponse(res, { message: 'Çalışan silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

