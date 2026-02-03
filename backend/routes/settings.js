const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 // 500KB maksimum dosya boyutu
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

// Get company settings
router.get('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'bayi_admin'), async (req, res) => {
  try {
    let companyId = req.user.company;

    // Bayi admin için query'den companyId al
    if (req.user.role.name === 'bayi_admin' && req.query.companyId) {
      companyId = req.query.companyId;
      // Şirketin bu bayiye ait olduğunu doğrula
      const company = await Company.findById(companyId);
      if (!company || company.dealer?.toString() !== req.user.dealer?.toString()) {
        return forbidden(res, 'Bu şirkete erişim yetkiniz yok');
      }
    }

    if (!companyId) {
      return errorResponse(res, { message: 'Şirket seçilmedi' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    res.json({
      logo: company.logo,
      title: company.title,
      checkInSettings: company.checkInSettings || null
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get full company settings including advance settings (for employees)
router.get('/company', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    res.json({
      logo: company.logo,
      title: company.title,
      checkInSettings: company.checkInSettings || null,
      advanceSettings: company.advanceSettings || {
        enabled: false,
        maxAmountType: 'PERCENTAGE',
        maxAmountValue: 50,
        maxInstallments: 3,
        minWorkMonths: 3,
        requestStartDay: 1,
        monthlyRequestLimit: 1,
        approvalRequired: true,
        allowInstallments: true
      },
      leaveApprovalSettings: company.leaveApprovalSettings || null,
      advanceApprovalSettings: company.advanceApprovalSettings || null
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update company settings
router.put('/', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'bayi_admin'), upload.single('logo'), async (req, res) => {
  try {
    let companyId = req.user.company;

    // Bayi admin için body'den companyId al
    if (req.user.role.name === 'bayi_admin' && req.body.companyId) {
      companyId = req.body.companyId;
      // Şirketin bu bayiye ait olduğunu doğrula
      const checkCompany = await Company.findById(companyId);
      if (!checkCompany || checkCompany.dealer?.toString() !== req.user.dealer?.toString()) {
        return forbidden(res, 'Bu şirkete erişim yetkiniz yok');
      }
    }

    if (!companyId) {
      return errorResponse(res, { message: 'Şirket seçilmedi' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    if (req.body.title) {
      company.title = req.body.title;
    }

    if (req.file) {
      // Delete old logo if exists
      if (company.logo) {
        const oldLogoPath = path.join(__dirname, '..', 'uploads', path.basename(company.logo));
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      // Move uploaded file to uploads directory
      const fileName = `logo_${company._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, filePath);
      company.logo = `/uploads/${fileName}`;
    }

    // Update check-in settings if provided
    if (req.body.checkInSettings) {
      const checkInSettings = JSON.parse(req.body.checkInSettings || '{}');
      if (!company.checkInSettings) {
        company.checkInSettings = {};
      }
      if (checkInSettings.enabled !== undefined) company.checkInSettings.enabled = checkInSettings.enabled;
      if (checkInSettings.locationRequired !== undefined) company.checkInSettings.locationRequired = checkInSettings.locationRequired;
      if (checkInSettings.autoCheckIn !== undefined) company.checkInSettings.autoCheckIn = checkInSettings.autoCheckIn;
      if (checkInSettings.allowedLocation) {
        company.checkInSettings.allowedLocation = {
          latitude: parseFloat(checkInSettings.allowedLocation.latitude || 0),
          longitude: parseFloat(checkInSettings.allowedLocation.longitude || 0),
          radius: parseFloat(checkInSettings.allowedLocation.radius || 100)
        };
      }
    }

    await company.save();

    res.json({
      logo: company.logo,
      title: company.title,
      checkInSettings: company.checkInSettings
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

