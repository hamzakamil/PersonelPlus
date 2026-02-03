const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Day names mapping (0=Sunday, 1=Monday, ..., 6=Saturday)
const DAY_NAMES = {
  0: 'Pazar',
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi'
};

// Get weekend settings for company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Check access
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        userCompanyId !== req.params.companyId) {
      return forbidden(res);
    }

    const weekendDays = company.leaveSettings?.weekendDays || [0]; // Default: Sunday
    const weekendLeaveDeduction = company.leaveSettings?.weekendLeaveDeduction || 'none';
    const primaryWeekendDay = company.leaveSettings?.primaryWeekendDay ?? weekendDays[0] ?? 0;

    res.json({
      companyId: company._id,
      weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day]),
      weekendLeaveDeduction,
      primaryWeekendDay
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update weekend settings for company
router.put('/company/:companyId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin'), async (req, res) => {
  try {
    const { weekendDays, weekendLeaveDeduction, primaryWeekendDay } = req.body;

    if (!Array.isArray(weekendDays) || weekendDays.length === 0) {
      return errorResponse(res, { message: 'Hafta tatili gunleri secilmelidir' });
    }

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return notFound(res, 'Sirket bulunamadi');
    }

    // Check access
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        userCompanyId !== req.params.companyId) {
      return forbidden(res);
    }

    if (!company.leaveSettings) {
      company.leaveSettings = {};
    }
    company.leaveSettings.weekendDays = weekendDays;

    // Yillik izin hesaplama ayarlari
    if (weekendLeaveDeduction !== undefined) {
      company.leaveSettings.weekendLeaveDeduction = weekendLeaveDeduction;
    }
    if (primaryWeekendDay !== undefined) {
      company.leaveSettings.primaryWeekendDay = primaryWeekendDay;
    }

    await company.save();

    res.json({
      companyId: company._id,
      weekendDays: company.leaveSettings.weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day]),
      weekendLeaveDeduction: company.leaveSettings.weekendLeaveDeduction || 'none',
      primaryWeekendDay: company.leaveSettings.primaryWeekendDay ?? weekendDays[0] ?? 0
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get weekend settings for department
router.get('/department/:departmentId', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.departmentId).populate('company');
    if (!department) {
      return notFound(res, 'Departman bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== department.company._id.toString()) {
      return forbidden(res);
    }

    // Get from department or company default
    const weekendDays = department.weekendDays || department.company.leaveSettings?.weekendDays || [0];
    
    res.json({
      departmentId: department._id,
      weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day]),
      source: department.weekendDays ? 'department' : 'company'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update weekend settings for department
router.put('/department/:departmentId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { weekendDays } = req.body;

    const department = await Department.findById(req.params.departmentId).populate('company');
    if (!department) {
      return notFound(res, 'Departman bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== department.company._id.toString()) {
      return forbidden(res);
    }

    if (weekendDays && Array.isArray(weekendDays) && weekendDays.length > 0) {
      department.weekendDays = weekendDays;
    } else {
      department.weekendDays = null; // Use company default
    }
    
    await department.save();

    const finalWeekendDays = department.weekendDays || department.company.leaveSettings?.weekendDays || [0];
    
    res.json({
      departmentId: department._id,
      weekendDays: finalWeekendDays,
      weekendDayNames: finalWeekendDays.map(day => DAY_NAMES[day]),
      source: department.weekendDays ? 'department' : 'company'
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get weekend settings for employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('department')
      .populate('company');
    
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return forbidden(res);
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
               req.user.company.toString() !== employee.company._id.toString()) {
      return forbidden(res);
    }

    // Get from employee, department, or company (in that order)
    let weekendDays = employee.weekendDays;
    let source = 'employee';
    
    if (!weekendDays || weekendDays.length === 0) {
      weekendDays = employee.department?.weekendDays;
      source = 'department';
    }
    
    if (!weekendDays || weekendDays.length === 0) {
      weekendDays = employee.company?.leaveSettings?.weekendDays || [0];
      source = 'company';
    }
    
    res.json({
      employeeId: employee._id,
      weekendDays,
      weekendDayNames: weekendDays.map(day => DAY_NAMES[day]),
      source
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update weekend settings for employee
router.put('/employee/:employeeId', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { weekendDays } = req.body;

    const employee = await Employee.findById(req.params.employeeId)
      .populate('department')
      .populate('company');
    
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== employee.company._id.toString()) {
      return forbidden(res);
    }

    if (weekendDays && Array.isArray(weekendDays) && weekendDays.length > 0) {
      employee.weekendDays = weekendDays;
    } else {
      employee.weekendDays = null; // Use department/company default
    }
    
    await employee.save();

    // Get final weekend days (employee -> department -> company)
    let finalWeekendDays = employee.weekendDays;
    let source = 'employee';
    
    if (!finalWeekendDays || finalWeekendDays.length === 0) {
      finalWeekendDays = employee.department?.weekendDays;
      source = 'department';
    }
    
    if (!finalWeekendDays || finalWeekendDays.length === 0) {
      finalWeekendDays = employee.company?.leaveSettings?.weekendDays || [0];
      source = 'company';
    }
    
    res.json({
      employeeId: employee._id,
      weekendDays: finalWeekendDays,
      weekendDayNames: finalWeekendDays.map(day => DAY_NAMES[day]),
      source
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;






