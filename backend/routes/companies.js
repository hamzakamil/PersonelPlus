const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const WorkingHours = require('../models/WorkingHours');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, forbidden, serverError, createdResponse } = require('../utils/responseHelper');

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Get all companies
router.get('/', auth, async (req, res) => {
  try {
    let companies;

    if (req.user.role.name === 'super_admin') {
      companies = await Company.find()
        .populate('dealer')
        .populate('activeAttendanceTemplate')
        .sort({ createdAt: -1 });
    } else if (req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        return forbidden(res, 'Bayi bilgisi bulunamadı');
      }
      companies = await Company.find({ dealer: req.user.dealer })
        .populate('dealer')
        .populate('activeAttendanceTemplate')
        .sort({ createdAt: -1 });
    } else {
      companies = await Company.find({ _id: req.user.company })
        .populate('dealer')
        .populate('activeAttendanceTemplate');
    }

    return successResponse(res, { data: companies });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get single company
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate('dealer');
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    const companyDealerId = company.dealer?._id?.toString() || company.dealer?.toString();
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();

    if (req.user.role.name === 'bayi_admin' && userDealerId !== companyDealerId) {
      return forbidden(res);
    }
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        userCompanyId !== req.params.id) {
      return forbidden(res);
    }

    return successResponse(res, { data: company });
  } catch (error) {
    return serverError(res, error);
  }
});

// Create company (super_admin or bayi_admin)
router.post('/', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const {
      name,
      address,
      dealerId,
      authorizedPersonFullName,
      authorizedPersonPhone,
      authorizedPersonEmail,
      authorizedPersonPassword,
      taxOffice,
      taxNumber,
      mersisNo,
      foundingDate
    } = req.body;

    if (!name || name.trim() === '') {
      return errorResponse(res, { message: 'Şirket ünvanı gereklidir' });
    }

    if (!authorizedPersonEmail || authorizedPersonEmail.trim() === '') {
      return errorResponse(res, { message: 'Yetkili email adresi gereklidir' });
    }

    if (!authorizedPersonPassword || authorizedPersonPassword.trim() === '') {
      return errorResponse(res, { message: 'Yetkili şifre gereklidir' });
    }

    let dealer;
    if (req.user.role.name === 'super_admin') {
      if (!dealerId) {
        return errorResponse(res, { message: 'Bayi ID gereklidir' });
      }
      dealer = dealerId;
    } else {
      if (!req.user.dealer) {
        return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
      }
      dealer = req.user.dealer;
    }

    const existingUser = await User.findOne({ email: authorizedPersonEmail.toLowerCase().trim() });
    if (existingUser) {
      return errorResponse(res, {
        message: 'Bu email adresi zaten kullanılıyor. Lütfen farklı bir email adresi girin.'
      });
    }

    const Dealer = require('../models/Dealer');
    const dealerDoc = await Dealer.findById(dealer);
    if (dealerDoc && dealerDoc.maxCompanies !== null && dealerDoc.maxCompanies !== undefined) {
      const currentCompanyCount = await Company.countDocuments({ dealer: dealer });
      if (currentCompanyCount >= dealerDoc.maxCompanies) {
        return errorResponse(res, {
          message: `Bu bayi için maksimum şirket sayısına ulaşıldı. Maksimum: ${dealerDoc.maxCompanies}, Mevcut: ${currentCompanyCount}`
        });
      }
    }

    if (!authorizedPersonFullName || authorizedPersonFullName.trim() === '') {
      return errorResponse(res, { message: 'Yetkili adı soyadı gereklidir' });
    }

    const companyData = {
      name,
      dealer,
      contactEmail: authorizedPersonEmail,
      address,
      taxOffice,
      taxNumber,
      authorizedPerson: {
        fullName: authorizedPersonFullName,
        phone: authorizedPersonPhone,
        email: authorizedPersonEmail
      }
    };

    if (mersisNo) companyData.mersisNo = mersisNo;
    if (foundingDate) companyData.foundingDate = foundingDate;

    const company = new Company(companyData);
    await company.save();

    const Workplace = require('../models/Workplace');
    const defaultWorkplace = new Workplace({
      name: 'Merkez',
      company: company._id,
      isDefault: true,
      isActive: true
    });
    await defaultWorkplace.save();

    if (authorizedPersonEmail && authorizedPersonPassword) {
      const role = await Role.findOne({ name: 'company_admin' });
      if (!role) {
        return serverError(res, new Error('company_admin rolü bulunamadı'));
      }

      const hashedPassword = await bcrypt.hash(authorizedPersonPassword, 10);

      const user = new User({
        email: authorizedPersonEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: role._id,
        company: company._id,
        isActive: true,
        mustChangePassword: true
      });

      await user.save();
    }

    const Department = require('../models/Department');

    const ofisDepartmani = await Department.create({
      name: 'Ofis Departmanı',
      company: company._id,
      workplace: defaultWorkplace._id,
      parentDepartment: null,
      description: 'Ofis ve idari işler departmanı',
      isActive: true,
      isDefault: true
    });

    await Department.create({
      name: 'Muhasebe Bölümü',
      company: company._id,
      workplace: defaultWorkplace._id,
      parentDepartment: ofisDepartmani._id,
      description: 'Muhasebe ve finans bölümü',
      isActive: true,
      isDefault: true
    });

    await Department.create({
      name: 'Pazarlama Satış Departmanı',
      company: company._id,
      workplace: defaultWorkplace._id,
      parentDepartment: null,
      description: 'Pazarlama ve satış departmanı',
      isActive: true,
      isDefault: true
    });

    const uretimDepartmani = await Department.create({
      name: 'Üretim Departmanı',
      company: company._id,
      workplace: defaultWorkplace._id,
      parentDepartment: null,
      description: 'Üretim ve imalat departmanı',
      isActive: true,
      isDefault: true
    });

    const montajBolumu = await Department.create({
      name: 'Montaj Bölümü',
      company: company._id,
      workplace: defaultWorkplace._id,
      parentDepartment: uretimDepartmani._id,
      description: 'Montaj ve birleştirme bölümü',
      isActive: true,
      isDefault: true
    });

    await Department.create({
      name: 'Paketleme Birimi',
      company: company._id,
      workplace: defaultWorkplace._id,
      parentDepartment: montajBolumu._id,
      description: 'Paketleme ve ambalaj birimi',
      isActive: true,
      isDefault: true
    });

    const { initializeCompanyLeaveTypes } = require('../services/leaveTypeInitializer');
    try {
      await initializeCompanyLeaveTypes(company._id);
    } catch (leaveTypeError) {
      console.error('Şirket izin türleri oluşturulurken hata:', leaveTypeError);
    }

    const { initializeDefaultPermits } = require('../services/permissionInitializer');
    try {
      await initializeDefaultPermits(company._id);
    } catch (permitError) {
      console.error('Varsayılan izin türleri oluşturulurken hata:', permitError);
    }

    const populated = await Company.findById(company._id)
      .populate('dealer')
      .populate('activeAttendanceTemplate');

    return createdResponse(res, { data: populated, message: 'Şirket başarıyla oluşturuldu' });
  } catch (error) {
    console.error('Şirket oluşturma hatası:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return errorResponse(res, { message: 'Validasyon hatası', errors, statusCode: 422 });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, {
        message: field === 'email'
          ? 'Bu email adresi zaten kullanılıyor.'
          : `${field} alanı için bu değer zaten kullanılıyor.`
      });
    }

    return serverError(res, error);
  }
});

