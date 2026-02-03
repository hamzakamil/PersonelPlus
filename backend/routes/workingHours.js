const express = require('express');
const router = express.Router();
const WorkingHours = require('../models/WorkingHours');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Get all working hours
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      // Get companies of dealer
      const Company = require('../models/Company');
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      query.company = req.user.company;
    }

    const workingHours = await WorkingHours.find(query)
      .populate('company')
      .sort({ createdAt: -1 });

    res.json(workingHours);
  } catch (error) {
    return serverError(res, error);
  }
});

// Get working hours by company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Check access (dealer and company are populated objects)
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    if (req.user.role.name === 'bayi_admin' && userDealerId !== company.dealer.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        userCompanyId !== req.params.companyId) {
      return forbidden(res, 'Yetkiniz yok');
    }

    const workingHours = await WorkingHours.find({ company: req.params.companyId })
      .sort({ createdAt: -1 });

    res.json(workingHours);
  } catch (error) {
    return serverError(res, error);
  }
});

// Get single working hours
router.get('/:id', auth, async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id).populate('company');
    if (!workingHours) {
      return notFound(res, 'Çalışma saatleri bulunamadı');
    }

    // Check access (company is populated object)
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
        userCompanyId !== workingHours.company._id.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    res.json(workingHours);
  } catch (error) {
    return serverError(res, error);
  }
});

// Create working hours
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, company, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return errorResponse(res, { message: 'Ad gereklidir' });
    }

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      // bayi_admin için şirket seçilmeli veya kullanıcının şirketlerinden biri olmalı
      if (!company) {
        return errorResponse(res, { message: 'Şirket seçilmelidir' });
      }
      // Bayi admin'in bu şirkete erişimi var mı kontrol et
      const Company = require('../models/Company');
      const companyDoc = await Company.findById(company);
      if (!companyDoc) {
        return notFound(res, 'Şirket bulunamadı');
      }
      const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
      if (companyDoc.dealer.toString() !== userDealerId) {
        return forbidden(res, 'Bu şirket için yetkiniz yok');
      }
      companyId = company;
    } else if (req.user.role.name === 'super_admin') {
      if (!company) {
        return errorResponse(res, { message: 'Şirket seçilmelidir' });
      }
      companyId = company;
    }

    // Helper function to create default day structure
    const getDefaultDay = (isWorking = true) => ({
      start: '09:00',
      end: '18:00',
      isWorking,
      lunchBreak: {
        start: '12:00',
        end: '13:00'
      },
      breaks: {
        morningBreak: {
          enabled: false,
          start: '',
          end: ''
        },
        afternoonBreak: {
          enabled: false,
          start: '',
          end: ''
        }
      }
    });

    const workingHours = new WorkingHours({
      name,
      company: companyId,
      monday: monday || getDefaultDay(true),
      tuesday: tuesday || getDefaultDay(true),
      wednesday: wednesday || getDefaultDay(true),
      thursday: thursday || getDefaultDay(true),
      friday: friday || getDefaultDay(true),
      saturday: saturday || getDefaultDay(false),
      sunday: sunday || getDefaultDay(false)
    });
    await workingHours.save();

    const populated = await WorkingHours.findById(workingHours._id).populate('company');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Çalışma saatleri oluşturma hatası:', error);

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return errorResponse(res, { message: `Validasyon hatası: ${errors}` });
    }
    
    return serverError(res, error, 'Çalışma saatleri oluşturulurken bir hata oluştu');
  }
});

// Update working hours
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id);
    if (!workingHours) {
      return notFound(res, 'Çalışma saatleri bulunamadı');
    }

    // Check access (company is populated object)
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        userCompanyId !== workingHours.company.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    Object.assign(workingHours, req.body);
    await workingHours.save();

    const populated = await WorkingHours.findById(workingHours._id).populate('company');
    res.json(populated);
  } catch (error) {
    return serverError(res, error);
  }
});

// Delete working hours
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id);
    if (!workingHours) {
      return notFound(res, 'Çalışma saatleri bulunamadı');
    }

    // Check access (company is populated object)
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        userCompanyId !== workingHours.company.toString()) {
      return forbidden(res, 'Yetkiniz yok');
    }

    await WorkingHours.findByIdAndDelete(req.params.id);
    res.json({ message: 'Çalışma saatleri silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

