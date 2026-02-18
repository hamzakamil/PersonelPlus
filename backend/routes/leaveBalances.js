const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { calculateAnnualLeaveDays, calculateSeniority, calculateAge } = require('../utils/leaveCalculator');
const { getEmployeeLeaveBalance, getLeaveBalanceFromLedger, recalculateBalances, ensureEntitlementEntries } = require('./leaveLedger');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Get leave balances (list)
router.get('/', auth, async (req, res) => {
  try {
    let employeeQuery = {};
    const { employee, company } = req.query;

    if (employee) {
      employeeQuery._id = employee;
    } else if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        employeeQuery._id = emp._id;
      } else {
        return notFound(res, 'Çalışan bulunamadı');
      }
    }

    if (company) {
      employeeQuery.company = company;
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      employeeQuery.company = req.user.company;
    }

    // Sadece ismi olan çalışanları getir
    employeeQuery.$or = [
      { firstName: { $exists: true, $nin: ['', null] } },
      { lastName: { $exists: true, $nin: ['', null] } }
    ];

    // Çalışanları bul
    const employees = await Employee.find(employeeQuery)
      .populate('company', 'name')
      .sort({ firstName: 1 });

    // Her çalışan için bakiye hesapla
    const balances = [];
    for (const emp of employees) {
      const balance = await getEmployeeLeaveBalance(emp._id);
      if (balance) {
        balances.push({
          _id: emp._id,
          ...balance,
          employee: {
            _id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            employeeNumber: emp.employeeNumber,
            hireDate: emp.hireDate,
            birthDate: emp.birthDate
          },
          company: emp.company,
        });
      }
    }

    res.json(balances);
  } catch (error) {
    return serverError(res, error);
  }
});


// Get leave balance for logged-in employee
router.get('/employee/me', auth, async (req, res) => {
  try {
    // Sadece employee kendi bilgisine erişsin
    if (req.user.role.name !== 'employee') {
      return forbidden(res, 'Yetkiniz yok');
    }

    // Giriş yapan kullanıcıya ait çalışan kaydı
    const employee = await Employee.findOne({ email: req.user.email })
      .populate('company', 'name');
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const balance = await getEmployeeLeaveBalance(employee._id);
    if (!balance) {
      return notFound(res, 'Bakiye hesaplanamadı');
    }

    res.json({
      _id: employee._id,
      employee: employee,
      company: employee.company,
      ...balance
    });
  } catch (error) {
    return serverError(res, error);
  }
});


// Get leave balance for specific employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('company', 'name');
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company._id.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    const balance = await getEmployeeLeaveBalance(employee._id);
    if (!balance) {
      return notFound(res, 'Bakiye hesaplanamadı');
    }

    res.json({
      _id: employee._id,
      employee: employee,
      company: employee.company,
      ...balance
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Recalculate leave balance for employee (LeaveLedger bakiyelerini yeniden hesapla)
router.post('/employee/:employeeId/recalculate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('company', 'name');
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== employee.company._id.toString()) {
        return forbidden(res, 'Yetkiniz yok');
      }
    }

    const currentYear = new Date().getFullYear();

    // LeaveLedger bakiyelerini yeniden hesapla
    await ensureEntitlementEntries(employee, currentYear);
    await recalculateBalances(employee._id, currentYear);

    // Güncel bakiyeyi getir
    const balance = await getEmployeeLeaveBalance(employee._id);

    res.json({
      message: 'Bakiyeler yeniden hesaplandı',
      _id: employee._id,
      employee: employee,
      company: employee.company,
      ...balance
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;
