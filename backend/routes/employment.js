const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Employment = require('../models/Employment');
const EmploymentPreRecord = require('../models/EmploymentPreRecord');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const User = require('../models/User');
const Message = require('../models/Message');
const minimumWageService = require('../services/minimumWageService');
const Role = require('../models/Role');
const { auth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');
const {
  isExceptionSector,
  validateHireDate,
  validateTerminationDate,
  generateEmploymentContract,
  generateResignationText,
  calculateSeveranceAndNotice,
  generateSeveranceNoticePDF
} = require('../services/employmentService');
const quotaService = require('../services/quotaService');
const contractService = require('../services/contractService');

// Email transporter helper
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Geçici şifre oluşturma (8 karakter, harf ve rakam - güvenli crypto kullanarak)
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomBytes = crypto.randomBytes(8);
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(randomBytes[i] % chars.length);
  }
  return password;
};

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/employment/',
  fileFilter: (req, file, cb) => {
    // PDF veya resim dosyaları kabul edilir
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image|pdf/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece PDF veya resim dosyaları yüklenebilir'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure upload directories exist
const uploadsDirs = [
  'uploads/employment',
  'uploads/employment/contracts',
  'uploads/employment/resignations',
  'uploads/employment/severance',
  'uploads/employment/terminations'
];
uploadsDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

/**
 * GET /api/employment/check-tckn - TC Kimlik No kontrolü (mevcut çalışan veya bekleyen talep var mı?)
 */
router.get('/check-tckn', auth, async (req, res) => {
  try {
    const { tckn, companyId } = req.query;

    if (!tckn || !companyId) {
      return res.json({ exists: false });
    }

    // Mevcut aktif çalışan kontrolü
    const existingEmployee = await Employee.findOne({
      company: companyId,
      tcKimlik: tckn.trim(),
      status: { $in: ['active', 'on_leave'] }
    });

    if (existingEmployee) {
      return res.json({
        exists: true,
        type: 'employee',
        message: `Bu TC Kimlik No ile kayıtlı bir çalışan zaten mevcut: ${existingEmployee.firstName} ${existingEmployee.lastName}`
      });
    }

    // Bekleyen talep kontrolü
    const pendingRequest = await EmploymentPreRecord.findOne({
      companyId: companyId,
      tcKimlikNo: tckn.trim(),
      processType: 'hire',
      status: { $in: ['PENDING', 'PENDING', 'PENDING'] }
    });

    if (pendingRequest) {
      return res.json({
        exists: true,
        type: 'pending_request',
        message: 'Bu TC Kimlik No için daha önce işe giriş talebi gönderilmiş ve onay bekliyor.'
      });
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error('TCKN kontrol hatası:', error);
    return res.json({ exists: false });
  }
});

/**
 * POST /api/employment/validate-hire-date - İşe giriş tarihi validasyonu ve uyarıları
 */
router.post('/validate-hire-date', auth, async (req, res) => {
  try {
    const { hireDate, companyId } = req.body;

    if (!hireDate || !companyId) {
      return errorResponse(res, { message: 'Tarih ve şirket bilgisi gereklidir' });
    }

    // İstisna sektör kontrolü
    const isException = await isExceptionSector(companyId);
    let warnings = [];
    
    if (!isException) {
      warnings = await validateHireDate(hireDate, companyId);
    } else {
      warnings.push('Bu Sektör İstisna Kapsamındadır (İnşaat/Balıkçılık).');
    }

    res.json({
      success: true,
      warnings,
      isExceptionSector: isException
    });
  } catch (error) {
    console.error('Tarih validasyon hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/validate-termination-date - İşten çıkış tarihi validasyonu ve uyarıları
 */
router.post('/validate-termination-date', auth, async (req, res) => {
  try {
    const { terminationDate } = req.body;

    if (!terminationDate) {
      return errorResponse(res, { message: 'Çıkış tarihi gereklidir' });
    }

    const warnings = validateTerminationDate(terminationDate);

    res.json({
      success: true,
      warnings
    });
  } catch (error) {
    console.error('Çıkış tarihi validasyon hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/start - İşe giriş işlemi başlat (Sadece Şirket Admini)
 */
router.post('/start', auth, requireRole('company_admin', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const {
      fullName,
      tckn,
      sgkJobCode,
      jobName,
      email,
      phone,
      salaryAmount,
      employmentType,
      startDate,
      companyId,
      partTimeDetails
    } = req.body;

    // Validasyon - Zorunlu alanlar
    if (!companyId) {
      return errorResponse(res, { message: 'Şirket Seçimi Zorunludur.' });
    }

    if (!startDate) {
      return errorResponse(res, { message: 'İşe Giriş Tarihi Zorunludur.' });
    }

    if (!fullName || !tckn) {
      return errorResponse(res, { message: 'Adı Soyadı Ve TC Kimlik No Zorunludur.' });
    }

    if (!sgkJobCode) {
      return errorResponse(res, { message: 'Görevi (SGK Meslek Kodu) Zorunludur.' });
    }

    if (!phone) {
      return errorResponse(res, { message: 'Telefon Zorunludur.' });
    }
    
    // Ad Soyad'ı büyük harfe çevir ve trim yap
    const formattedFullName = fullName.trim().toUpperCase();

    // TC Kimlik No validasyonu
    const cleanTCKN = tckn.replace(/\D/g, '');
    if (cleanTCKN.length !== 11 || !/^\d+$/.test(cleanTCKN)) {
      return errorResponse(res, { message: 'TC Kimlik No 11 Haneli Sayı Olmalıdır' });
    }

    // Telefon formatı kontrolü
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
      return errorResponse(res, { message: 'Telefon Numarası 11 Haneli ve 0 ile Başlamalıdır' });
    }

    // Sözleşme tipi validasyonu
    const validEmploymentTypes = ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ', 'UZAKTAN_ÇALIŞMA'];
    const finalEmploymentType = employmentType || 'BELİRSİZ_SÜRELİ';
    if (!validEmploymentTypes.includes(finalEmploymentType)) {
      return errorResponse(res, { message: 'Geçersiz Sözleşme Tipi' });
    }

    // Şirket kontrolü
    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket Bulunamadı');
    }

    // İşyeri kontrolü ve otomatik oluşturma
    const existingWorkplaces = await Workplace.find({ company: companyId, isActive: true });
    let finalWorkplaceId = null;
    
    if (existingWorkplaces.length === 1) {
      finalWorkplaceId = existingWorkplaces[0]._id;
    } else if (existingWorkplaces.length === 0) {
      const workplace = new Workplace({
        name: company.name,
        company: companyId,
        isDefault: true,
        isActive: true
      });
      await workplace.save();
      finalWorkplaceId = workplace._id;
    } else {
      return errorResponse(res, { message: 'Birden Fazla İşyeri Bulundu. Lütfen İşyeri Seçimi Yapınız.' });
    }

    // Ücret kontrolü - boşsa asgari ücret (şirket ayarlarından)
    const companyWageType = company.payrollCalculationType || 'NET';
    const MINIMUM_WAGE = await minimumWageService.getMinimumWage(null, companyWageType);
    const finalUcret = salaryAmount ? parseFloat(salaryAmount) : MINIMUM_WAGE;

    // Ücret tipi şirket ayarlarından
    const salaryType = company.payrollCalculationType === 'BRUT' ? 'BRUT' : 'NET';

    // İstisna sektör kontrolü
    const isException = await isExceptionSector(companyId);
    let warnings = [];
    
    if (!isException) {
      warnings = await validateHireDate(startDate, companyId);
    } else {
      warnings.push('Bu Sektör İstisna Kapsamındadır (İnşaat/Balıkçılık).');
    }

    // EmploymentPreRecord oluştur - status=PENDING
    const preRecord = new EmploymentPreRecord({
      processType: 'hire',
      candidateFullName: formattedFullName,
      tcKimlikNo: cleanTCKN,
      email: email || null,
      phone: cleanPhone,
      companyId,
      workplaceId: finalWorkplaceId,
      sectionId: null,
      departmentId: null,
      hireDate: new Date(startDate),
      sgkMeslekKodu: sgkJobCode,
      jobName: jobName || null,
      ucret: finalUcret,
      contractType: finalEmploymentType,
      isRetired: req.body.isRetired || false,
      // Part-time detayları (sadece KISMİ_SÜRELİ için)
      partTimeDetails: finalEmploymentType === 'KISMİ_SÜRELİ' && partTimeDetails ? {
        weeklyHours: partTimeDetails.weeklyHours,
        workDays: partTimeDetails.workDays || [],
        dailyHours: partTimeDetails.dailyHours,
        paymentType: partTimeDetails.paymentType || 'monthly'
      } : undefined,
      status: 'PENDING',
      pendingDate: new Date(),
      waitingApprovalAt: new Date(),
      createdBy: req.user._id
    });

    await preRecord.save();

    // İş sözleşmesi ve başvuru formu Word belgesi oluştur
    let contractUrl = null;
    let applicationFormUrl = null;
    try {
      const workplace = await Workplace.findById(finalWorkplaceId);

      // İş sözleşmesi
      const contractResult = await contractService.generateContract(preRecord, company, workplace);
      contractUrl = contractResult.fileUrl;
      preRecord.documents.push({
        type: 'iş_sözleşmesi_word',
        fileUrl: contractResult.fileUrl,
        createdAt: new Date()
      });

      // İş başvuru formu
      const applicationResult = await contractService.generateJobApplicationForm(preRecord, company, workplace);
      applicationFormUrl = applicationResult.fileUrl;
      preRecord.documents.push({
        type: 'iş_başvuru_formu',
        fileUrl: applicationResult.fileUrl,
        createdAt: new Date()
      });

      await preRecord.save();
    } catch (contractError) {
      console.error('Belge oluşturma hatası:', contractError);
      // Belgeler oluşturulamazsa devam et, kayıt yine oluşturulsun
    }

    // Populate edilmiş kaydı al
    const populatedPreRecord = await EmploymentPreRecord.findById(preRecord._id)
      .populate('companyId', 'name payrollCalculationType')
      .populate('workplaceId', 'name')
      .populate('createdBy', 'email');

    // Ücret uyarısı
    let salaryWarning = null;
    if (!salaryAmount) {
      salaryWarning = `Ücret Girilmediği İçin Asgari Ücret (${MINIMUM_WAGE.toLocaleString('tr-TR')} TL) Uygulanmıştır.`;
    }

    res.status(201).json({
      success: true,
      message: 'İşe Giriş İşlemi Başlatıldı Ve Onaya Gönderildi',
      data: {
        recordId: preRecord._id,
        preRecord: populatedPreRecord,
        warnings: salaryWarning ? [...warnings, salaryWarning] : warnings,
        salaryWarning
      },
      contractUrl,
      applicationFormUrl
    });
  } catch (error) {
    console.error('İşe giriş hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/hire - İşe giriş (Eski endpoint - geriye dönük uyumluluk için)
 */
router.post('/hire', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const {
      candidateFullName,
      tcKimlikNo,
      email,
      phone,
      companyId,
      workplaceId,
      sectionId,
      departmentId,
      hireDate,
      sgkMeslekKodu,
      ucret,
      contractType
    } = req.body;

    // Validasyon - Zorunlu alanlar
    if (!companyId) {
      return errorResponse(res, { message: 'Şirket Seçimi Zorunludur.' });
    }

    if (!hireDate) {
      return errorResponse(res, { message: 'İşe Giriş Tarihi Zorunludur.' });
    }

    if (!candidateFullName || !tcKimlikNo) {
      return errorResponse(res, { message: 'Adı Soyadı Ve TC Kimlik No Zorunludur.' });
    }
    
    // Ad Soyad'ı büyük harfe çevir ve trim yap
    const formattedFullName = candidateFullName.trim().toUpperCase();

    // TC Kimlik No validasyonu
    if (tcKimlikNo.length !== 11 || !/^\d+$/.test(tcKimlikNo)) {
      return errorResponse(res, { message: 'TC Kimlik No 11 Haneli Sayı Olmalıdır' });
    }

    // TC Kimlik No ile mevcut çalışan kontrolü
    const existingEmployee = await Employee.findOne({
      company: companyId,
      tcKimlik: tcKimlikNo.trim(),
      status: { $in: ['active', 'on_leave'] }
    });
    if (existingEmployee) {
      return errorResponse(res, { message: 'Bu TC Kimlik No ile kayıtlı bir çalışan zaten mevcut: ' + existingEmployee.firstName + ' ' + existingEmployee.lastName });
    }

    // TC Kimlik No ile bekleyen talep kontrolü
    const pendingRequest = await EmploymentPreRecord.findOne({
      companyId: companyId,
      tcKimlikNo: tcKimlikNo.trim(),
      processType: 'hire',
      status: { $in: ['PENDING', 'PENDING', 'PENDING'] }
    });
    if (pendingRequest) {
      return errorResponse(res, { message: 'Bu TC Kimlik No için daha önce işe giriş talebi gönderilmiş ve onay bekliyor.' });
    }

    // Sözleşme tipi validasyonu
    const validContractTypes = ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ'];
    const finalContractType = contractType || 'BELİRSİZ_SÜRELİ';
    if (!validContractTypes.includes(finalContractType)) {
      return errorResponse(res, { message: 'Geçersiz Sözleşme Tipi' });
    }

    // Şirket kontrolü
    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket Bulunamadı');
    }

    // İşyeri kontrolü ve otomatik oluşturma
    let finalWorkplaceId = workplaceId;
    let workplace = null;
    
    if (workplaceId) {
      workplace = await Workplace.findById(workplaceId);
      if (!workplace) {
        return notFound(res, 'İşyeri Bulunamadı');
      }
      // İşyeri şirkete ait mi kontrol et
      if (workplace.company.toString() !== companyId) {
        return errorResponse(res, { message: 'İşyeri Bu Şirkete Ait Değil' });
      }
    } else {
      // İşyeri seçilmemişse, şirketteki işyerlerini kontrol et
      const existingWorkplaces = await Workplace.find({ company: companyId, isActive: true });
      
      if (existingWorkplaces.length === 1) {
        // Tek işyeri varsa otomatik seç
        finalWorkplaceId = existingWorkplaces[0]._id;
        workplace = existingWorkplaces[0];
      } else if (existingWorkplaces.length === 0) {
        // Hiç işyeri yoksa otomatik oluştur (şirket adıyla)
        workplace = new Workplace({
          name: company.name,
          company: companyId,
          isDefault: true,
          isActive: true
        });
        await workplace.save();
        finalWorkplaceId = workplace._id;
      } else {
        // Birden fazla işyeri varsa seçim zorunlu
        return errorResponse(res, { message: 'Birden Fazla İşyeri Bulundu. Lütfen Seçim Yapınız.' });
      }
    }

    // İstisna sektör kontrolü
    const isException = await isExceptionSector(companyId);
    let warnings = [];
    
    if (!isException) {
      warnings = await validateHireDate(hireDate, companyId);
    } else {
      // İstisna sektör mesajı
      warnings.push('Bu Sektör İstisna Kapsamındadır (İnşaat/Balıkçılık).');
    }

    // Bayi onayı gerekli mi kontrol et
    const requiresDealerApproval = company.onboarding_requires_dealer_approval || false;
    const initialStatus = requiresDealerApproval ? 'PENDING' : 'PENDING';

    // Ücret kontrolü - boşsa asgari ücret (şirket ayarlarından)
    const companyWageType = company.payrollCalculationType || 'NET';
    const MINIMUM_WAGE = await minimumWageService.getMinimumWage(null, companyWageType);
    const finalUcret = ucret ? parseFloat(ucret) : MINIMUM_WAGE;

    // EmploymentPreRecord oluştur - ÖN-KAYIT (Employee oluşturulmayacak)
    const preRecord = new EmploymentPreRecord({
      processType: 'hire',
      candidateFullName: formattedFullName, // Büyük harfe çevrilmiş
      tcKimlikNo: tcKimlikNo.trim(),
      email: email || null,
      phone: phone || null,
      companyId,
      workplaceId: finalWorkplaceId,
      sectionId: sectionId || null,
      departmentId: departmentId || null,
      hireDate: new Date(hireDate),
      sgkMeslekKodu: sgkMeslekKodu || null,
      ucret: finalUcret,
      contractType: finalContractType,
      isRetired: req.body.isRetired || false,
      status: initialStatus,
      pendingDate: new Date(),
      waitingApprovalAt: new Date(), // Onaya gönderilme tarihi
      createdBy: req.user._id
    });

    await preRecord.save();

    // Populate edilmiş kaydı al
    const populatedPreRecord = await EmploymentPreRecord.findById(preRecord._id)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('companyId', 'name payrollCalculationType')
      .populate('workplaceId', 'name')
      .populate('sectionId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email');

    // WhatsApp log (şimdilik sadece log)
    console.log('Çalışana WhatsApp Üzerinden Evrak Listesi İletilmesi Gerekiyor.');

    // Ücret uyarısı
    let salaryWarning = null;
    if (!ucret) {
      salaryWarning = `Ücret Girilmediği İçin Asgari Ücret (${MINIMUM_WAGE.toLocaleString('tr-TR')} TL) Uygulanmıştır.`;
    }

    res.status(201).json({
      success: true,
      message: 'İşe Giriş Ön-Kaydı Başarıyla Oluşturuldu Ve Onaya Gönderildi',
      data: {
        preRecord: populatedPreRecord,
        warnings: salaryWarning ? [...warnings, salaryWarning] : warnings,
        salaryWarning
      }
    });
  } catch (error) {
    console.error('İşe giriş hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/terminate - İşten çıkış ön-kaydı oluştur
 */
router.post('/terminate', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), upload.single('resignationPhoto'), async (req, res) => {
  try {
    const {
      employeeId,
      companyId,
      terminationDate,
      terminationReason,
      description,
      severancePayApply,
      noticePayApply
    } = req.body;

    // Validasyon
    if (!employeeId || !companyId || !terminationDate || !terminationReason) {
      return errorResponse(res, { message: 'Tüm zorunlu alanlar doldurulmalıdır' });
    }

    if (!['istifa', 'işten çıkarma'].includes(terminationReason)) {
      return errorResponse(res, { message: 'Geçersiz çıkış nedeni' });
    }

    // Çalışan kontrolü
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Çalışan aktif mi kontrol et
    if (employee.status !== 'active') {
      return errorResponse(res, { message: 'Sadece aktif çalışanlar için işten çıkış işlemi yapılabilir' });
    }

    // Aynı çalışan için bekleyen veya onaylanmış işten çıkış talebi var mı kontrol et
    const existingTerminationRequest = await EmploymentPreRecord.findOne({
      employeeId: employeeId,
      processType: 'termination',
      status: {
        $in: ['PENDING', 'APPROVED']
      }
    });

    if (existingTerminationRequest) {
      return errorResponse(res, { message: 'Bu çalışan için zaten bir işten çıkış talebi mevcut. Bir kişi için sadece bir kez işten çıkış onaya gönderilebilir.' });
    }

    // Şirket kontrolü
    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Validasyon uyarıları
    const warnings = validateTerminationDate(terminationDate);

    // Status PENDING olarak set et (tutarlılık için)
    const initialStatus = 'PENDING';

    // Ücret bilgisini employee'dan al (yoksa asgari ücret - şirket ayarlarından)
    const companyWageType = company?.payrollCalculationType || 'NET';
    const MINIMUM_WAGE = await minimumWageService.getMinimumWage(null, companyWageType);
    const finalUcret = employee.salary ? parseFloat(employee.salary) : MINIMUM_WAGE;

    // EmploymentPreRecord oluştur - ÖN-KAYIT
    const preRecord = new EmploymentPreRecord({
      processType: 'termination',
      employeeId,
      companyId,
      workplaceId: employee.workplace,
      sectionId: employee.workplaceSection || null,
      departmentId: employee.department || null,
      terminationDate: new Date(terminationDate),
      terminationReason,
      description: description || null, // Çıkış ile ilgili detaylı açıklama
      severancePayApply: severancePayApply === 'true' || severancePayApply === true, // Kıdem tazminatı yansıtılsın
      noticePayApply: noticePayApply === 'true' || noticePayApply === true, // İhbar tazminatı yansıtılsın
      ucret: finalUcret, // Employee'dan alınan ücret
      contractType: 'BELİRSİZ_SÜRELİ', // Default, işten çıkış için önemli değil
      status: initialStatus,
      pendingDate: new Date(),
      waitingApprovalAt: new Date(), // Onaya gönderilme tarihi
      createdBy: req.user._id
    });

    // İstifa dilekçesi yükleme (opsiyonel, sadece istifa seçilmişse)
    if (terminationReason === 'istifa' && req.file) {
      const fileName = `resignation_${preRecord._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, '..', 'uploads', 'employment', 'resignations', fileName);
      fs.renameSync(req.file.path, filePath);
      
      preRecord.documents.push({
        type: 'istifa_dilekçesi',
        fileUrl: `/uploads/employment/resignations/${fileName}`
      });
    }

    await preRecord.save();

    // Populate edilmiş kaydı al
    const populatedPreRecord = await EmploymentPreRecord.findById(preRecord._id)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('companyId', 'name payrollCalculationType')
      .populate('workplaceId', 'name')
      .populate('createdBy', 'email');

    res.status(201).json({
      success: true,
      message: 'İşten Çıkış Kaydı Başarıyla Oluşturuldu Ve Onaya Gönderildi',
      data: {
        recordId: preRecord._id,
        preRecord: populatedPreRecord,
        warnings: warnings
      }
    });
  } catch (error) {
    console.error('İşten çıkış hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/employment/:employeeId - Çalışanın employment kayıtlarını getir
 */
/**
 * POST /api/employment/create - İşe giriş/çıkış kaydı oluştur (type: GIRIS veya CIKIS)
 */
router.post('/create', auth, requireRole('company_admin', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const {
      type, // 'GIRIS' veya 'CIKIS'
      fullName,
      tckn,
      sgkJobCode,
      jobName,
      email,
      phone,
      salaryAmount,
      salaryType,
      employmentType,
      startDate,
      exitDate,
      companyId,
      workplaceId, // SGK İşyeri ID (frontend'den gelebilir)
      sectionId, // Bölüm ID (opsiyonel)
      partTimeDetails // Part-time çalışma detayları
    } = req.body;

    // Type validasyonu
    if (!type || !['GIRIS', 'CIKIS'].includes(type)) {
      return errorResponse(res, { message: 'Type parametresi GIRIS veya CIKIS olmalıdır' });
    }

    // Şirket kontrolü
    if (!companyId) {
      return errorResponse(res, { message: 'Şirket Seçimi Zorunludur.' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket Bulunamadı');
    }

    // SGK İşyeri kontrolü - Workplace modelini kullan
    const existingWorkplaces = await Workplace.find({ company: companyId, isActive: true });

    let finalWorkplaceId = null;
    let finalSectionId = sectionId || null;

    // Frontend'den workplaceId geldiyse onu kullan
    if (workplaceId) {
      // Gelen ID'nin bu şirkete ait ve aktif olduğunu doğrula
      const selectedWorkplace = existingWorkplaces.find(w => w._id.toString() === workplaceId);
      if (!selectedWorkplace) {
        return errorResponse(res, { message: 'Seçilen SGK İşyeri bu şirkete ait değil veya aktif değil.' });
      }
      finalWorkplaceId = selectedWorkplace._id;
    } else if (existingWorkplaces.length === 1) {
      // Tek işyeri varsa otomatik seç
      finalWorkplaceId = existingWorkplaces[0]._id;
    } else if (existingWorkplaces.length === 0) {
      // Hiç işyeri yoksa otomatik oluştur
      const workplace = new Workplace({
        name: company.name,
        company: companyId,
        isDefault: true,
        isActive: true
      });
      await workplace.save();
      finalWorkplaceId = workplace._id;
    } else {
      // Birden fazla işyeri var ama seçim yapılmamış
      return errorResponse(res, { message: 'Birden Fazla SGK İşyeri Bulundu. Lütfen İşyeri Seçimi Yapınız.' });
    }

    // Default değerler - asgari ücret (şirket ayarlarından)
    const companyWageType = company.payrollCalculationType || 'NET';
    const MINIMUM_WAGE = await minimumWageService.getMinimumWage(null, companyWageType);
    const finalUcret = salaryAmount ? parseFloat(salaryAmount) : MINIMUM_WAGE;
    const finalSalaryType = salaryType || (company.payrollCalculationType === 'BRUT' ? 'BRUT' : 'NET');
    const finalEmploymentType = employmentType || 'BELİRSİZ_SÜRELİ';

    // İşe Giriş (GIRIS)
    if (type === 'GIRIS') {
      // Validasyon
      if (!startDate) {
        return errorResponse(res, { message: 'İşe Giriş Tarihi Zorunludur.' });
      }

      if (!fullName || !tckn) {
        return errorResponse(res, { message: 'Adı Soyadı Ve TC Kimlik No Zorunludur.' });
      }

      if (!sgkJobCode || sgkJobCode.trim() === '') {
        return errorResponse(res, { message: 'Görevi (SGK Meslek Kodu) Zorunludur.' });
      }

      if (!phone || phone.trim() === '') {
        return errorResponse(res, { message: 'Telefon Zorunludur.' });
      }

      // Ad Soyad'ı büyük harfe çevir
      const formattedFullName = (fullName || '').trim().toUpperCase();

      // TC Kimlik No validasyonu
      const cleanTCKN = (tckn || '').replace(/\D/g, '');
      if (cleanTCKN.length !== 11 || !/^\d+$/.test(cleanTCKN)) {
        return errorResponse(res, { message: 'TC Kimlik No 11 Haneli Sayı Olmalıdır' });
      }

      // Telefon formatı kontrolü (zorunlu)
      const cleanPhone = (phone || '').replace(/\D/g, '');
      if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
        return errorResponse(res, { message: 'Telefon Numarası 11 Haneli ve 0 ile Başlamalıdır' });
      }

      // İstisna sektör kontrolü
      const isException = await isExceptionSector(companyId);
      let warnings = [];
      
      if (!isException) {
        warnings = await validateHireDate(startDate, companyId);
      } else {
        warnings.push('Bu Sektör İstisna Kapsamındadır (İnşaat/Balıkçılık).');
      }

      // EmploymentPreRecord oluştur
      const preRecord = new EmploymentPreRecord({
        processType: 'hire',
        candidateFullName: formattedFullName,
        tcKimlikNo: cleanTCKN,
        email: email || null,
        phone: cleanPhone,
        companyId,
        workplaceId: finalWorkplaceId,
        sectionId: finalSectionId,
        departmentId: null,
        hireDate: new Date(startDate),
        sgkMeslekKodu: sgkJobCode || null,
        jobName: jobName || null,
        ucret: finalUcret,
        contractType: finalEmploymentType,
        isRetired: req.body.isRetired || false,
        partTimeDetails: finalEmploymentType === 'KISMİ_SÜRELİ' && partTimeDetails ? {
          weeklyHours: partTimeDetails.weeklyHours,
          workDays: partTimeDetails.workDays || [],
          dailyHours: partTimeDetails.dailyHours,
          paymentType: partTimeDetails.paymentType || 'monthly'
        } : undefined,
        status: 'PENDING',
        pendingDate: new Date(),
        waitingApprovalAt: new Date(),
        createdBy: req.user._id
      });

      await preRecord.save();

      // İş sözleşmesi ve başvuru formu Word belgesi oluştur
      let contractUrl = null;
      let applicationFormUrl = null;
      try {
        const workplace = await Workplace.findById(finalWorkplaceId);

        // İş sözleşmesi
        const contractResult = await contractService.generateContract(preRecord, company, workplace);
        contractUrl = contractResult.fileUrl;
        preRecord.documents.push({
          type: 'iş_sözleşmesi_word',
          fileUrl: contractResult.fileUrl,
          createdAt: new Date()
        });

        // İş başvuru formu
        const applicationResult = await contractService.generateJobApplicationForm(preRecord, company, workplace);
        applicationFormUrl = applicationResult.fileUrl;
        preRecord.documents.push({
          type: 'iş_başvuru_formu',
          fileUrl: applicationResult.fileUrl,
          createdAt: new Date()
        });

        await preRecord.save();
      } catch (contractError) {
        console.error('Belge oluşturma hatası:', contractError);
        // Belgeler oluşturulamazsa devam et, kayıt yine oluşturulsun
      }

      const populatedPreRecord = await EmploymentPreRecord.findById(preRecord._id)
        .populate('companyId', 'name payrollCalculationType')
        .populate('workplaceId', 'name')
        .populate('createdBy', 'email');

      res.status(201).json({
        success: true,
        message: 'İşe Giriş Kaydı Başarıyla Oluşturuldu Ve Onaya Gönderildi',
        data: {
          recordId: preRecord._id,
          preRecord: populatedPreRecord,
          warnings: warnings
        },
        contractUrl,
        applicationFormUrl
      });
    }
    // İşten Çıkış (CIKIS)
    else if (type === 'CIKIS') {
      // Validasyon
      if (!exitDate) {
        return errorResponse(res, { message: 'İşten Çıkış Tarihi Zorunludur.' });
      }

      if (!tckn) {
        return errorResponse(res, { message: 'TC Kimlik No Zorunludur (Çalışanı Bulmak İçin).' });
      }

      // TC Kimlik No ile çalışanı bul
      const cleanTCKN = (tckn || '').replace(/\D/g, '');
      const employee = await Employee.findOne({ 
        tcKimlik: cleanTCKN,
        company: companyId,
        status: 'active'
      });

      if (!employee) {
        return notFound(res, 'Aktif çalışan bulunamadı. TC Kimlik No ve şirket bilgisini kontrol ediniz.');
      }

      // Aynı çalışan için bekleyen veya onaylanmış işten çıkış talebi var mı kontrol et
      const existingTerminationRequest = await EmploymentPreRecord.findOne({
        employeeId: employee._id,
        processType: 'termination',
        status: {
          $in: ['PENDING', 'APPROVED']
        }
      });

      if (existingTerminationRequest) {
        return errorResponse(res, { message: 'Bu çalışan için zaten bir işten çıkış talebi mevcut. Bir kişi için sadece bir kez işten çıkış onaya gönderilebilir.' });
      }

      // Validasyon uyarıları
      const warnings = validateTerminationDate(exitDate);

      // EmploymentPreRecord oluştur
      const preRecord = new EmploymentPreRecord({
        processType: 'termination',
        employeeId: employee._id,
        companyId,
        workplaceId: employee.workplace || finalWorkplaceId,
        sectionId: employee.workplaceSection || null,
        departmentId: employee.department || null,
        terminationDate: new Date(exitDate),
        terminationReason: 'istifa', // Default
        status: 'PENDING',
        pendingDate: new Date(),
        waitingApprovalAt: new Date(),
        createdBy: req.user._id
      });

      await preRecord.save();

      const populatedPreRecord = await EmploymentPreRecord.findById(preRecord._id)
        .populate('employeeId', 'firstName lastName employeeNumber email')
        .populate('companyId', 'name payrollCalculationType')
        .populate('workplaceId', 'name')
        .populate('createdBy', 'email');

      res.status(201).json({
        success: true,
        message: 'İşten Çıkış Kaydı Başarıyla Oluşturuldu Ve Onaya Gönderildi',
        data: {
          recordId: preRecord._id,
          preRecord: populatedPreRecord,
          warnings: warnings
        }
      });
    }
  } catch (error) {
    console.error('İşe giriş/çıkış kaydı oluşturma hatası:', error);
    console.error('Error stack:', error.stack);
    return serverError(res, error, 'İşe giriş/çıkış kaydı oluşturulurken bir hata oluştu');
  }
});

/**
 * GET /api/employment/list - İşe giriş/çıkış işlem kayıtlarını listele (filtre: type, status)
 */
router.get('/list', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { type, status } = req.query; // type: 'GIRIS' veya 'CIKIS', status: 'PENDING', 'APPROVED', 'CANCELLED'
    let query = {};

    // İşlem tipi filtresi
    if (type === 'GIRIS') {
      query.processType = 'hire';
    } else if (type === 'CIKIS') {
      query.processType = 'termination';
    }

    // Status filtresi (mapping) - eski durumları da destekle
    if (status) {
      const statusMap = {
        'PENDING': { $in: ['PENDING', 'PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'CANCELLATION_PENDING'] },
        'BEKLIYOR': { $in: ['PENDING', 'PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'CANCELLATION_PENDING'] },
        'ONAYLANDI': 'APPROVED',
        'APPROVED': 'APPROVED',
        'IPTAL': 'CANCELLED',
        'CANCELLED': 'CANCELLED'
      };
      query.status = statusMap[status] || status;
    } else {
      // Filtresiz sorgu - tüm bekleyen durumları normalize et (PENDING olarak göster)
      // Eski durumlar da dahil
    }

    // Rol bazlı filtreleme
    if (req.user.role.name === 'super_admin') {
      // Tüm kayıtlar
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      // Bayi seviyesi - bayi'ye ait şirketlerin kayıtları
      const companies = await Company.find({ dealer: req.user.dealer });
      query.companyId = { $in: companies.map(c => c._id) };
    } else if (req.user.role.name === 'company_admin') {
      // Şirket admin - sadece kendi şirketinin kayıtları (görüntüleme)
      query.companyId = req.user.company;
    } else {
      // Diğer roller - erişim yok
      return forbidden(res, 'Yetkiniz yok');
    }

    const preRecords = await EmploymentPreRecord.find(query)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate({
        path: 'companyId',
        select: 'name payrollCalculationType dealer',
        populate: { path: 'dealer', select: 'name ikDisplayName contactPhone' }
      })
      .populate('workplaceId', 'name')
      .populate('sectionId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .sort({ createdAt: -1 });

    // Her kayıt için mesaj sayılarını al
    const recordIds = preRecords.map(r => r._id);

    // Tüm mesajları bir seferde al
    const messageCounts = await Message.aggregate([
      { $match: { relatedRequestId: { $in: recordIds }, isDeleted: false } },
      {
        $group: {
          _id: '$relatedRequestId',
          totalCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ['$isRead', false] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Mesaj sayılarını bir map'e dönüştür
    const messageCountMap = {};
    messageCounts.forEach(mc => {
      messageCountMap[mc._id.toString()] = {
        totalCount: mc.totalCount,
        unreadCount: mc.unreadCount
      };
    });

    // Eski durumları PENDING'e normalize et (geriye dönük uyumluluk)
    const normalizedRecords = preRecords.map(record => {
      const recordObj = record.toObject();
      // Eski pending durumlarını PENDING'e çevir
      if (['PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'CANCELLATION_PENDING'].includes(recordObj.status)) {
        recordObj.status = 'PENDING';
        recordObj._originalStatus = record.status; // Debug için orijinal durumu sakla
      }

      // Mesaj sayılarını ekle
      const counts = messageCountMap[record._id.toString()] || { totalCount: 0, unreadCount: 0 };
      recordObj.messageCount = counts.totalCount;
      recordObj.unreadMessageCount = counts.unreadCount;

      return recordObj;
    });

    // Sıralama: Önce onaylanmamışlar (PENDING), sonra onaylanmışlar (APPROVED)
    // Her grup içinde en yeniden eskiye doğru sırala
    const statusPriority = {
      'PENDING': 0,
      'REVISION_REQUESTED': 1,
      'APPROVED': 2,
      'REJECTED': 3,
      'CANCELLED': 4
    };

    const sortedRecords = normalizedRecords.sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;

      // Önce statüye göre sırala
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Aynı statüde olanları tarihe göre sırala (yeniden eskiye)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      data: sortedRecords
    });
  } catch (error) {
    console.error('İşe giriş/çıkış listesi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/employment/records - İşe giriş/çıkış işlem kayıtlarını listele (Geriye dönük uyumluluk)
 */
router.get('/records', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { type } = req.query; // 'GIRIS' veya 'CIKIS'
    let query = {};

    // İşlem tipi filtresi
    if (type === 'GIRIS') {
      query.processType = 'hire';
    } else if (type === 'CIKIS') {
      query.processType = 'termination';
    }

    // Rol bazlı filtreleme
    if (req.user.role.name === 'super_admin') {
      // Tüm kayıtlar
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi'ye ait şirketlerin kayıtları
      const companies = await Company.find({ dealer: req.user.dealer });
      query.companyId = { $in: companies.map(c => c._id) };
    } else {
      // Şirket admin ve resmi muhasebe/İK - sadece kendi şirketleri
      query.companyId = req.user.company;
    }

    const preRecords = await EmploymentPreRecord.find(query)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate({
        path: 'companyId',
        select: 'name dealer',
        populate: { path: 'dealer', select: 'name ikDisplayName contactPhone' }
      })
      .populate('workplaceId', 'name')
      .populate('sectionId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .sort({ createdAt: -1 });

    // Sıralama: Önce onaylanmamışlar (PENDING), sonra onaylanmışlar (APPROVED)
    const statusPriority = {
      'PENDING': 0,
      'PENDING_DEALER_APPROVAL': 0,
      'PENDING_COMPANY_APPROVAL': 0,
      'CANCELLATION_PENDING': 0,
      'REVISION_REQUESTED': 1,
      'APPROVED': 2,
      'REJECTED': 3,
      'CANCELLED': 4
    };

    const sortedRecords = preRecords.map(r => r.toObject()).sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      data: sortedRecords
    });
  } catch (error) {
    console.error('İşe giriş/çıkış listesi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/employment - Tüm işe giriş/çıkış ön-kayıtlarını listele (Geriye dönük uyumluluk)
 */
router.get('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    let query = {};

    // Rol bazlı filtreleme
    if (req.user.role.name === 'super_admin') {
      // Tüm kayıtlar
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi'ye ait şirketlerin kayıtları
      const companies = await Company.find({ dealer: req.user.dealer });
      query.companyId = { $in: companies.map(c => c._id) };
    } else {
      // Şirket admin ve resmi muhasebe/İK - sadece kendi şirketleri
      query.companyId = req.user.company;
    }

    const preRecords = await EmploymentPreRecord.find(query)
      .populate('employeeId', 'firstName lastName employeeNumber email')
      .populate('companyId', 'name payrollCalculationType')
      .populate('workplaceId', 'name')
      .populate('sectionId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .sort({ createdAt: -1 });

    // Sıralama: Önce onaylanmamışlar (PENDING), sonra onaylanmışlar (APPROVED)
    const statusPriority = {
      'PENDING': 0,
      'PENDING_DEALER_APPROVAL': 0,
      'PENDING_COMPANY_APPROVAL': 0,
      'CANCELLATION_PENDING': 0,
      'REVISION_REQUESTED': 1,
      'APPROVED': 2,
      'REJECTED': 3,
      'CANCELLED': 4
    };

    const sortedRecords = preRecords.map(r => r.toObject()).sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      data: sortedRecords
    });
  } catch (error) {
    console.error('İşe giriş/çıkış listesi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/:id/approve - İşe giriş/çıkış ön-kaydını onayla
 *
 * ONAY YETKİSİ:
 * - bayi_admin: Kendi bayisine bağlı şirketlerin taleplerini onaylar
 * - resmi_muhasebe_ik: Bayi admin'in alt kullanıcısı, kendi bayisine bağlı şirketlerin taleplerini onaylar
 * - super_admin: Tüm talepleri onaylayabilir
 *
 * NOT: company_admin sadece talep OLUŞTURUR, onaylamaz!
 */
router.post('/:id/approve', auth, requirePermission('attendance:approve'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate({
        path: 'companyId',
        select: 'name dealer payrollCalculationType autoAddApprovedEmployees',
        populate: { path: 'dealer', select: 'name ikDisplayName contactPhone' }
      })
      .populate('workplaceId', 'name')
      .populate('employeeId');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    const company = preRecord.companyId;
    
    // Company dealer bilgisini kontrol et
    if (!company || !company.dealer) {
      return errorResponse(res, { message: 'Şirket veya bayi bilgisi bulunamadı' });
    }

    // Yetki kontrolü - company_admin ONAYLAYAMAZ!
    if (req.user.role.name === 'company_admin') {
      return forbidden(res, 'Şirket adminleri işe giriş/çıkış taleplerini onaylayamaz. Bu işlem bayi yetkilisi tarafından yapılmalıdır.');
    }

    // Bayi ID'lerini güvenli şekilde al
    const getDealerId = (dealerField) => {
      if (!dealerField) return null;
      if (typeof dealerField === 'object' && dealerField._id) {
        return dealerField._id.toString();
      }
      return dealerField.toString();
    };

    // resmi_muhasebe_ik - bayi seviyesinde çalışır, kendi bayisine bağlı şirketlerin taleplerini onaylar
    if (req.user.role.name === 'resmi_muhasebe_ik') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        return forbidden(res, 'Bu şirketin taleplerini onaylama yetkiniz yok');
      }
    }
    // bayi_admin - kendi bayisine bağlı şirketlerin taleplerini onaylar
    else if (req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        return forbidden(res, 'Bu şirketin taleplerini onaylama yetkiniz yok');
      }
    }
    // super_admin - her şeyi onaylayabilir
    else if (req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Geriye dönük uyumluluk: Eski status'ları PENDING'a çevir
    const pendingStatuses = ['PENDING', 'PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'CANCELLATION_PENDING'];
    if (pendingStatuses.includes(preRecord.status) && preRecord.status !== 'PENDING') {
      console.log(`⚠️ Eski status normalize ediliyor: ${preRecord.status} -> PENDING`);
      preRecord.status = 'PENDING';
      await preRecord.save();
    }

    // Status kontrolü - sadece PENDING (veya eski pending durumları) onaylanabilir
    if (!pendingStatuses.includes(preRecord.status)) {
      return errorResponse(res, { message: 'Bu kayıt onay bekleyen durumda değil' });
    }

    // İşe giriş işlemi
    if (preRecord.processType === 'hire') {
      // KOTA KONTROLÜ - İşe giriş öncesi
      // Company ID'yi güvenli şekilde al (populated object veya ObjectId olabilir)
      const companyId = company._id ? company._id.toString() : company.toString();
      const quotaCheck = await quotaService.checkCompanyQuota(companyId);

      if (!quotaCheck.hasQuota && !quotaCheck.isLegacy) {
        return res.status(403).json({
          success: false,
          message: quotaCheck.message || 'Çalışan kotası dolmuş',
          error: 'QUOTA_EXCEEDED',
          data: {
            current: quotaCheck.current,
            limit: quotaCheck.limit,
            dealerQuota: quotaCheck.dealerQuota
          }
        });
      }

      // DUPLICATE KONTROLÜ - TC Kimlik No kontrolü
      // Aktif çalışan var mı kontrol et
      const activeEmployeeByTC = await Employee.findOne({
        company: companyId,
        tcKimlik: preRecord.tcKimlikNo,
        status: { $in: ['active', 'on_leave'] }
      });

      if (activeEmployeeByTC) {
        return res.status(400).json({
          success: false,
          message: 'Bu TC Kimlik No ile aktif bir çalışan zaten mevcut',
          error: 'DUPLICATE_TC',
          data: {
            existingEmployee: {
              _id: activeEmployeeByTC._id,
              name: `${activeEmployeeByTC.firstName} ${activeEmployeeByTC.lastName}`,
              employeeNumber: activeEmployeeByTC.employeeNumber
            }
          }
        });
      }

      // Eski çalışan kaydı var mı kontrol et (aktif olmayan)
      const previousEmployeeByTC = await Employee.findOne({
        company: companyId,
        tcKimlik: preRecord.tcKimlikNo
      });

      // Reactivation parametresi kontrolü
      const reactivateExisting = req.body.reactivateExisting === true;

      // Email kontrolü (eğer email varsa)
      if (preRecord.email) {
        const existingEmployeeByEmail = await Employee.findOne({
          company: companyId,
          email: preRecord.email.toLowerCase().trim(),
          status: { $in: ['active', 'on_leave'] }
        });

        if (existingEmployeeByEmail) {
          return res.status(400).json({
            success: false,
            message: 'Bu email adresi ile aktif bir çalışan zaten mevcut',
            error: 'DUPLICATE_EMAIL',
            data: {
              existingEmployee: {
                _id: existingEmployeeByEmail._id,
                name: `${existingEmployeeByEmail.firstName} ${existingEmployeeByEmail.lastName}`,
                employeeNumber: existingEmployeeByEmail.employeeNumber
              }
            }
          });
        }
      }

      // Şirketin otomatik çalışan ekleme ayarını kontrol et
      const autoAddEmployees = company.autoAddApprovedEmployees !== false; // Varsayılan: true

      // Eğer otomatik ekleme KAPALI ise, sadece APPROVED yap ve bildirim gönder
      if (!autoAddEmployees) {
        preRecord.status = 'APPROVED';
        preRecord.approvedAt = new Date();
        preRecord.approvedBy = req.user._id;
        preRecord.employeeCreated = false;
        await preRecord.save();

        console.log(`✅ İşe giriş onaylandı (otomatik çalışan ekleme kapalı): ${preRecord.candidateFullName}`);

        // Şirket yöneticisine bildirim gönder (çalışanı manuel eklemesi gerektiği)
        // TODO: E-posta servisi ile bildirim gönder

        return res.json({
          success: true,
          message: 'İşe giriş onaylandı. Çalışan kaydı manuel olarak eklenmelidir.',
          data: {
            preRecord,
            employeeCreated: false,
            requiresManualCreation: true
          }
        });
      }

      // Transaction KULLANILMIYOR - standalone MongoDB desteği için
      // Replica set olmadan transaction kullanılamaz, bu yüzden normal save kullanıyoruz
      let session = null;
      let useTransaction = false;

      try {
        // ÖNCE PreRecord'u APPROVED yap (transaction içinde)
        preRecord.status = 'APPROVED';
        preRecord.approvedAt = new Date();
        preRecord.approvedBy = req.user._id;
        preRecord.employeeCreated = true; // Otomatik ekleme açık olduğunda

        if (useTransaction && session) {
          await preRecord.save({ session });
        } else {
          await preRecord.save();
        }

        // SONRA Employee kaydı oluştur (transaction içinde)
        const fullName = (preRecord.candidateFullName || '').trim();
        if (!fullName) {
          throw new Error('Çalışan adı soyadı bilgisi bulunamadı');
        }

        const nameParts = fullName.split(' ').filter(part => part.length > 0);
        let firstName, lastName;

        if (nameParts.length === 1) {
          // Tek kelime varsa, hem ad hem soyad olarak kullan
          firstName = nameParts[0];
          lastName = nameParts[0]; // Soyad zorunlu olduğu için aynı değeri kullan
        } else {
          // Son kelime soyad, geri kalanlar ad
          firstName = nameParts.slice(0, -1).join(' ');
          lastName = nameParts[nameParts.length - 1];
        }

        // Email oluştur (yoksa)
        const emailBase = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase()}`;
        const email = preRecord.email || `${emailBase}@temp${Date.now()}.com`;

        // Employee number hesapla - global unique (aggregation ile en yüksek numarayı bul)
        const companyId = company?._id?.toString() || company?.toString();

        const maxResult = await Employee.aggregate([
          {
            $addFields: {
              numericEmployeeNumber: { $toInt: { $ifNull: ['$employeeNumber', '0'] } }
            }
          },
          {
            $group: {
              _id: null,
              maxNumber: { $max: '$numericEmployeeNumber' }
            }
          }
        ]);

        const maxNum = maxResult.length > 0 ? (maxResult[0].maxNumber || 0) : 0;
        let employeeNumber = String(maxNum + 1);

        // Workplace ID'yi güvenli şekilde al
        const workplaceId = preRecord.workplaceId?._id || preRecord.workplaceId;
        if (!workplaceId) {
          throw new Error('İşyeri bilgisi bulunamadı. İşe giriş talebinde SGK işyeri seçilmemiş olabilir. Lütfen talebi düzenleyerek işyeri bilgisini ekleyin.');
        }

        // TC Kimlik kontrolü
        if (!preRecord.tcKimlikNo) {
          throw new Error('TC Kimlik No bilgisi bulunamadı');
        }

        let employee;

        // REACTIVATION: Eski çalışan kaydını yeniden aktifleştir
        if (reactivateExisting && previousEmployeeByTC && !previousEmployeeByTC.isActive) {
          console.log(`🔄 Eski çalışan kaydı yeniden aktifleştiriliyor: ${previousEmployeeByTC.firstName} ${previousEmployeeByTC.lastName}`);

          employee = previousEmployeeByTC;

          // reactivateEmployee methodunu kullan
          employee.reactivateEmployee({
            hireDate: preRecord.hireDate,
            department: preRecord.departmentId || null,
            workplace: workplaceId,
            position: preRecord.sgkMeslekKodu || '',
            salary: preRecord.ucret,
            isNetSalary: (company.payrollCalculationType || 'BRUT') === 'NET',
            previousEmploymentRecordId: null // Önceki dönem için EmploymentPreRecord referansı gerekirse eklenebilir
          });

          // Email ve telefon güncellemeleri
          if (preRecord.email && preRecord.email !== employee.email) {
            employee.email = preRecord.email.toLowerCase().trim();
          }
          if (preRecord.phone && preRecord.phone !== employee.phone) {
            employee.phone = preRecord.phone;
          }

          // Employee number'ı koru (mevcut numarasını kullan)
          // employeeNumber değişmez

          if (useTransaction && session) {
            await employee.save({ session });
          } else {
            await employee.save();
          }

          console.log(`✅ Çalışan yeniden aktifleştirildi: ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) - Rehire Count: ${employee.rehireCount}`);
        }
        // YENİ KAYIT: Yeni çalışan oluştur
        else {
          console.log(`➕ Yeni çalışan kaydı oluşturuluyor: ${firstName} ${lastName}`);

          employee = new Employee({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            phone: preRecord.phone || '',
            tcKimlik: preRecord.tcKimlikNo,
            position: preRecord.sgkMeslekKodu || '',
            company: companyId,
            workplace: workplaceId,
            workplaceSection: preRecord.sectionId || null,
            department: preRecord.departmentId || null,
            employeeNumber,
            hireDate: preRecord.hireDate,
            lastHireDate: preRecord.hireDate, // İlk işe giriş
            status: 'active',
            salary: preRecord.ucret,
            isNetSalary: (company.payrollCalculationType || 'BRUT') === 'NET',
            employmentHistory: [], // Boş geçmiş
            totalWorkMonths: 0,
            rehireCount: 0
          });

          if (useTransaction && session) {
            await employee.save({ session });
          } else {
            await employee.save();
          }

          console.log(`✅ Yeni çalışan oluşturuldu: ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) - TC: ${employee.tcKimlik}`);
        }

        // PreRecord'a oluşturulan çalışan ID'sini kaydet
        preRecord.createdEmployeeId = employee._id;
        if (useTransaction && session) {
          await preRecord.save({ session });
        } else {
          await preRecord.save();
        }

        // Transaction'ı commit et (varsa)
        if (useTransaction && session) {
          await session.commitTransaction();
        }

        // Log mesajı zaten yukarıda reactivation veya yeni oluşturma sırasında yazıldı

        // User hesabı oluştur (geçici şifre ile) ve aktivasyon maili gönder
        let tempPassword = null;
        let userCreated = false;
        let userCreationError = null;
        let emailSent = false;
        let emailError = null;

        try {
          const role = await Role.findOne({ name: 'employee' });
          if (role) {
            let user = await User.findOne({ email: employee.email });
            if (!user) {
              // Geçici şifre oluştur
              tempPassword = generateTempPassword();
              const hashedPassword = await bcrypt.hash(tempPassword, 10);

              user = new User({
                email: employee.email,
                password: hashedPassword,
                role: role._id,
                company: companyId,
                isActive: true,
                mustChangePassword: true
              });
              await user.save();
              userCreated = true;
              console.log(`User hesabı oluşturuldu: ${employee.email}`);

              // Aktivasyon maili gönder
              try {
                const transporter = createTransporter();
                const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

                await transporter.sendMail({
                  from: process.env.SMTP_FROM || process.env.SMTP_USER,
                  to: employee.email,
                  subject: 'Personel Yönetim Sistemi - Hesap Bilgileriniz',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #4F46E5;">Hoş Geldiniz!</h2>
                      <p>Merhaba <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
                      <p>Personel Yönetim Sistemine kaydınız oluşturulmuştur.</p>

                      <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #374151;">Giriş Bilgileriniz:</h3>
                        <p><strong>Email:</strong> ${employee.email}</p>
                        <p><strong>Geçici Şifre:</strong> <code style="background-color: #E5E7EB; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
                      </div>

                      <p style="color: #DC2626;"><strong>Önemli:</strong> İlk girişinizde şifrenizi değiştirmeniz zorunludur.</p>

                      <p style="margin-top: 20px;">
                        <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                          Sisteme Giriş Yap
                        </a>
                      </p>

                      <p style="margin-top: 20px; color: #6B7280; font-size: 14px;">
                        Veya bu linki tarayıcınıza yapıştırın:<br>
                        <a href="${loginUrl}" style="color: #4F46E5;">${loginUrl}</a>
                      </p>

                      <hr style="margin-top: 30px; border: none; border-top: 1px solid #E5E7EB;">
                      <p style="color: #9CA3AF; font-size: 12px;">
                        Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
                      </p>
                    </div>
                  `
                });
                emailSent = true;
                console.log(`Aktivasyon maili gönderildi: ${employee.email}`);
              } catch (mailErr) {
                emailError = mailErr.message;
                console.error('Aktivasyon maili gönderme hatası:', mailErr);
                // Mail gönderilemese bile işlem devam etsin
              }
            } else {
              userCreated = true; // Zaten mevcut
              console.log(`User zaten mevcut: ${employee.email}`);
            }
          } else {
            userCreationError = 'employee rolü bulunamadı';
            console.error('employee rolü bulunamadı');
          }
        } catch (userErr) {
          userCreationError = userErr.message;
          console.error('User oluşturma hatası:', userErr);
          // User oluşturulamazsa bile işlem devam etsin
        }

        // KOTA GÜNCELLE - Çalışan oluşturulduktan sonra
        try {
          const dealerId = company.dealer?._id?.toString() || company.dealer?.toString();
          const companyId = company?._id?.toString() || company?.toString();
          if (dealerId && companyId) {
            await quotaService.incrementQuota(dealerId, companyId);
          }
        } catch (quotaError) {
          console.error('Kota güncelleme hatası:', quotaError);
          // Kota güncellenemese bile işlem devam etsin
        }

        // Uyarı mesajları oluştur
        const warnings = [];
        if (!userCreated && userCreationError) {
          warnings.push(`User hesabı oluşturulamadı: ${userCreationError}. Çalışan sisteme giriş yapamayacak.`);
        }
        if (userCreated && !emailSent && emailError) {
          warnings.push(`Aktivasyon maili gönderilemedi: ${emailError}`);
        }

        return res.json({
          success: true,
          message: reactivateExisting && previousEmployeeByTC && !previousEmployeeByTC.isActive
            ? 'İşe giriş onaylandı ve çalışan kaydı yeniden aktifleştirildi'
            : 'İşe giriş onaylandı ve çalışan kaydı oluşturuldu',
          data: {
            preRecord,
            employee,
            userCreated,
            emailSent,
            wasReactivated: reactivateExisting && previousEmployeeByTC && !previousEmployeeByTC.isActive,
            rehireCount: employee.rehireCount || 0,
            totalWorkMonths: employee.totalWorkMonths || 0
          },
          warnings: warnings.length > 0 ? warnings : undefined
        });
      } catch (error) {
        // Transaction hatası - rollback (varsa)
        if (useTransaction && session && session.inTransaction()) {
          try {
            await session.abortTransaction();
          } catch (rollbackError) {
            console.error('Rollback hatası:', rollbackError);
          }
        } else {
          // Transaction yoksa, preRecord'u geri PENDING'e çevir
          try {
            const currentPreRecord = await EmploymentPreRecord.findById(preRecord._id);
            if (currentPreRecord && currentPreRecord.status === 'APPROVED') {
              currentPreRecord.status = 'PENDING';
              currentPreRecord.approvedAt = null;
              currentPreRecord.approvedBy = null;
              await currentPreRecord.save();
              console.log('⚠️ Transaction olmadığı için preRecord geri PENDING\'e çevrildi');
            }
          } catch (revertError) {
            console.error('PreRecord geri alma hatası:', revertError);
          }
        }

        console.error('❌ İşe giriş onaylama hatası:', error);
        console.error('Error details:', {
          preRecordId: preRecord._id,
          companyId: company?._id || company,
          tcKimlik: preRecord.tcKimlikNo,
          error: error.message,
          stack: error.stack
        });

        // Hata mesajını daha açık göster
        return serverError(res, error, 'İşe giriş onaylanırken hata');
      } finally {
        // Session'ı her durumda kapat (memory leak önleme)
        if (session) {
          session.endSession();
        }
      }
    }
    // İşten çıkış işlemi
    else if (preRecord.processType === 'termination') {
      // Transaction KULLANILMIYOR - standalone MongoDB desteği için
      let terminationSession = null;
      let useTerminationTransaction = false;

      let employee = null;

      try {
        // ÖNCE PreRecord'u APPROVED yap (transaction içinde)
        preRecord.status = 'APPROVED';
        preRecord.approvedAt = new Date();
        preRecord.approvedBy = req.user._id;

        if (useTerminationTransaction && terminationSession) {
          await preRecord.save({ session: terminationSession });
        } else {
          await preRecord.save();
        }

        // Employee statüsünü güncelle (transaction içinde)
        const employeeQuery = Employee.findById(preRecord.employeeId);
        if (useTerminationTransaction && terminationSession) {
          employeeQuery.session(terminationSession);
        }
        employee = await employeeQuery;

        if (employee) {
          employee.status = 'separated';
          employee.separationDate = preRecord.terminationDate;
          employee.separationReason = preRecord.terminationReason;
          employee.exitDate = preRecord.terminationDate;
          employee.exitReason = preRecord.terminationReason;

          if (useTerminationTransaction && terminationSession) {
            await employee.save({ session: terminationSession });
          } else {
            await employee.save();
          }
        }

        // Transaction'ı commit et (varsa)
        if (useTerminationTransaction && terminationSession) {
          await terminationSession.commitTransaction();
        }

        console.log(`✅ İşten çıkış onaylandı: ${employee?.firstName} ${employee?.lastName} - TC: ${employee?.tcKimlik}`);

        // KOTA AZALT - Transaction commit edildikten sonra
        try {
          const dealerId = company.dealer?._id?.toString() || company.dealer?.toString();
          const companyIdForQuota = company?._id?.toString() || company?.toString();
          if (dealerId && companyIdForQuota) {
            await quotaService.decrementQuota(dealerId, companyIdForQuota);
          }
        } catch (quotaError) {
          console.error('Kota güncelleme hatası:', quotaError);
          // Kota güncellenemese bile işlem devam etsin
        }

        return res.json({
          success: true,
          message: 'İşten çıkış onaylandı',
          data: {
            preRecord,
            employee
          }
        });
      } catch (terminationError) {
        // Transaction hatası - rollback (varsa)
        if (useTerminationTransaction && terminationSession && terminationSession.inTransaction()) {
          try {
            await terminationSession.abortTransaction();
          } catch (rollbackError) {
            console.error('Termination rollback hatası:', rollbackError);
          }
        } else {
          // Transaction yoksa, preRecord'u geri PENDING'e çevir
          try {
            const currentPreRecord = await EmploymentPreRecord.findById(preRecord._id);
            if (currentPreRecord && currentPreRecord.status === 'APPROVED') {
              currentPreRecord.status = 'PENDING';
              currentPreRecord.approvedAt = null;
              currentPreRecord.approvedBy = null;
              await currentPreRecord.save();
              console.log('⚠️ Transaction olmadığı için termination preRecord geri PENDING\'e çevrildi');
            }
          } catch (revertError) {
            console.error('Termination PreRecord geri alma hatası:', revertError);
          }
        }

        console.error('❌ İşten çıkış onaylama hatası:', terminationError);

        // Hata mesajını daha açık göster
        return serverError(res, terminationError, 'İşten çıkış onaylanırken hata');
      } finally {
        // Session'ı her durumda kapat
        if (terminationSession) {
          terminationSession.endSession();
        }
      }
    }

    return errorResponse(res, { message: 'Geçersiz işlem türü' });
  } catch (error) {
    console.error('Onay hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/:id/reject - İşe giriş/çıkış ön-kaydını reddet (iptal et)
 */
router.post('/:id/reject', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');
    
    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }
    
    // Status kontrolü - sadece beklemede olan kayıtlar iptal edilebilir
    if (!['PENDING', 'PENDING', 'PENDING'].includes(preRecord.status)) {
      return errorResponse(res, { message: 'Bu kayıt iptal edilemez' });
    }
    
    // Yetki kontrolü
    const company = preRecord.companyId;
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      const recordCompanyId = company?._id?.toString() || company?.toString();
      if (!userCompanyId || !recordCompanyId || userCompanyId.toString() !== recordCompanyId.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const companyDealerId = company.dealer?._id?.toString() || company.dealer?.toString();
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    preRecord.status = 'CANCELLED';
    if (reason) {
      preRecord.rejectionReason = reason.trim();
    }
    preRecord.rejectedAt = new Date();
    preRecord.rejectedBy = req.user._id;
    await preRecord.save();
    
    res.json({
      success: true,
      message: 'İşlem iptal edildi',
      data: preRecord
    });
  } catch (error) {
    console.error('İptal hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/pre-record/:id/cancel - İşe giriş/çıkış ön-kaydını iptal talebi gönder
 * PENDING kayıtlar için: İptal talebi oluşturulur, bayi onaylaması gerekir
 * APPROVED kayıtlar için (aynı gün): Direkt iptal edilir (eski davranış)
 */
router.post('/pre-record/:id/cancel', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return errorResponse(res, { message: 'İptal nedeni gereklidir' });
    }

    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Sadece talebi gönderen iptal edebilir
    if (preRecord.createdBy.toString() !== req.user._id.toString()) {
      return forbidden(res, 'Sadece talebi gönderen iptal edebilir');
    }

    // Status kontrolü - PENDING, REVISION_REQUESTED veya APPROVED (aynı gün içinde) kayıtlar iptal edilebilir
    const isPending = preRecord.status === 'PENDING' || preRecord.status === 'REVISION_REQUESTED';
    const isApproved = preRecord.status === 'APPROVED';

    if (!isPending && !isApproved) {
      return errorResponse(res, { message: 'Bu kayıt iptal edilemez' });
    }

    // Eğer APPROVED ise, aynı gün içinde mi kontrol et
    if (isApproved && preRecord.approvedAt) {
      const approvedDate = new Date(preRecord.approvedAt);
      const today = new Date();

      // Tarihleri sadece gün/ay/yıl olarak karşılaştır
      const approvedDay = approvedDate.getDate();
      const approvedMonth = approvedDate.getMonth();
      const approvedYear = approvedDate.getFullYear();

      const todayDay = today.getDate();
      const todayMonth = today.getMonth();
      const todayYear = today.getFullYear();

      const isSameDay = approvedDay === todayDay &&
                       approvedMonth === todayMonth &&
                       approvedYear === todayYear;

      if (!isSameDay) {
        return errorResponse(res, { message: 'Onaylanmış kayıtlar sadece onaylandığı gün içinde iptal edilebilir' });
      }

      // APPROVED ve aynı gün ise direkt iptal et (eski davranış)
      if (preRecord.processType === 'hire') {
        const employee = await Employee.findOne({
          company: preRecord.companyId._id,
          tcKimlik: preRecord.tcKimlikNo
        });

        if (employee) {
          // Çalışanı sil
          await Employee.findByIdAndDelete(employee._id);
          console.log(`✅ İptal nedeniyle çalışan silindi: ${employee.firstName} ${employee.lastName} (TC: ${employee.tcKimlik})`);

          // User hesabını da sil (varsa)
          try {
            const user = await User.findOne({ email: employee.email });
            if (user) {
              await User.findByIdAndDelete(user._id);
              console.log(`✅ İptal nedeniyle user hesabı silindi: ${user.email}`);
            }
          } catch (userError) {
            console.error('User silme hatası:', userError);
          }

          // KOTA AZALT
          try {
            await quotaService.decrementQuota(preRecord.companyId.dealer, preRecord.companyId._id);
          } catch (quotaError) {
            console.error('Kota güncelleme hatası:', quotaError);
          }
        }
      }

      preRecord.status = 'CANCELLED';
      preRecord.rejectionReason = reason.trim();
      preRecord.rejectedAt = new Date();
      preRecord.rejectedBy = req.user._id;
      await preRecord.save();

      return res.json({
        success: true,
        message: 'İşe giriş kaydı iptal edildi ve çalışan kaydı silindi',
        data: preRecord
      });
    }

    // PENDING veya REVISION_REQUESTED ise: İptal talebi oluştur (bayi onaylaması gerekir)
    preRecord.status = 'CANCELLATION_REQUESTED';
    preRecord.cancellationRequest = {
      reason: reason.trim(),
      requestedAt: new Date(),
      requestedBy: req.user._id,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null
    };
    await preRecord.save();

    // Otomatik mesaj oluştur - bayiye iptal talebi bildirimi
    try {
      const candidateName = preRecord.candidateFullName ||
        (preRecord.employeeId ? `${preRecord.employeeId.firstName} ${preRecord.employeeId.lastName}` : 'Bilinmiyor');
      const processTypeText = preRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış';

      const message = new Message({
        type: 'EMPLOYMENT_REQUEST',
        relatedRequest: preRecord._id,
        sender: req.user._id,
        senderRole: req.user.role.name,
        recipientDealer: preRecord.companyId.dealer,
        recipientCompany: preRecord.companyId._id,
        subject: `İptal Talebi: ${candidateName} - ${processTypeText}`,
        content: `İptal Nedeni:\n${reason.trim()}\n\n---\nBu mesaj otomatik olarak oluşturulmuştur. Lütfen iptal talebini onaylayın veya reddedin.`,
        isRead: false
      });
      await message.save();
      console.log(`✅ İptal talebi mesajı oluşturuldu: ${message._id}`);
    } catch (msgError) {
      console.error('Mesaj oluşturma hatası:', msgError);
      // Mesaj hatası iptal talebini etkilemez
    }

    res.json({
      success: true,
      message: 'İptal talebi gönderildi. Bayi onayı bekleniyor.',
      data: preRecord
    });
  } catch (error) {
    console.error('İptal talebi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/:id/approve-with-declaration - İşe giriş bildirge yükleyerek onayla
 *
 * Bayi için: İşe giriş onaylarken SGK bildirge dosyası yüklemesi zorunlu
 * Bildirge yüklendikten sonra normal onay akışı çalışır
 */
router.post('/:id/approve-with-declaration', auth, requirePermission('attendance:approve'), upload.single('declaration'), async (req, res) => {
  try {
    // Dosya kontrolü
    if (!req.file) {
      return errorResponse(res, { message: 'İşe giriş bildirge dosyası zorunludur' });
    }

    // Sadece PDF kabul et
    if (req.file.mimetype !== 'application/pdf') {
      // Dosyayı sil
      fs.unlinkSync(req.file.path);
      return errorResponse(res, { message: 'Sadece PDF dosyaları yüklenebilir' });
    }

    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate({
        path: 'companyId',
        select: 'name dealer payrollCalculationType autoAddApprovedEmployees',
        populate: { path: 'dealer', select: 'name ikDisplayName contactPhone' }
      })
      .populate('workplaceId', 'name')
      .populate('employeeId');

    if (!preRecord) {
      // Dosyayı sil
      fs.unlinkSync(req.file.path);
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    const company = preRecord.companyId;

    // Company dealer bilgisini kontrol et
    if (!company || !company.dealer) {
      fs.unlinkSync(req.file.path);
      return errorResponse(res, { message: 'Şirket veya bayi bilgisi bulunamadı' });
    }

    // Yetki kontrolü - company_admin ONAYLAYAMAZ!
    if (req.user.role.name === 'company_admin') {
      fs.unlinkSync(req.file.path);
      return forbidden(res, 'Şirket adminleri işe giriş taleplerini onaylayamaz. Bu işlem bayi yetkilisi tarafından yapılmalıdır.');
    }

    // Bayi ID'lerini güvenli şekilde al
    const getDealerId = (dealerField) => {
      if (!dealerField) return null;
      if (typeof dealerField === 'object' && dealerField._id) {
        return dealerField._id.toString();
      }
      return dealerField.toString();
    };

    // resmi_muhasebe_ik - bayi seviyesinde çalışır
    if (req.user.role.name === 'resmi_muhasebe_ik') {
      if (!req.user.dealer) {
        fs.unlinkSync(req.file.path);
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        fs.unlinkSync(req.file.path);
        return forbidden(res, 'Bu şirketin taleplerini onaylama yetkiniz yok');
      }
    }
    // bayi_admin - kendi bayisine bağlı şirketlerin taleplerini onaylar
    else if (req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        fs.unlinkSync(req.file.path);
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        fs.unlinkSync(req.file.path);
        return forbidden(res, 'Bu şirketin taleplerini onaylama yetkiniz yok');
      }
    }
    // super_admin - her şeyi onaylayabilir
    else if (req.user.role.name !== 'super_admin') {
      fs.unlinkSync(req.file.path);
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Status kontrolü
    const pendingStatuses = ['PENDING', 'PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL'];
    if (!pendingStatuses.includes(preRecord.status)) {
      fs.unlinkSync(req.file.path);
      return errorResponse(res, { message: 'Bu kayıt onay bekleyen durumda değil' });
    }

    // Dosyayı kalıcı dizine taşı
    const declarationDir = path.join(__dirname, '..', 'uploads', 'employment', 'declarations');
    if (!fs.existsSync(declarationDir)) {
      fs.mkdirSync(declarationDir, { recursive: true });
    }

    const fileExt = path.extname(req.file.originalname);
    const newFileName = `declaration_${preRecord._id}_${Date.now()}${fileExt}`;
    const newFilePath = path.join(declarationDir, newFileName);

    fs.renameSync(req.file.path, newFilePath);

    // Bildirge dosyasını documents arrayine ekle (işe giriş veya işten çıkış)
    const declarationType = preRecord.processType === 'hire' ? 'işe_giriş_bildirgesi' : 'işten_çıkış_bildirgesi';
    preRecord.documents.push({
      type: declarationType,
      fileUrl: `/uploads/employment/declarations/${newFileName}`,
      createdAt: new Date()
    });

    await preRecord.save();

    const processTypeText = preRecord.processType === 'hire' ? 'İşe giriş' : 'İşten çıkış';
    console.log(`📄 ${processTypeText} bildirge yüklendi: ${newFileName} - PreRecord: ${preRecord._id}`);

    // Şimdi normal onay işlemini yap
    // Basit onay: status'u APPROVED yap, approvedAt ve approvedBy set et
    preRecord.status = 'APPROVED';
    preRecord.approvedAt = new Date();
    preRecord.approvedBy = req.user._id;
    await preRecord.save();

    console.log(`✅ ${processTypeText} onaylandı (bildirge ile): ${preRecord._id}`);

    const responseMessage = preRecord.processType === 'hire'
      ? 'İşe giriş bildirge yüklendi ve onaylandı. Çalışan kaydı oluşturulacak.'
      : 'İşten çıkış bildirge yüklendi ve onaylandı.';

    res.json({
      success: true,
      message: responseMessage,
      data: {
        preRecord: preRecord,
        declarationUrl: `/uploads/employment/declarations/${newFileName}`
      }
    });

  } catch (error) {
    // Hata durumunda dosyayı temizle
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Dosya silme hatası:', unlinkError);
      }
    }
    console.error('Bildirge ile onay hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/pre-record/:id/approve-cancellation - İptal talebini onayla (bayi için)
 */
router.post('/pre-record/:id/approve-cancellation', auth, requireRole('bayi_admin', 'super_admin'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Status kontrolü
    if (preRecord.status !== 'CANCELLATION_REQUESTED') {
      return errorResponse(res, { message: 'Bu kayıt için iptal talebi beklenmiyor' });
    }

    // Yetki kontrolü - bayi admin kendi bayisinin şirketlerine erişebilir
    const company = preRecord.companyId;
    if (req.user.role.name === 'bayi_admin') {
      const companyDealerId = company.dealer?._id?.toString() || company.dealer?.toString();
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (companyDealerId !== userDealerId) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // İptal işlemini gerçekleştir
    preRecord.status = 'CANCELLED';
    preRecord.cancellationRequest.approvedAt = new Date();
    preRecord.cancellationRequest.approvedBy = req.user._id;
    preRecord.rejectionReason = preRecord.cancellationRequest.reason;
    preRecord.rejectedAt = new Date();
    preRecord.rejectedBy = req.user._id;
    await preRecord.save();

    // Otomatik mesaj oluştur - şirkete iptal onayı bildirimi
    try {
      const candidateName = preRecord.candidateFullName ||
        (preRecord.employeeId ? `${preRecord.employeeId.firstName} ${preRecord.employeeId.lastName}` : 'Bilinmiyor');
      const processTypeText = preRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış';

      const message = new Message({
        type: 'EMPLOYMENT_REQUEST',
        relatedRequest: preRecord._id,
        sender: req.user._id,
        senderRole: req.user.role.name,
        recipientCompany: preRecord.companyId._id,
        subject: `İptal Onaylandı: ${candidateName} - ${processTypeText}`,
        content: `İptal talebiniz onaylandı.\n\nİptal Nedeni:\n${preRecord.cancellationRequest.reason}\n\n---\nBu mesaj otomatik olarak oluşturulmuştur.`,
        isRead: false
      });
      await message.save();
      console.log(`✅ İptal onay mesajı oluşturuldu: ${message._id}`);
    } catch (msgError) {
      console.error('Mesaj oluşturma hatası:', msgError);
    }

    res.json({
      success: true,
      message: 'İptal talebi onaylandı',
      data: preRecord
    });
  } catch (error) {
    console.error('İptal onay hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/pre-record/:id/reject-cancellation - İptal talebini reddet (bayi için)
 */
router.post('/pre-record/:id/reject-cancellation', auth, requireRole('bayi_admin', 'super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return errorResponse(res, { message: 'Red nedeni gereklidir' });
    }

    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Status kontrolü
    if (preRecord.status !== 'CANCELLATION_REQUESTED') {
      return errorResponse(res, { message: 'Bu kayıt için iptal talebi beklenmiyor' });
    }

    // Yetki kontrolü - bayi admin kendi bayisinin şirketlerine erişebilir
    const company = preRecord.companyId;
    if (req.user.role.name === 'bayi_admin') {
      const companyDealerId = company.dealer?._id?.toString() || company.dealer?.toString();
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (companyDealerId !== userDealerId) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // İptal talebini reddet, kaydı PENDING'e geri döndür
    preRecord.status = 'PENDING';
    preRecord.cancellationRequest.rejectedAt = new Date();
    preRecord.cancellationRequest.rejectedBy = req.user._id;
    preRecord.cancellationRequest.rejectionReason = reason.trim();
    await preRecord.save();

    // Otomatik mesaj oluştur - şirkete iptal reddi bildirimi
    try {
      const candidateName = preRecord.candidateFullName ||
        (preRecord.employeeId ? `${preRecord.employeeId.firstName} ${preRecord.employeeId.lastName}` : 'Bilinmiyor');
      const processTypeText = preRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış';

      const message = new Message({
        type: 'EMPLOYMENT_REQUEST',
        relatedRequest: preRecord._id,
        sender: req.user._id,
        senderRole: req.user.role.name,
        recipientCompany: preRecord.companyId._id,
        subject: `İptal Talebi Reddedildi: ${candidateName} - ${processTypeText}`,
        content: `İptal talebiniz reddedildi.\n\nRed Nedeni:\n${reason.trim()}\n\nOrijinal İptal Nedeni:\n${preRecord.cancellationRequest.reason}\n\n---\nBu mesaj otomatik olarak oluşturulmuştur. Kayıt tekrar "Bekliyor" durumuna alındı.`,
        isRead: false
      });
      await message.save();
      console.log(`✅ İptal red mesajı oluşturuldu: ${message._id}`);
    } catch (msgError) {
      console.error('Mesaj oluşturma hatası:', msgError);
    }

    res.json({
      success: true,
      message: 'İptal talebi reddedildi, kayıt tekrar bekliyor durumuna alındı',
      data: preRecord
    });
  } catch (error) {
    console.error('İptal red hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/:id/cancel-request - İptal talebi gönder
 */
router.post('/:id/cancel-request', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return errorResponse(res, { message: 'İptal nedeni gereklidir' });
    }

    const employment = await Employment.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!employment) {
      return notFound(res, 'İşe giriş kaydı bulunamadı');
    }

    // Sadece onaylanmamış kayıtlar için iptal talebi gönderilebilir
    if (employment.status === 'APPROVED') {
      return errorResponse(res, { message: 'Onaylanmış kayıtlar için iptal talebi gönderilemez' });
    }

    // Yetki kontrolü
    const company = employment.companyId;
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      const recordCompanyId = company?._id?.toString() || company?.toString();
      if (!userCompanyId || !recordCompanyId || userCompanyId.toString() !== recordCompanyId.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      if (company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    employment.status = 'CANCELLATION_PENDING';
    employment.cancellationRequest = {
      reason: reason.trim(),
      requestedAt: new Date(),
      requestedBy: req.user._id,
      approvers: [],
      isApproved: false
    };
    await employment.save();

    res.json({
      success: true,
      message: 'İptal talebi gönderildi',
      data: employment
    });
  } catch (error) {
    console.error('İptal talebi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/:id/approve-cancellation - İptal talebini onayla
 */
router.post('/:id/approve-cancellation', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const employment = await Employment.findById(req.params.id)
      .populate('companyId')
      .populate('employeeId');

    if (!employment) {
      return notFound(res, 'İşe giriş kaydı bulunamadı');
    }

    if (employment.status !== 'CANCELLATION_PENDING') {
      return errorResponse(res, { message: 'Bu kayıt için iptal talebi beklenmiyor' });
    }

    // Yetki kontrolü
    const company = employment.companyId;
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      const recordCompanyId = company?._id?.toString() || company?.toString();
      if (!userCompanyId || !recordCompanyId || userCompanyId.toString() !== recordCompanyId.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      if (company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // Kullanıcı daha önce onaylamış mı kontrol et
    const alreadyApproved = employment.cancellationRequest.approvers.some(
      approver => approver.userId.toString() === req.user._id.toString()
    );

    if (alreadyApproved) {
      return errorResponse(res, { message: 'Bu iptal talebini zaten onayladınız' });
    }

    // Onaylayanı ekle
    employment.cancellationRequest.approvers.push({
      userId: req.user._id,
      approvedAt: new Date()
    });

    // Tüm onaylayanlar onayladı mı kontrol et (şimdilik en az 1 onay yeterli)
    // İleride daha karmaşık onay mantığı eklenebilir
    if (employment.cancellationRequest.approvers.length >= 1) {
      employment.status = 'CANCELLED';
      employment.cancellationRequest.isApproved = true;
    }

    await employment.save();

    res.json({
      success: true,
      message: 'İptal talebi onaylandı',
      data: employment
    });
  } catch (error) {
    console.error('İptal onay hatası:', error);
    return serverError(res, error);
  }
});

router.get('/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employments = await Employment.find({ employeeId })
      .populate('companyId', 'name payrollCalculationType')
      .populate('workplaceId', 'name')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: employments
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/employment/check-employee/:preRecordId - İşe giriş kaydı için çalışan kontrolü
 * Bu kayıt için çalışan oluşturulmuş mu kontrol eder
 */
router.get('/check-employee/:preRecordId', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { preRecordId } = req.params;

    const preRecord = await EmploymentPreRecord.findById(preRecordId)
      .populate('companyId', 'name payrollCalculationType');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    if (preRecord.processType !== 'hire') {
      return res.json({
        success: true,
        hasEmployee: false,
        message: 'Bu kayıt işe giriş kaydı değil'
      });
    }

    // Rol bazlı yetki kontrolü
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      const recordCompanyId = preRecord.companyId?._id?.toString() || preRecord.companyId?.toString();
      
      if (!userCompanyId || !recordCompanyId) {
        return forbidden(res, 'Şirket bilgisi bulunamadı');
      }
      
      if (userCompanyId.toString() !== recordCompanyId.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      const companyIds = companies.map(c => c._id.toString());
      const recordCompanyId = preRecord.companyId?._id?.toString() || preRecord.companyId?.toString();
      if (!companyIds.includes(recordCompanyId.toString())) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    // TC Kimlik No ile çalışan var mı kontrol et
    const employee = await Employee.findOne({
      company: preRecord.companyId._id,
      tcKimlik: preRecord.tcKimlikNo
    }).select('_id firstName lastName employeeNumber status');

    res.json({
      success: true,
      hasEmployee: !!employee,
      employee: employee || null,
      preRecord: {
        _id: preRecord._id,
        candidateFullName: preRecord.candidateFullName,
        tcKimlikNo: preRecord.tcKimlikNo,
        companyId: preRecord.companyId._id,
        companyName: preRecord.companyId.name,
        status: preRecord.status
      }
    });
  } catch (error) {
    console.error('Çalışan kontrol hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/employment/missing-employees - Eksik çalışanları tespit et
 * Onaylanmış ama Employee oluşturulmamış kayıtları bulur
 */
router.get('/missing-employees', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    let query = {
      processType: 'hire',
      status: 'APPROVED'
    };

    // Rol bazlı filtreleme
    if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.companyId = { $in: companies.map(c => c._id) };
    }

    // Onaylanmış işe giriş kayıtlarını bul
    const approvedRecords = await EmploymentPreRecord.find(query)
      .populate('companyId', 'name payrollCalculationType')
      .populate('workplaceId', 'name')
      .sort({ approvedAt: -1 });

    const missingEmployees = [];

    for (const record of approvedRecords) {
      // Bu TC Kimlik No ile çalışan var mı kontrol et
      const existingEmployee = await Employee.findOne({
        company: record.companyId._id,
        tcKimlik: record.tcKimlikNo
      });

      if (!existingEmployee) {
        missingEmployees.push({
          preRecordId: record._id,
          candidateName: record.candidateFullName,
          tcKimlik: record.tcKimlikNo,
          email: record.email,
          companyName: record.companyId.name,
          companyId: record.companyId._id,
          workplaceName: record.workplaceId?.name,
          hireDate: record.hireDate,
          approvedAt: record.approvedAt,
          approvedBy: record.approvedBy
        });
      }
    }

    res.json({
      success: true,
      count: missingEmployees.length,
      data: missingEmployees
    });
  } catch (error) {
    console.error('Eksik çalışan tespit hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/employment/fix-missing-employee/:preRecordId - Eksik çalışanı düzelt
 * Onaylanmış ama Employee oluşturulmamış kayıt için Employee oluşturur
 */
router.post('/fix-missing-employee/:preRecordId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { preRecordId } = req.params;

    const preRecord = await EmploymentPreRecord.findById(preRecordId)
      .populate({
        path: 'companyId',
        select: 'name dealer payrollCalculationType',
        populate: { path: 'dealer', select: 'name ikDisplayName contactPhone' }
      })
      .populate('workplaceId', 'name');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    if (preRecord.processType !== 'hire') {
      return errorResponse(res, { message: 'Bu kayıt işe giriş kaydı değil' });
    }

    if (preRecord.status !== 'APPROVED') {
      return errorResponse(res, { message: 'Bu kayıt onaylanmamış' });
    }

    const company = preRecord.companyId;
    
    // İşyeri kontrolü - zorunlu alan
    if (!preRecord.workplaceId) {
      return errorResponse(res, { message: 'İşe giriş kaydında işyeri bilgisi bulunamadı. Lütfen önce işe giriş kaydını düzenleyerek işyeri bilgisini ekleyin.' });
    }

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      // Şirket admin sadece kendi şirketinin kayıtlarını düzeltebilir
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      const recordCompanyId = company?._id?.toString() || company?.toString();
      
      if (!userCompanyId || !recordCompanyId) {
        return forbidden(res, 'Şirket bilgisi bulunamadı');
      }
      
      if (userCompanyId.toString() !== recordCompanyId.toString()) {
        return forbidden(res, 'Bu şirketin kayıtlarını düzeltme yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const companyDealerId = company.dealer?._id?.toString() || company.dealer?.toString();
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (!companyDealerId || !userDealerId || companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res, 'Bu şirketin kayıtlarını düzeltme yetkiniz yok');
      }
    }

    // Company ID'yi güvenli şekilde al
    const companyId = company?._id?.toString() || company?.toString();
    if (!companyId) {
      return errorResponse(res, { message: 'Şirket bilgisi bulunamadı' });
    }

    // Zaten çalışan var mı kontrol et
    const existingEmployee = await Employee.findOne({
      company: companyId,
      tcKimlik: preRecord.tcKimlikNo
    });

    if (existingEmployee) {
      return res.json({
        success: true,
        message: 'Bu kayıt için zaten bir çalışan mevcut',
        data: {
          preRecord,
          employee: existingEmployee
        }
      });
    }

    // TRANSACTION ile atomik işlem (replica set gerekli)
    let session = null;
    let useTransaction = false;
    
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (transactionError) {
      // Transaction başlatılamazsa (standalone MongoDB), transaction olmadan devam et
      console.warn('⚠️ Transaction başlatılamadı (standalone MongoDB?), transaction olmadan devam ediliyor:', transactionError.message);
      useTransaction = false;
    }

    try {
      // Employee kaydı oluştur
      const fullName = (preRecord.candidateFullName || '').trim();
      if (!fullName) {
        throw new Error('Çalışan adı soyadı bilgisi bulunamadı');
      }

      const nameParts = fullName.split(' ').filter(part => part.length > 0);
      let firstName, lastName;

      if (nameParts.length === 1) {
        // Tek kelime varsa, hem ad hem soyad olarak kullan
        firstName = nameParts[0];
        lastName = nameParts[0];
      } else {
        // Son kelime soyad, geri kalanlar ad
        firstName = nameParts.slice(0, -1).join(' ');
        lastName = nameParts[nameParts.length - 1];
      }

      // Email oluştur (yoksa)
      const emailBase = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase()}`;
      const email = preRecord.email || `${emailBase}@temp${Date.now()}.com`;

      // TC Kimlik kontrolü
      if (!preRecord.tcKimlikNo) {
        throw new Error('TC Kimlik No bilgisi bulunamadı');
      }

      // Employee number hesapla
      const maxEmployeeQuery = Employee.findOne({ company: companyId })
        .sort({ employeeNumber: -1 })
        .select('employeeNumber');
      
      if (useTransaction && session) {
        maxEmployeeQuery.session(session);
      }
      
      const maxEmployee = await maxEmployeeQuery;

      let employeeNumber = '1';
      if (maxEmployee && maxEmployee.employeeNumber) {
        const maxNum = parseInt(maxEmployee.employeeNumber) || 0;
        employeeNumber = String(maxNum + 1);
      }

      // Workplace ID'yi güvenli şekilde al
      const workplaceId = preRecord.workplaceId?._id || preRecord.workplaceId;
      if (!workplaceId) {
        if (useTransaction && session && session.inTransaction()) {
          try {
            await session.abortTransaction();
            session.endSession();
          } catch (rollbackError) {
            console.error('Rollback hatası:', rollbackError);
          }
        }
        return errorResponse(res, { message: 'İşyeri bilgisi bulunamadı. Lütfen işe giriş kaydında işyeri bilgisinin olduğundan emin olun.' });
      }

      // Ücret kontrolü - boşsa asgari ücret (şirket ayarlarından)
      const companyWageType = company.payrollCalculationType || 'NET';
      const MINIMUM_WAGE = await minimumWageService.getMinimumWage(null, companyWageType);
      const salary = preRecord.ucret ? parseFloat(preRecord.ucret) : MINIMUM_WAGE;

      // Hire date kontrolü
      const hireDate = preRecord.hireDate ? new Date(preRecord.hireDate) : new Date();
      if (isNaN(hireDate.getTime())) {
        if (useTransaction && session && session.inTransaction()) {
          try {
            await session.abortTransaction();
            session.endSession();
          } catch (rollbackError) {
            console.error('Rollback hatası:', rollbackError);
          }
        }
        return errorResponse(res, { message: 'Geçersiz işe giriş tarihi' });
      }

      const employee = new Employee({
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        phone: preRecord.phone || '',
        tcKimlik: preRecord.tcKimlikNo,
        position: preRecord.sgkMeslekKodu || '',
        company: companyId,
        workplace: workplaceId,
        workplaceSection: preRecord.sectionId || null,
        department: preRecord.departmentId || null,
        employeeNumber,
        hireDate: hireDate,
        status: 'active',
        salary: salary,
        isNetSalary: (company.payrollCalculationType || 'BRUT') === 'NET'
      });

      if (useTransaction && session) {
        await employee.save({ session });
      } else {
        await employee.save();
      }

      // Transaction'ı commit et (varsa)
      if (useTransaction && session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`✅ Eksik çalışan düzeltildi: ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) - TC: ${employee.tcKimlik}`);

      // User hesabı oluştur (opsiyonel)
      try {
        const role = await Role.findOne({ name: 'employee' });
        if (role) {
          let user = await User.findOne({ email: employee.email });
          if (!user) {
            const tempPassword = generateTempPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            const companyIdForUser = company?._id?.toString() || company?.toString();
            user = new User({
              email: employee.email,
              password: hashedPassword,
              role: role._id,
              company: companyIdForUser,
              isActive: true,
              mustChangePassword: true
            });
            await user.save();
            console.log(`User hesabı oluşturuldu: ${employee.email}`);
          }
        }
      } catch (userError) {
        console.error('User oluşturma hatası (opsiyonel):', userError);
      }

      // KOTA GÜNCELLE
      try {
        const dealerId = company.dealer?._id?.toString() || company.dealer?.toString();
        if (dealerId && companyId) {
          await quotaService.incrementQuota(dealerId, companyId);
        }
      } catch (quotaError) {
        console.error('Kota güncelleme hatası:', quotaError);
      }

      return res.json({
        success: true,
        message: 'Eksik çalışan kaydı başarıyla oluşturuldu',
        data: {
          preRecord,
          employee
        }
      });
    } catch (error) {
      // Transaction hatası - rollback (varsa)
      if (useTransaction && session && session.inTransaction()) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch (rollbackError) {
          console.error('Rollback hatası:', rollbackError);
        }
      }
      
      console.error('❌ Eksik çalışan düzeltme hatası (rollback yapıldı):', error);
      console.error('Error details:', {
        preRecordId: preRecord._id,
        companyId: company?._id || company,
        companyName: company?.name,
        workplaceId: preRecord.workplaceId?._id || preRecord.workplaceId,
        workplaceName: preRecord.workplaceId?.name,
        tcKimlik: preRecord.tcKimlikNo,
        candidateName: preRecord.candidateFullName,
        error: error.message,
        errorName: error.name,
        stack: error.stack
      });
      
      // Daha açıklayıcı hata mesajı
      let userFriendlyMessage = 'Çalışan kaydı oluşturulurken bir hata oluştu';
      if (error.message.includes('Transaction numbers are only allowed')) {
        userFriendlyMessage = 'MongoDB transaction hatası. Lütfen MongoDB replica set kullanın veya transaction olmadan çalıştırın.';
      } else if (error.message.includes('İşyeri bilgisi')) {
        userFriendlyMessage = 'İşyeri bilgisi bulunamadı. Lütfen işe giriş kaydında işyeri bilgisinin olduğundan emin olun.';
      } else if (error.message.includes('Şirket bilgisi')) {
        userFriendlyMessage = 'Şirket bilgisi bulunamadı.';
      } else if (error.message.includes('required')) {
        userFriendlyMessage = 'Eksik bilgi: ' + error.message;
      } else if (error.message.includes('duplicate') || error.message.includes('E11000')) {
        userFriendlyMessage = 'Bu çalışan zaten mevcut. Lütfen çalışanlar listesini kontrol edin.';
      }

      return serverError(res, error, userFriendlyMessage);
    }
  } catch (error) {
    console.error('Eksik çalışan düzeltme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * DELETE /api/employment/pre-record/:id - Onaylanmış işe giriş kaydını sil
 * Sadece çalışan oluşturulmamış onaylanmış kayıtlar silinebilir
 */
router.delete('/pre-record/:id', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId', 'name dealer payrollCalculationType');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    if (preRecord.processType !== 'hire') {
      return errorResponse(res, { message: 'Bu kayıt işe giriş kaydı değil' });
    }

    if (preRecord.status !== 'APPROVED') {
      return errorResponse(res, { message: 'Sadece onaylanmış kayıtlar silinebilir' });
    }

    const company = preRecord.companyId;
    const companyId = company?._id?.toString() || company?.toString();

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      if (!userCompanyId || !companyId || userCompanyId.toString() !== companyId.toString()) {
        return forbidden(res, 'Bu şirketin kayıtlarını silme yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const companyDealerId = company.dealer?._id?.toString() || company.dealer?.toString();
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (!companyDealerId || !userDealerId || companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res, 'Bu şirketin kayıtlarını silme yetkiniz yok');
      }
    }

    // Çalışan var mı kontrol et - eğer çalışan varsa silme
    const existingEmployee = await Employee.findOne({
      company: companyId,
      tcKimlik: preRecord.tcKimlikNo
    });

    if (existingEmployee) {
      return errorResponse(res, { message: 'Bu kayıt için çalışan mevcut olduğundan silinemez. Önce çalışan kaydını silmeniz gerekir.' });
    }

    // Kaydı sil
    await EmploymentPreRecord.findByIdAndDelete(preRecord._id);

    console.log(`✅ Onaylanmış işe giriş kaydı silindi: ${preRecord.candidateFullName} (TC: ${preRecord.tcKimlikNo})`);

    res.json({
      success: true,
      message: 'İşe giriş kaydı başarıyla silindi',
      data: {
        deletedRecord: {
          _id: preRecord._id,
          candidateFullName: preRecord.candidateFullName,
          tcKimlikNo: preRecord.tcKimlikNo
        }
      }
    });
  } catch (error) {
    console.error('İşe giriş kaydı silme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /:id/request-revision
 * Bayi tarafından düzeltme talebi gönderilir
 * Yetki: bayi_admin, resmi_muhasebe_ik, super_admin
 */
router.post('/:id/request-revision', auth, requireRole('bayi_admin', 'resmi_muhasebe_ik', 'super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return errorResponse(res, { message: 'Düzeltme talebi için bir neden belirtmelisiniz' });
    }

    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate({
        path: 'companyId',
        select: 'name dealer',
        populate: { path: 'dealer', select: 'name ikDisplayName' }
      });

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Sadece PENDING durumundaki kayıtlar için düzeltme talep edilebilir
    if (preRecord.status !== 'PENDING') {
      return errorResponse(res, { message: 'Sadece bekleyen durumundaki talepler için düzeltme talep edilebilir' });
    }

    const company = preRecord.companyId;

    // Yetki kontrolü - kendi bayisine bağlı şirketler için
    const getDealerId = (dealerField) => {
      if (!dealerField) return null;
      if (typeof dealerField === 'object' && dealerField._id) {
        return dealerField._id.toString();
      }
      return dealerField.toString();
    };

    if (req.user.role.name !== 'super_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        return forbidden(res, 'Bu şirketin taleplerini düzenleme yetkiniz yok');
      }
    }

    // Düzeltme talebi bilgilerini güncelle
    preRecord.status = 'REVISION_REQUESTED';
    preRecord.revisionRequest = {
      reason: reason.trim(),
      requestedAt: new Date(),
      requestedBy: req.user._id
    };
    await preRecord.save();

    console.log(`📝 Düzeltme talebi gönderildi: ${preRecord.candidateFullName || preRecord._id} - Neden: ${reason}`);

    // TODO: Şirket yöneticisine e-posta bildirimi gönder

    res.json({
      success: true,
      message: 'Düzeltme talebi başarıyla gönderildi',
      data: preRecord
    });
  } catch (error) {
    console.error('Düzeltme talebi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /:id/resubmit
 * Şirket tarafından düzeltme yapılıp tekrar onaya gönderilir
 * Yetki: company_admin (kendi şirketi)
 */
router.post('/:id/resubmit', auth, requireRole('company_admin', 'super_admin'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId', 'name dealer');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Sadece REVISION_REQUESTED durumundaki kayıtlar tekrar gönderilebilir
    if (preRecord.status !== 'REVISION_REQUESTED') {
      return errorResponse(res, { message: 'Sadece düzeltme talep edilen kayıtlar tekrar gönderilebilir' });
    }

    // Yetki kontrolü - company_admin sadece kendi şirketinin kayıtlarını düzenleyebilir
    if (req.user.role.name === 'company_admin') {
      const userCompanyId = req.user.company?.toString() || req.user.company;
      const recordCompanyId = preRecord.companyId?._id?.toString() || preRecord.companyId?.toString();
      if (userCompanyId !== recordCompanyId) {
        return forbidden(res, 'Bu kaydı düzenleme yetkiniz yok');
      }
    }

    // Güncelleme alanlarını al
    const updateFields = ['candidateFullName', 'tcKimlikNo', 'email', 'phone', 'hireDate',
                          'sgkMeslekKodu', 'jobName', 'ucret', 'contractType', 'workplaceId',
                          'sectionId', 'departmentId'];

    for (const field of updateFields) {
      if (req.body[field] !== undefined) {
        preRecord[field] = req.body[field];
      }
    }

    // Durumu tekrar PENDING yap
    preRecord.status = 'PENDING';
    preRecord.waitingApprovalAt = new Date();
    // Önceki düzeltme talebini temizleme - geçmiş olarak sakla

    await preRecord.save();

    console.log(`🔄 Talep tekrar onaya gönderildi: ${preRecord.candidateFullName}`);

    res.json({
      success: true,
      message: 'Talep tekrar onaya gönderildi',
      data: preRecord
    });
  } catch (error) {
    console.error('Tekrar gönderme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /:id/create-employee
 * Onaylanmış ama çalışan oluşturulmamış talepler için manuel çalışan ekleme
 * Yetki: company_admin (kendi şirketi), bayi_admin, super_admin
 */
router.post('/:id/create-employee', auth, requireRole('company_admin', 'bayi_admin', 'resmi_muhasebe_ik', 'super_admin'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate({
        path: 'companyId',
        select: 'name dealer payrollCalculationType',
        populate: { path: 'dealer', select: 'name ikDisplayName' }
      })
      .populate('workplaceId', 'name');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Sadece işe giriş (hire) kayıtları için
    if (preRecord.processType !== 'hire') {
      return errorResponse(res, { message: 'Bu işlem sadece işe giriş talepleri için geçerlidir' });
    }

    // Sadece APPROVED ve employeeCreated=false olan kayıtlar için
    if (preRecord.status !== 'APPROVED') {
      return errorResponse(res, { message: 'Bu talep henüz onaylanmamış' });
    }

    if (preRecord.employeeCreated) {
      return errorResponse(res, { message: 'Bu talep için çalışan zaten oluşturulmuş' });
    }

    const company = preRecord.companyId;

    // Yetki kontrolü
    const getDealerId = (dealerField) => {
      if (!dealerField) return null;
      if (typeof dealerField === 'object' && dealerField._id) {
        return dealerField._id.toString();
      }
      return dealerField.toString();
    };

    if (req.user.role.name === 'company_admin') {
      const userCompanyId = req.user.company?.toString() || req.user.company;
      const recordCompanyId = company?._id?.toString() || company?.toString();
      if (userCompanyId !== recordCompanyId) {
        return forbidden(res, 'Bu kaydı düzenleme yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        return forbidden(res, 'Bu şirketin taleplerini düzenleme yetkiniz yok');
      }
    }

    // KOTA KONTROLÜ
    const companyId = company?._id?.toString() || company?.toString();
    const quotaCheck = await quotaService.checkCompanyQuota(companyId);

    if (!quotaCheck.hasQuota && !quotaCheck.isLegacy) {
      return res.status(403).json({
        success: false,
        message: quotaCheck.message || 'Çalışan kotası dolmuş',
        error: 'QUOTA_EXCEEDED'
      });
    }

    // DUPLICATE KONTROLÜ
    const existingEmployeeByTC = await Employee.findOne({
      company: companyId,
      tcKimlik: preRecord.tcKimlikNo,
      status: { $in: ['active', 'on_leave'] }
    });

    if (existingEmployeeByTC) {
      return res.status(400).json({
        success: false,
        message: 'Bu TC Kimlik No ile aktif bir çalışan zaten mevcut',
        error: 'DUPLICATE_TC'
      });
    }

    // Çalışan oluştur
    const fullName = (preRecord.candidateFullName || '').trim();
    const nameParts = fullName.split(' ').filter(part => part.length > 0);
    let firstName, lastName;

    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = nameParts[0];
    } else {
      firstName = nameParts.slice(0, -1).join(' ');
      lastName = nameParts[nameParts.length - 1];
    }

    const emailBase = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase()}`;
    const email = preRecord.email || `${emailBase}@temp${Date.now()}.com`;

    // Employee number hesapla
    const maxEmployee = await Employee.findOne({ company: companyId })
      .sort({ employeeNumber: -1 })
      .select('employeeNumber');

    let employeeNumber = '1';
    if (maxEmployee && maxEmployee.employeeNumber) {
      const maxNum = parseInt(maxEmployee.employeeNumber) || 0;
      employeeNumber = String(maxNum + 1);
    }

    const workplaceId = preRecord.workplaceId?._id || preRecord.workplaceId;

    const employee = new Employee({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone: preRecord.phone || '',
      tcKimlik: preRecord.tcKimlikNo,
      position: preRecord.sgkMeslekKodu || '',
      company: companyId,
      workplace: workplaceId,
      workplaceSection: preRecord.sectionId || null,
      department: preRecord.departmentId || null,
      employeeNumber,
      hireDate: preRecord.hireDate,
      status: 'active',
      salary: preRecord.ucret,
      isNetSalary: (company.payrollCalculationType || 'BRUT') === 'NET'
    });

    await employee.save();

    // PreRecord güncelle
    preRecord.employeeCreated = true;
    preRecord.createdEmployeeId = employee._id;
    await preRecord.save();

    console.log(`✅ Çalışan manuel olarak oluşturuldu: ${employee.firstName} ${employee.lastName}`);

    // User hesabı oluştur ve aktivasyon maili gönder
    let userCreated = false;
    let emailSent = false;

    try {
      const Role = require('../models/Role');
      const User = require('../models/User');
      const bcrypt = require('bcryptjs');
      const { createTransporter } = require('../services/emailService');

      const role = await Role.findOne({ name: 'employee' });
      if (role) {
        let user = await User.findOne({ email: employee.email });
        if (!user) {
          // Aktivasyon token oluştur
          const crypto = require('crypto');
          const activationToken = crypto.randomBytes(32).toString('hex');
          const hashedToken = crypto.createHash('sha256').update(activationToken).digest('hex');

          user = new User({
            email: employee.email,
            password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), // Geçici rastgele şifre
            role: role._id,
            company: companyId,
            isActive: false, // Aktivasyon yapılana kadar pasif
            activationToken: hashedToken,
            activationTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 gün
          });
          await user.save();
          userCreated = true;

          // Aktivasyon maili gönder
          try {
            const transporter = createTransporter();
            const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate/${activationToken}`;

            await transporter.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: employee.email,
              subject: 'Personel Yönetim Sistemi - Hesabınızı Aktive Edin',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #4F46E5;">Hoş Geldiniz!</h2>
                  <p>Merhaba <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
                  <p>Personel Yönetim Sistemine kaydınız oluşturulmuştur.</p>
                  <p>Hesabınızı aktive etmek ve şifrenizi belirlemek için aşağıdaki butona tıklayın:</p>

                  <p style="margin-top: 20px;">
                    <a href="${activationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Hesabımı Aktive Et
                    </a>
                  </p>

                  <p style="margin-top: 20px; color: #6B7280; font-size: 14px;">
                    Veya bu linki tarayıcınıza yapıştırın:<br>
                    <a href="${activationUrl}" style="color: #4F46E5;">${activationUrl}</a>
                  </p>

                  <p style="color: #DC2626; font-size: 14px; margin-top: 20px;">
                    <strong>Not:</strong> Bu link 7 gün geçerlidir.
                  </p>

                  <hr style="margin-top: 30px; border: none; border-top: 1px solid #E5E7EB;">
                  <p style="color: #9CA3AF; font-size: 12px;">
                    Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.
                  </p>
                </div>
              `
            });
            emailSent = true;
          } catch (mailErr) {
            console.error('Aktivasyon maili hatası:', mailErr);
          }
        }
      }
    } catch (userErr) {
      console.error('User oluşturma hatası:', userErr);
    }

    // Kota güncelle
    try {
      const dealerId = company.dealer?._id?.toString() || company.dealer?.toString();
      if (dealerId && companyId) {
        await quotaService.incrementQuota(dealerId, companyId);
      }
    } catch (quotaError) {
      console.error('Kota güncelleme hatası:', quotaError);
    }

    res.json({
      success: true,
      message: 'Çalışan başarıyla oluşturuldu',
      data: {
        preRecord,
        employee,
        userCreated,
        emailSent
      }
    });
  } catch (error) {
    console.error('Manuel çalışan oluşturma hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /check-tc
 * TC Kimlik No ile eski çalışan kaydı kontrolü
 * Yetki: company_admin, bayi_admin, resmi_muhasebe_ik, super_admin
 *
 * Body: { tcKimlikNo: string, companyId: string (optional) }
 * Response: { hasHistory: boolean, previousEmployee: Employee | null }
 */
router.post('/check-tc', auth, requireRole('company_admin', 'bayi_admin', 'resmi_muhasebe_ik', 'super_admin'), async (req, res) => {
  try {
    const { tcKimlikNo, companyId } = req.body;

    if (!tcKimlikNo || tcKimlikNo.trim().length !== 11) {
      return errorResponse(res, { message: 'Geçerli bir TC Kimlik No giriniz (11 hane)' });
    }

    // Şirket ID'yi belirle
    let targetCompanyId = companyId;

    // Company admin ise sadece kendi şirketinde arayabilir
    if (req.user.role.name === 'company_admin') {
      targetCompanyId = req.user.company?._id || req.user.company;
      if (!targetCompanyId) {
        return forbidden(res, 'Şirket bilgisi bulunamadı');
      }
    }

    // Eğer companyId verilmemişse ve user company_admin değilse hata
    if (!targetCompanyId) {
      return errorResponse(res, { message: 'Şirket ID belirtilmelidir' });
    }

    // TC Kimlik No ile eski çalışan kaydı ara
    const previousEmployee = await Employee.findOne({
      tcKimlik: tcKimlikNo,
      company: targetCompanyId
    })
      .populate('department', 'name')
      .populate('workplace', 'name')
      .select('firstName lastName email phone tcKimlik position salary isNetSalary ' +
              'hireDate exitDate lastHireDate lastTerminationDate ' +
              'employmentHistory totalWorkMonths rehireCount ' +
              'isActive status department workplace');

    if (!previousEmployee) {
      // Çalışan bulunamadı
      return res.json({
        success: true,
        hasHistory: false,
        previousEmployee: null,
        message: 'Bu TC Kimlik No ile kayıtlı çalışan bulunamadı'
      });
    }

    // Çalışan bulundu - iş geçmişi bilgilerini hazırla
    const workHistory = previousEmployee.employmentHistory.map(period => ({
      hireDate: period.hireDate,
      terminationDate: period.terminationDate,
      terminationReason: period.terminationReason,
      position: period.position,
      durationMonths: period.terminationDate
        ? Math.floor((new Date(period.terminationDate) - new Date(period.hireDate)) / (1000 * 60 * 60 * 24 * 30))
        : null
    }));

    res.json({
      success: true,
      hasHistory: true,
      previousEmployee: {
        _id: previousEmployee._id,
        fullName: `${previousEmployee.firstName} ${previousEmployee.lastName}`,
        firstName: previousEmployee.firstName,
        lastName: previousEmployee.lastName,
        email: previousEmployee.email,
        phone: previousEmployee.phone,
        tcKimlik: previousEmployee.tcKimlik,
        position: previousEmployee.position,
        salary: previousEmployee.salary,
        isNetSalary: previousEmployee.isNetSalary,
        currentStatus: previousEmployee.status,
        isActive: previousEmployee.isActive,
        lastHireDate: previousEmployee.lastHireDate,
        lastTerminationDate: previousEmployee.lastTerminationDate,
        totalWorkMonths: previousEmployee.totalWorkMonths || 0,
        rehireCount: previousEmployee.rehireCount || 0,
        department: previousEmployee.department ? {
          _id: previousEmployee.department._id,
          name: previousEmployee.department.name
        } : null,
        workplace: previousEmployee.workplace ? {
          _id: previousEmployee.workplace._id,
          name: previousEmployee.workplace.name
        } : null,
        employmentHistory: workHistory
      },
      message: previousEmployee.isActive
        ? 'Bu kişi şu anda aktif çalışan olarak kayıtlı'
        : 'Bu kişi daha önce bu şirkette çalışmış'
    });
  } catch (error) {
    console.error('TC kontrol hatası:', error);
    return serverError(res, error, 'TC kontrolü yapılırken hata oluştu');
  }
});

// ==================== RAPOR İŞLEMLERİ ====================

/**
 * GET /api/employment/reports/summary - İşe giriş/çıkış özet raporu
 */
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const { company, processType, status, startDate, endDate } = req.query;

    // Yetki kontrolü ve şirket filtresi
    const userRole = req.user.role?.name || req.user.role;
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();

    let companyFilter = {};

    if (userRole === 'super_admin') {
      // Super admin tüm şirketleri görebilir
      if (company) {
        companyFilter.companyId = company;
      }
    } else if (userRole === 'bayi_admin') {
      // Bayi admin kendi bayisine ait şirketleri görebilir
      const dealerCompanies = await Company.find({ dealer: userDealerId }).select('_id');
      const dealerCompanyIds = dealerCompanies.map(c => c._id);

      if (company) {
        // Belirtilen şirket bayinin şirketi mi kontrol et
        if (!dealerCompanyIds.some(id => id.toString() === company)) {
          return forbidden(res, 'Bu şirkete erişim yetkiniz yok');
        }
        companyFilter.companyId = company;
      } else {
        companyFilter.companyId = { $in: dealerCompanyIds };
      }
    } else {
      // Diğer roller sadece kendi şirketlerini görebilir
      companyFilter.companyId = userCompanyId;
    }

    // Tarih filtresi
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // İşe giriş kayıtları (EmploymentPreRecord)
    let hireFilter = { ...companyFilter, ...dateFilter };
    if (processType === 'termination') {
      // Sadece işten çıkış isteniyorsa işe girişleri atlat
      hireFilter._id = null; // Boş sonuç döndür
    }
    if (status) {
      hireFilter.status = status;
    }

    const hireRecords = processType !== 'termination'
      ? await EmploymentPreRecord.find(hireFilter)
          .populate('companyId', 'name')
          .sort({ createdAt: -1 })
          .lean()
      : [];

    // İşten çıkış kayıtları (Employment)
    let terminationFilter = { ...companyFilter, ...dateFilter };
    if (processType === 'hire') {
      // Sadece işe giriş isteniyorsa işten çıkışları atlat
      terminationFilter._id = null;
    }
    if (status) {
      terminationFilter.status = status;
    }

    const terminationRecords = processType !== 'hire'
      ? await Employment.find(terminationFilter)
          .populate('companyId', 'name')
          .populate('employeeId', 'firstName lastName tcKimlik')
          .sort({ createdAt: -1 })
          .lean()
      : [];

    // Verileri birleştir ve formatla
    const formattedHires = hireRecords.map(record => ({
      ...record,
      processType: 'hire',
      hireDate: record.startDate || record.hireDate
    }));

    const formattedTerminations = terminationRecords.map(record => ({
      ...record,
      processType: 'termination'
    }));

    // Birleştir ve tarihe göre sırala
    const allRecords = [...formattedHires, ...formattedTerminations]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Özet hesapla
    const summary = {
      total: allRecords.length,
      hireCount: formattedHires.length,
      terminationCount: formattedTerminations.length,
      approvedCount: allRecords.filter(r => r.status === 'APPROVED').length,
      pendingCount: allRecords.filter(r => r.status === 'PENDING').length
    };

    res.json({
      success: true,
      data: allRecords,
      summary
    });
  } catch (error) {
    console.error('İşe giriş/çıkış raporu hatası:', error);
    return serverError(res, error, 'Rapor yüklenirken hata oluştu');
  }
});

/**
 * GET /api/employment/:id/download-contract - İş sözleşmesini indir
 */
router.get('/:id/download-contract', auth, async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate('companyId')
      .populate('workplaceId');

    if (!preRecord) {
      return notFound(res, 'Kayıt bulunamadı');
    }

    // Yetki kontrolü
    const userRole = req.user.role.name;
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    const recordCompanyId = preRecord.companyId?._id?.toString() || preRecord.companyId?.toString();

    if (['company_admin', 'resmi_muhasebe_ik'].includes(userRole) && userCompanyId !== recordCompanyId) {
      return forbidden(res, 'Bu kaydı indirme yetkiniz yok');
    }

    // Sözleşme belgesi var mı kontrol et
    const contractDoc = preRecord.documents.find(d => d.type === 'iş_sözleşmesi_word');

    if (!contractDoc) {
      // Yoksa oluştur
      try {
        const contractResult = await contractService.generateContract(
          preRecord,
          preRecord.companyId,
          preRecord.workplaceId
        );

        preRecord.documents.push({
          type: 'iş_sözleşmesi_word',
          fileUrl: contractResult.fileUrl,
          createdAt: new Date()
        });
        await preRecord.save();

        // Dosyayı indir
        const filePath = path.join(__dirname, '..', contractResult.fileUrl);
        return res.download(filePath, contractResult.fileName);
      } catch (genError) {
        console.error('Sözleşme oluşturma hatası:', genError);
        return serverError(res, genError, 'Sözleşme oluşturulamadı');
      }
    }

    // Var olan dosyayı indir
    const filePath = path.join(__dirname, '..', contractDoc.fileUrl);

    // Dosya var mı kontrol et
    if (!fs.existsSync(filePath)) {
      return notFound(res, 'Sözleşme dosyası bulunamadı');
    }

    const fileName = path.basename(contractDoc.fileUrl);
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Sözleşme indirme hatası:', error);
    return serverError(res, error, 'Sözleşme indirilemedi');
  }
});

/**
 * POST /api/employment/:id/revert-approval - Onayı geri al (12 saat içinde)
 *
 * Bayi için: Yanlışlıkla yapılan onayları 12 saat içinde geri alabilir
 * - İşe giriş ve işten çıkış işlemleri için geçerli
 * - 12 saatten sonra geri alma yapılamaz
 * - Oluşturulan çalışan kaydı pasif yapılır
 */
router.post('/:id/revert-approval', auth, requirePermission('attendance:approve'), async (req, res) => {
  try {
    const preRecord = await EmploymentPreRecord.findById(req.params.id)
      .populate({
        path: 'companyId',
        select: 'name dealer',
        populate: { path: 'dealer', select: 'name' }
      })
      .populate('employeeId');

    if (!preRecord) {
      return notFound(res, 'İşlem kaydı bulunamadı');
    }

    // Sadece APPROVED durumundaki kayıtlar geri alınabilir
    if (preRecord.status !== 'APPROVED') {
      return errorResponse(res, { message: 'Sadece onaylanmış kayıtlar geri alınabilir' });
    }

    // 12 saat kontrolü
    const approvedAt = new Date(preRecord.approvedAt);
    const now = new Date();
    const hoursDiff = (now - approvedAt) / (1000 * 60 * 60);

    if (hoursDiff > 12) {
      return errorResponse(res, {
        message: `Onay geri alma süresi dolmuş. Onay ${Math.floor(hoursDiff)} saat önce yapıldı. Geri alma sadece 12 saat içinde yapılabilir.`
      });
    }

    const company = preRecord.companyId;

    // Yetki kontrolü
    const getDealerId = (dealerField) => {
      if (!dealerField) return null;
      if (typeof dealerField === 'object' && dealerField._id) {
        return dealerField._id.toString();
      }
      return dealerField.toString();
    };

    // company_admin geri alma yapamaz
    if (req.user.role.name === 'company_admin') {
      return forbidden(res, 'Şirket adminleri onay geri alma işlemi yapamaz');
    }

    // resmi_muhasebe_ik veya bayi_admin - kendi bayisine ait şirketler
    if (req.user.role.name === 'resmi_muhasebe_ik' || req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      const companyDealerId = getDealerId(company?.dealer);
      const userDealerId = getDealerId(req.user.dealer);
      if (!companyDealerId || !userDealerId || companyDealerId !== userDealerId) {
        return forbidden(res, 'Bu şirketin kayıtları için geri alma yetkiniz yok');
      }
    }
    // super_admin - her şeyi geri alabilir
    else if (req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Onayı geri al - durumu PENDING'e çevir
    const previousStatus = preRecord.status;
    const previousApprovedAt = preRecord.approvedAt;
    const previousApprovedBy = preRecord.approvedBy;

    preRecord.status = 'PENDING';
    preRecord.approvedAt = null;
    preRecord.approvedBy = null;

    // Geri alma kaydını tut
    if (!preRecord.revertHistory) {
      preRecord.revertHistory = [];
    }
    preRecord.revertHistory.push({
      revertedAt: new Date(),
      revertedBy: req.user._id,
      previousStatus: previousStatus,
      previousApprovedAt: previousApprovedAt,
      previousApprovedBy: previousApprovedBy,
      reason: req.body.reason || 'Bayi tarafından geri alındı'
    });

    await preRecord.save();

    // Eğer çalışan kaydı oluşturulmuşsa pasif yap
    let employeeDeactivated = false;
    if (preRecord.employeeId) {
      const employee = await Employee.findById(preRecord.employeeId);
      if (employee && employee.status === 'active') {
        employee.status = 'inactive';
        employee.terminationDate = new Date();
        employee.terminationReason = 'İşe giriş onayı geri alındı';
        await employee.save();
        employeeDeactivated = true;
        console.log(`👤 Çalışan kaydı pasif yapıldı: ${employee.firstName} ${employee.lastName} (${employee._id})`);
      }
    }

    console.log(`⏪ Onay geri alındı: ${preRecord._id} - ${preRecord.candidateFullName || 'N/A'} - Geri alan: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Onay başarıyla geri alındı. Kayıt tekrar onay bekliyor durumuna getirildi.',
      data: {
        preRecord: preRecord,
        employeeDeactivated: employeeDeactivated,
        revertedWithinHours: Math.round(hoursDiff * 10) / 10
      }
    });

  } catch (error) {
    console.error('Onay geri alma hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;