// Update company
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    const userRole = req.user.role.name;
    const userDealer = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    const companyDealer = company.dealer?._id?.toString() || company.dealer?.toString();
    const userCompany = req.user.company?._id?.toString() || req.user.company?.toString();

    if (userRole === 'bayi_admin' || userRole === 'resmi_muhasebe_ik') {
      if (!userDealer || !companyDealer || userDealer !== companyDealer) {
        return forbidden(res);
      }
    } else if (userRole === 'company_admin') {
      if (!userCompany || userCompany !== req.params.id) {
        return forbidden(res);
      }
    }

    const { name, address, taxOffice, taxNumber, mersisNo, foundingDate, authorizedPersonFullName, authorizedPersonPhone,
            authorizedPersonEmail, advanceSettings, leaveApprovalSettings, advanceApprovalSettings,
            overtimeApprovalSettings, approvalMode } = req.body;

    if (name !== undefined) company.name = name;
    if (address !== undefined) company.address = address;
    if (taxOffice !== undefined) company.taxOffice = taxOffice;
    if (taxNumber !== undefined) company.taxNumber = taxNumber;
    if (mersisNo !== undefined) company.mersisNo = mersisNo;
    if (foundingDate !== undefined) company.foundingDate = foundingDate;

    if (authorizedPersonFullName !== undefined || authorizedPersonPhone !== undefined || authorizedPersonEmail !== undefined) {
      if (!company.authorizedPerson) {
        company.authorizedPerson = {};
      }
      if (authorizedPersonFullName !== undefined) {
        company.authorizedPerson.fullName = authorizedPersonFullName;
      }
      if (authorizedPersonPhone !== undefined) {
        company.authorizedPerson.phone = authorizedPersonPhone;
      }

      if (authorizedPersonEmail !== undefined && (userRole === 'super_admin' || userRole === 'bayi_admin')) {
        const newEmail = authorizedPersonEmail.toLowerCase().trim();
        const oldEmail = company.authorizedPerson?.email?.toLowerCase()?.trim() || company.contactEmail?.toLowerCase()?.trim();

        if (newEmail && newEmail !== oldEmail) {
          const existingUser = await User.findOne({
            email: newEmail,
            company: { $ne: company._id }
          });

          if (existingUser) {
            return errorResponse(res, {
              message: 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor.'
            });
          }

          const companyAdminUser = await User.findOne({
            company: company._id,
            email: oldEmail
          });

          if (companyAdminUser) {
            companyAdminUser.email = newEmail;
            await companyAdminUser.save();
          }

          company.authorizedPerson.email = newEmail;
          company.contactEmail = newEmail;
        }
      }
    }

    if (advanceSettings !== undefined) {
      company.advanceSettings = advanceSettings;
    }

    if (leaveApprovalSettings !== undefined) {
      company.leaveApprovalSettings = leaveApprovalSettings;
    }

    if (advanceApprovalSettings !== undefined) {
      company.advanceApprovalSettings = advanceApprovalSettings;
    }

    if (overtimeApprovalSettings !== undefined) {
      company.overtimeApprovalSettings = overtimeApprovalSettings;
    }

    if (approvalMode !== undefined) {
      company.approvalMode = approvalMode;
    }

    await company.save();

    const populated = await Company.findById(company._id)
      .populate('dealer')
      .populate('activeAttendanceTemplate');

    return successResponse(res, { data: populated, message: 'Şirket güncellendi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// PUT /api/companies/:id/payroll-calculation-type
router.put('/:id/payroll-calculation-type', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();

    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (userCompanyId !== company._id.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'bayi_admin') {
      if (company.dealer?.toString() !== userDealerId) {
        return forbidden(res);
      }
    }

    const { payrollCalculationType } = req.body;

    if (!payrollCalculationType || !['NET', 'BRUT'].includes(payrollCalculationType)) {
      return errorResponse(res, {
        message: 'Geçerli bir ücret hesaplama tipi seçiniz (NET veya BRUT)'
      });
    }

    company.payrollCalculationType = payrollCalculationType;
    await company.save();

    return successResponse(res, {
      data: { payrollCalculationType: company.payrollCalculationType },
      message: 'Ücret hesaplama tipi güncellendi'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

router.put('/:id/attendance-template', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();

    if (req.user.role.name === 'bayi_admin' && userDealerId !== company.dealer?.toString()) {
      return forbidden(res);
    }
    if ((req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') && userCompanyId !== req.params.id) {
      return forbidden(res);
    }

    const { templateId } = req.body;

    if (templateId) {
      const AttendanceTemplate = require('../models/AttendanceTemplate');
      const template = await AttendanceTemplate.findById(templateId);
      if (!template) {
        return notFound(res, 'Şablon bulunamadı');
      }

      if (!template.isDefault && template.company && template.company.toString() !== req.params.id) {
        return forbidden(res, 'Bu şablon bu şirket için kullanılamaz');
      }
    }

    company.activeAttendanceTemplate = templateId || null;
    await company.save();

    const populated = await Company.findById(company._id).populate('activeAttendanceTemplate');
    return successResponse(res, { data: populated });
  } catch (error) {
    return serverError(res, error);
  }
});

// Set/Reset company admin password
router.put('/:id/reset-password', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    if (req.user.role.name === 'bayi_admin') {
      const userDealer = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      const companyDealer = company.dealer?._id?.toString() || company.dealer?.toString();
      if (userDealer !== companyDealer) {
        return forbidden(res);
      }
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, { message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const companyEmail = company.authorizedPerson?.email || company.contactEmail;
    let companyAdminUser = await User.findOne({
      company: company._id,
      email: companyEmail?.toLowerCase()
    });

    if (!companyAdminUser) {
      const role = await Role.findOne({ name: 'company_admin' });
      if (!role) {
        return serverError(res, new Error('company_admin rolü bulunamadı'));
      }

      let userEmail = companyEmail;
      if (!userEmail || userEmail.includes('@placeholder.com')) {
        if (company.taxNumber) {
          userEmail = `${company.taxNumber.trim()}@personelplus.com`;
        } else {
          return errorResponse(res, {
            message: 'Şirketin email adresi veya vergi numarası tanımlı değil.'
          });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      companyAdminUser = new User({
        email: userEmail.toLowerCase(),
        password: hashedPassword,
        role: role._id,
        company: company._id,
        isActive: true,
        mustChangePassword: true
      });

      await companyAdminUser.save();

      if (!company.authorizedPerson) {
        company.authorizedPerson = {};
      }
      company.authorizedPerson.email = userEmail;
      company.contactEmail = userEmail;
      company.isActive = true;
      company.isActivated = true;
      await company.save();

      return successResponse(res, {
        data: { username: userEmail, mustChangePassword: true },
        message: 'Kullanıcı oluşturuldu ve şifre belirlendi'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    companyAdminUser.password = hashedPassword;
    companyAdminUser.mustChangePassword = true;
    await companyAdminUser.save();

    return successResponse(res, {
      data: { username: companyAdminUser.email, mustChangePassword: true },
      message: 'Şifre başarıyla güncellendi'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Delete company
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer.toString()) {
      return forbidden(res);
    }

    await Company.findByIdAndDelete(req.params.id);
    return successResponse(res, { message: 'Şirket silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Bulk create company
router.post('/bulk', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { name, dealerId, taxOffice, taxNumber, mersisNo, foundingDate } = req.body;

    if (!name || name.trim() === '') {
      return errorResponse(res, { message: 'Şirket ünvanı gereklidir' });
    }

    let dealer;
    if (req.user.role.name === 'super_admin') {
      if (!dealerId) {
        return errorResponse(res, { message: 'Bayi ID gereklidir' });
      }
      dealer = dealerId;
    } else {
      if (!req.user.dealer) {
        return errorResponse(res, { message: 'Bayi bilgisi bulunamadı' });
      }
      dealer = req.user.dealer;
    }

    const Dealer = require('../models/Dealer');
    const dealerDoc = await Dealer.findById(dealer);
    if (dealerDoc && dealerDoc.maxCompanies !== null && dealerDoc.maxCompanies !== undefined) {
      const currentCompanyCount = await Company.countDocuments({ dealer: dealer });
      if (currentCompanyCount >= dealerDoc.maxCompanies) {
        return errorResponse(res, {
          message: `Maksimum şirket sayısına ulaşıldı. Maksimum: ${dealerDoc.maxCompanies}, Mevcut: ${currentCompanyCount}`
        });
      }
    }

    const userEmail = taxNumber ? `${taxNumber.trim()}@personelplus.com` : `bulk-${Date.now()}@placeholder.com`;
    const defaultPassword = '123456';

    const existingUser = await User.findOne({ email: userEmail.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, {
        message: `Bu vergi/TC kimlik numarası (${taxNumber}) ile zaten bir şirket kayıtlı.`
      });
    }

    const companyData = {
      name,
      dealer,
      taxOffice: taxOffice || '',
      taxNumber: taxNumber || '',
      contactEmail: userEmail,
      isActive: true,
      isActivated: true,
      authorizedPerson: { email: userEmail }
    };

    if (mersisNo) companyData.mersisNo = mersisNo;
    if (foundingDate) companyData.foundingDate = new Date(foundingDate);

    const company = new Company(companyData);
    await company.save();

    const Workplace = require('../models/Workplace');
    const defaultWorkplace = new Workplace({
      name: 'Merkez',
      company: company._id,
      isDefault: true,
      isActive: true
    });
    await defaultWorkplace.save();

    const Department = require('../models/Department');

    const ofisDepartmani = await Department.create({
      name: 'Ofis Departmanı',
      company: company._id,
      parentDepartment: null,
      isActive: true,
      isDefault: true
    });

    await Department.create({
      name: 'Muhasebe Bölümü',
      company: company._id,
      parentDepartment: ofisDepartmani._id,
      isActive: true,
      isDefault: true
    });

    await Department.create({
      name: 'Pazarlama Satış Departmanı',
      company: company._id,
      parentDepartment: null,
      isActive: true,
      isDefault: true
    });

    const uretimDepartmani = await Department.create({
      name: 'Üretim Departmanı',
      company: company._id,
      parentDepartment: null,
      isActive: true,
      isDefault: true
    });

    await Department.create({
      name: 'Montaj Bölümü',
      company: company._id,
      parentDepartment: uretimDepartmani._id,
      isActive: true,
      isDefault: true
    });

    const role = await Role.findOne({ name: 'company_admin' });
    if (role && taxNumber) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const user = new User({
        email: userEmail.toLowerCase(),
        password: hashedPassword,
        role: role._id,
        company: company._id,
        isActive: true,
        mustChangePassword: true
      });

      await user.save();
    }

    return createdResponse(res, {
      data: {
        company,
        credentials: taxNumber ? {
          username: userEmail,
          password: defaultPassword,
          note: 'İlk girişte şifre değiştirilmesi zorunludur'
        } : null
      },
      message: 'Şirket ve kullanıcı oluşturuldu'
    });

  } catch (error) {
    console.error('Bulk company creation error:', error);
    return serverError(res, error);
  }
});

module.exports = router;
