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

    return successResponse(res, { data: employees });
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
      'Adı',
      'Soyadı',
      'TC Kimlik No',
      'İşe Giriş Tarihi',
      'Doğum Tarihi',
      'Görevi',
      'Email Adresi',
      'Telefon Numarası'
    ];

    // Tüm personel alanları (zorunlu alanlar + diğerleri)
    const allFields = [
      ...requiredFields,
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
        'Ahmet', // Adı
        'Yılmaz', // Soyadı
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

// Bulk import from Excel - MUST be before /:id route
router.post('/bulk-import', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, { message: 'Dosya yüklenmedi' });
    }

    let companyId = req.body.company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // req.user.company populated obje olabilir, _id'yi al
      companyId = req.user.company?._id || req.user.company;
    }

    // Helper function to get field value from row
    const getFieldValue = (row, possibleKeys) => {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return String(row[key]);
        }
      }
      return null;
    };

    // Helper function to parse Excel date (can be number or string)
    const parseExcelDate = (value) => {
      if (!value) return null;

      // Eğer sayısal ise, Excel tarih formatıdır (1900'den itibaren gün sayısı)
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
        // Excel tarihi: 1900-01-01 = 1, JavaScript: 1970-01-01 = 0
        // Excel'de 25569 = 1970-01-01
        const EXCEL_EPOCH_DIFF = 25569;
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        return new Date((numValue - EXCEL_EPOCH_DIFF) * MS_PER_DAY);
      }

      // String tarih formatları: "2024-01-15", "15.01.2024", "15/01/2024"
      const strValue = String(value).trim();

      // DD.MM.YYYY formatı
      const dotMatch = strValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dotMatch) {
        const [, day, month, year] = dotMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // DD/MM/YYYY formatı
      const slashMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // YYYY-MM-DD formatı (ISO)
      const isoMatch = strValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Diğer formatlar için Date.parse dene
      const parsed = new Date(strValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    };

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const employeesList = [];
    const errors = [];
    const requiredFieldsMap = {
      'Adı': ['Adı', 'ad', 'adı', 'firstName', 'first_name', 'firstname'],
      'Soyadı': ['Soyadı', 'soyad', 'soyadı', 'lastName', 'last_name', 'lastname'],
      'TC Kimlik No': ['TC Kimlik No', 'tcKimlik', 'tc_kimlik', 'tc', 'tckimlik', 'tc kimlik no'],
      'İşe Giriş Tarihi': ['İşe Giriş Tarihi', 'işe giriş tarihi', 'işeGirişTarihi', 'hireDate', 'hire_date', 'ise_giris_tarihi', 'işeGiriş', 'iseGiris'],
      'Doğum Tarihi': ['Doğum Tarihi', 'doğum tarihi', 'doğumTarihi', 'birthDate', 'birth_date', 'dogum_tarihi', 'doğumTarih', 'dogumTarih'],
      'Görevi': ['Görevi', 'görevi', 'görev', 'position', 'gorev', 'gorevi'],
      'Email Adresi': ['Email Adresi', 'email', 'email adresi', 'e-mail', 'e_mail'],
      'Telefon Numarası': ['Telefon Numarası', 'telefon', 'telefon numarası', 'phone', 'telefon_numarası', 'tel']
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = [];

      // Zorunlu alanları kontrol et
      const firstName = getFieldValue(row, requiredFieldsMap['Adı']);
      const lastName = getFieldValue(row, requiredFieldsMap['Soyadı']);
      const tcKimlik = getFieldValue(row, requiredFieldsMap['TC Kimlik No']);
      const hireDate = getFieldValue(row, requiredFieldsMap['İşe Giriş Tarihi']);
      const birthDate = getFieldValue(row, requiredFieldsMap['Doğum Tarihi']);
      const position = getFieldValue(row, requiredFieldsMap['Görevi']);
      const email = getFieldValue(row, requiredFieldsMap['Email Adresi']);
      const phone = getFieldValue(row, requiredFieldsMap['Telefon Numarası']);

      if (!firstName || firstName.trim() === '') rowErrors.push('Adı');
      if (!lastName || lastName.trim() === '') rowErrors.push('Soyadı');
      if (!tcKimlik || tcKimlik.trim() === '') rowErrors.push('TC Kimlik No');
      if (!hireDate || hireDate.trim() === '') rowErrors.push('İşe Giriş Tarihi');
      if (!birthDate || birthDate.trim() === '') rowErrors.push('Doğum Tarihi');
      if (!position || position.trim() === '') rowErrors.push('Görevi');
      if (!email || email.trim() === '') rowErrors.push('Email Adresi');
      if (!phone || phone.trim() === '') rowErrors.push('Telefon Numarası');

      if (rowErrors.length > 0) {
        errors.push(`Satır ${i + 2}: Eksik zorunlu alanlar - ${rowErrors.join(', ')}. Lütfen bu alanları doldurun.`);
        continue;
      }

      try {
        // Workplace kontrolü (zorunlu)
        const workplaceName = row['SGK İşyeri'] || row['İşyeri'] || row.workplace || row['SGK İşyeri Dosyası'];
        let workplaceDoc = null;
        if (workplaceName) {
          workplaceDoc = await Workplace.findOne({
            name: workplaceName,
            company: companyId
          });
          if (!workplaceDoc) {
            errors.push(`Satır ${i + 2}: SGK İşyeri bulunamadı - ${workplaceName}`);
            continue;
          }
        } else {
          // Workplace belirtilmemişse, şirketin ilk işyerini kullan
          workplaceDoc = await Workplace.findOne({ company: companyId });
          if (!workplaceDoc) {
            errors.push(`Satır ${i + 2}: Şirket için varsayılan işyeri bulunamadı`);
            continue;
          }
        }

        // WorkplaceSection kontrolü (opsiyonel)
        let workplaceSectionDoc = null;
        const sectionName = row['İşyeri Bölümü'] || row['Bölüm'] || row.workplaceSection;
        if (sectionName) {
          workplaceSectionDoc = await WorkplaceSection.findOne({
            name: sectionName,
            workplace: workplaceDoc._id
          });
          if (!workplaceSectionDoc) {
            errors.push(`Satır ${i + 2}: İşyeri bölümü bulunamadı - ${sectionName}`);
            continue;
          }
        }

        // Departman kontrolü (opsiyonel)
        let departmentDoc = null;
        const departmentName = row['Departman'] || row.departman || row.department;
        if (departmentName) {
          departmentDoc = await Department.findOne({
            name: departmentName,
            company: companyId
          });
          if (!departmentDoc) {
            errors.push(`Satır ${i + 2}: Departman bulunamadı - ${departmentName}`);
            continue;
          }
        }

        // Tarih formatlarını parse et (Excel sayısal format dahil)
        const parsedHireDate = parseExcelDate(hireDate);
        if (!parsedHireDate || isNaN(parsedHireDate.getTime())) {
          errors.push(`Satır ${i + 2}: İşe Giriş Tarihi geçersiz format - ${hireDate}`);
          continue;
        }

        const parsedBirthDate = parseExcelDate(birthDate);
        if (!parsedBirthDate || isNaN(parsedBirthDate.getTime())) {
          errors.push(`Satır ${i + 2}: Doğum Tarihi geçersiz format - ${birthDate}`);
          continue;
        }

        // Email kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errors.push(`Satır ${i + 2}: Geçersiz email formatı - ${email}`);
          continue;
        }

        // TC Kimlik tekrar kontrolü
        const existingEmployee = await Employee.findOne({
          tcKimlik: tcKimlik.trim(),
          company: companyId
        });
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

        // Otomatik sıra numarası atama - şirket bazında mevcut en yüksek numaradan devam et
        const allExistingEmployees = await Employee.find({ company: companyId }).select('employeeNumber').lean();
        let maxNum = 0;
        for (const emp of allExistingEmployees) {
          if (emp && emp.employeeNumber) {
            const num = parseInt(emp.employeeNumber);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
        const finalEmployeeNumber = String(maxNum + 1 + employeesList.length);

        const employee = new Employee({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          tcKimlik: tcKimlik.trim(),
          position: position.trim(),
          company: companyId,
          workplace: workplaceDoc._id,
          workplaceSection: workplaceSectionDoc ? workplaceSectionDoc._id : null,
          department: departmentDoc ? departmentDoc._id : null,
          employeeNumber: finalEmployeeNumber,
          personelNumarasi: personelNumarasi?.trim() || undefined,
          hireDate: parsedHireDate,
          birthDate: parsedBirthDate,
          birthPlace: birthPlace?.trim() || undefined,
          passportNumber: passportNumber?.trim() || undefined,
          bloodType: bloodType?.trim() || undefined,
          militaryStatus: militaryStatus?.trim() || undefined,
          hasCriminalRecord: hasCriminalRecord || false,
          hasDrivingLicense: hasDrivingLicense || false,
          isRetired: isRetired || false
        });

        await employee.save();

        // Create user account for employee (without password)
        const role = await Role.findOne({ name: 'employee' });
        if (role) {
          let user = await User.findOne({ email: email.toLowerCase().trim() });
          if (!user) {
            user = new User({
              email: email.toLowerCase().trim(),
              password: null,
              role: role._id,
              company: companyId,
              employee: employee._id,
              isActive: true,
              mustChangePassword: true
            });
            await user.save();
          } else if (!user.employee) {
            // Mevcut kullanıcıya employee referansı ekle
            user.employee = employee._id;
            await user.save();
          }
        }

        employeesList.push(employee);
      } catch (error) {
        // Hata mesajını kullanıcı dostu hale getir
        let friendlyError = error.message;

        // MongoDB duplicate key hatası
        if (error.code === 11000 || error.message.includes('E11000')) {
          const duplicateField = error.message.match(/index: (\w+)_/)?.[1];
          const duplicateValue = error.message.match(/dup key: \{ \w+: "?([^"}\s]+)"? \}/)?.[1];

          const fieldNames = {
            'employeeNumber': 'Personel Numarası',
            'tcKimlik': 'TC Kimlik No',
            'email': 'Email Adresi',
            'personelNumarasi': 'Personel Numarası'
          };

          const fieldName = fieldNames[duplicateField] || duplicateField;
          friendlyError = `${fieldName} "${duplicateValue}" zaten sistemde kayıtlı. Farklı bir değer kullanın.`;
        }
        // Validation hataları
        else if (error.name === 'ValidationError') {
          const validationErrors = Object.values(error.errors).map(e => e.message);
          friendlyError = validationErrors.join(', ');
        }
        // TC Kimlik hatası
        else if (error.message.includes('TC Kimlik')) {
          friendlyError = error.message;
        }
        // Genel hatalar için daha açıklayıcı mesajlar
        else if (error.message.includes('Cast to ObjectId failed')) {
          friendlyError = 'Geçersiz referans değeri (Departman, İşyeri vb. kontrol edin)';
        }

        errors.push(`Satır ${i + 2}: ${friendlyError}`);
      }
    }

    // Clean up uploaded file
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
    // Find employee by user's email
    const employee = await Employee.findOne({ email: req.user.email })
      .populate('company')
      .populate('workplace', 'name sgkRegisterNumber')
      .populate('workplaceSection', 'name')
      .populate('department', 'name');

    if (!employee) {
      return notFound(res, 'Çalışan kaydınız bulunamadı');
    }

    return successResponse(res, { data: employee });
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

