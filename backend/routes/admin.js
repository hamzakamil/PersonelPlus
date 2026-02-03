const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Dealer = require('../models/Dealer');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, forbidden, serverError, createdResponse } = require('../utils/responseHelper');

// Health Check - Veritabanı tutarlılık kontrolü
router.get('/health-check', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const issues = [];
    const fixable = [];

    // 1. Orphan Çalışanlar (company referansı geçersiz)
    const allEmployees = await Employee.find({}).select('_id firstName lastName email company status');
    const allCompanies = await Company.find({}).select('_id name');
    const companyIds = new Set(allCompanies.map(c => c._id.toString()));

    const orphanEmployees = allEmployees.filter(emp => {
      if (!emp.company) return true;
      return !companyIds.has(emp.company.toString());
    });

    if (orphanEmployees.length > 0) {
      issues.push({
        type: 'ORPHAN_EMPLOYEES',
        severity: 'HIGH',
        count: orphanEmployees.length,
        message: `${orphanEmployees.length} çalışan geçersiz şirket referansına sahip`,
        items: orphanEmployees.map(e => ({
          id: e._id,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          companyId: e.company?.toString() || 'NULL'
        }))
      });
      fixable.push('ORPHAN_EMPLOYEES');
    }

    // 2. Orphan Şirketler (dealer referansı geçersiz)
    const allDealers = await Dealer.find({}).select('_id name');
    const dealerIds = new Set(allDealers.map(d => d._id.toString()));

    const orphanCompanies = allCompanies.filter(comp => {
      if (!comp.dealer) return false; // Dealer olmayabilir
      return !dealerIds.has(comp.dealer.toString());
    });

    if (orphanCompanies.length > 0) {
      issues.push({
        type: 'ORPHAN_COMPANIES',
        severity: 'HIGH',
        count: orphanCompanies.length,
        message: `${orphanCompanies.length} şirket geçersiz bayi referansına sahip`,
        items: orphanCompanies.map(c => ({
          id: c._id,
          name: c.name,
          dealerId: c.dealer?.toString() || 'NULL'
        }))
      });
      fixable.push('ORPHAN_COMPANIES');
    }

    // 3. Active Status Ama Görünmeyen Çalışanlar
    const invisibleEmployees = [];
    for (const employee of allEmployees) {
      if (employee.status !== 'active') continue;
      if (!employee.company) continue;

      // Backend query ile aynı sorguyu çalıştır
      const query = {
        _id: employee._id,
        company: employee.company,
        status: 'active'
      };

      const found = await Employee.findOne(query);
      if (!found) {
        invisibleEmployees.push(employee);
      }
    }

    if (invisibleEmployees.length > 0) {
      issues.push({
        type: 'INVISIBLE_EMPLOYEES',
        severity: 'CRITICAL',
        count: invisibleEmployees.length,
        message: `${invisibleEmployees.length} aktif çalışan query'lerde görünmüyor`,
        items: invisibleEmployees.map(e => ({
          id: e._id,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          companyId: e.company?.toString()
        }))
      });
      fixable.push('INVISIBLE_EMPLOYEES');
    }

    // 4. Company ObjectId Type Mismatches
    const typeMismatchEmployees = allEmployees.filter(emp => {
      if (!emp.company) return false;
      return !(emp.company instanceof mongoose.Types.ObjectId);
    });

    if (typeMismatchEmployees.length > 0) {
      issues.push({
        type: 'TYPE_MISMATCH',
        severity: 'MEDIUM',
        count: typeMismatchEmployees.length,
        message: `${typeMismatchEmployees.length} çalışanın company field'ı ObjectId tipinde değil`,
        items: typeMismatchEmployees.map(e => ({
          id: e._id,
          name: `${e.firstName} ${e.lastName}`,
          companyType: typeof e.company
        }))
      });
      fixable.push('TYPE_MISMATCH');
    }

    // 5. Duplicate Employee Records (aynı email)
    const emailMap = new Map();
    allEmployees.forEach(emp => {
      if (!emp.email) return;
      const email = emp.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email).push(emp);
    });

    const duplicates = Array.from(emailMap.entries())
      .filter(([email, emps]) => emps.length > 1)
      .map(([email, emps]) => ({
        email,
        count: emps.length,
        employees: emps.map(e => ({
          id: e._id,
          name: `${e.firstName} ${e.lastName}`,
          status: e.status,
          company: e.company?.toString()
        }))
      }));

    if (duplicates.length > 0) {
      issues.push({
        type: 'DUPLICATE_EMAILS',
        severity: 'MEDIUM',
        count: duplicates.length,
        message: `${duplicates.length} email adresi birden fazla çalışana ait`,
        items: duplicates
      });
    }

    // 6. Inactive Companies with Active Employees
    const inactiveCompaniesWithActiveEmployees = [];
    for (const company of allCompanies) {
      if (company.isActive !== false) continue;

      const activeEmployeeCount = await Employee.countDocuments({
        company: company._id,
        status: 'active'
      });

      if (activeEmployeeCount > 0) {
        inactiveCompaniesWithActiveEmployees.push({
          company: {
            id: company._id,
            name: company.name
          },
          activeEmployeeCount
        });
      }
    }

    if (inactiveCompaniesWithActiveEmployees.length > 0) {
      issues.push({
        type: 'INACTIVE_COMPANIES_WITH_ACTIVE_EMPLOYEES',
        severity: 'LOW',
        count: inactiveCompaniesWithActiveEmployees.length,
        message: `${inactiveCompaniesWithActiveEmployees.length} pasif şirketin aktif çalışanları var`,
        items: inactiveCompaniesWithActiveEmployees
      });
    }

    // Özet
    const summary = {
      totalIssues: issues.length,
      criticalCount: issues.filter(i => i.severity === 'CRITICAL').length,
      highCount: issues.filter(i => i.severity === 'HIGH').length,
      mediumCount: issues.filter(i => i.severity === 'MEDIUM').length,
      lowCount: issues.filter(i => i.severity === 'LOW').length,
      fixableIssues: fixable
    };

    res.json({
      success: true,
      timestamp: new Date(),
      summary,
      issues
    });

  } catch (error) {
    console.error('Health check error:', error);
    return serverError(res, error, 'Health check başarısız');
  }
});

// Fix Specific Issue - Belirli bir sorunu düzelt
router.post('/health-check/fix', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { issueType, employeeIds, action } = req.body;

    const results = {
      success: true,
      fixed: 0,
      failed: 0,
      errors: []
    };

    switch (issueType) {
      case 'INVISIBLE_EMPLOYEES':
        // Görünmeyen çalışanları düzelt - document'i tamamen yeniden kaydet
        for (const empId of employeeIds || []) {
          try {
            const employee = await Employee.findById(empId);
            if (!employee) {
              results.failed++;
              results.errors.push({
                employeeId: empId,
                error: 'Employee not found'
              });
              continue;
            }

            // Document'in tüm field'larını al
            const employeeData = employee.toObject();

            // Önce sil
            await Employee.deleteOne({ _id: empId });
            console.log(`Deleted employee ${empId} for re-creation`);

            // Sonra tekrar oluştur (ID'yi koruyarak)
            const newEmployee = new Employee({
              ...employeeData,
              _id: empId,
              company: new mongoose.Types.ObjectId(employeeData.company.toString())
            });

            await newEmployee.save({ validateBeforeSave: false });
            console.log(`Re-created employee ${empId} with proper indexing`);

            // Verify
            const verifyQuery = {
              _id: empId,
              company: employeeData.company,
              status: 'active'
            };
            const verified = await Employee.findOne(verifyQuery);

            if (verified) {
              results.fixed++;
              console.log(`✓ Fixed and verified invisible employee: ${empId}`);
            } else {
              results.failed++;
              results.errors.push({
                employeeId: empId,
                error: 'Re-creation succeeded but still not queryable'
              });
              console.error(`✗ Employee ${empId} re-created but still not queryable`);
            }
          } catch (error) {
            console.error(`Error fixing employee ${empId}:`, error);
            results.failed++;
            results.errors.push({
              employeeId: empId,
              error: error.message
            });
          }
        }
        break;

      case 'TYPE_MISMATCH':
        // ObjectId tipini düzelt
        for (const empId of employeeIds || []) {
          try {
            const employee = await Employee.findById(empId);
            if (employee && employee.company) {
              // Mongoose 6+ için new keyword kullanmalı
              const companyId = new mongoose.Types.ObjectId(employee.company.toString());
              await Employee.updateOne(
                { _id: empId },
                { $set: { company: companyId } }
              );
              results.fixed++;
              console.log(`Fixed type mismatch for employee: ${empId}`);
            } else {
              results.failed++;
              results.errors.push({
                employeeId: empId,
                error: 'Employee or company not found'
              });
            }
          } catch (error) {
            console.error(`Error fixing type mismatch ${empId}:`, error);
            results.failed++;
            results.errors.push({
              employeeId: empId,
              error: error.message
            });
          }
        }
        break;

      case 'ORPHAN_EMPLOYEES':
        if (action === 'delete') {
          // Orphan çalışanları sil
          for (const empId of employeeIds || []) {
            try {
              await Employee.findByIdAndDelete(empId);
              results.fixed++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                employeeId: empId,
                error: error.message
              });
            }
          }
        }
        break;

      default:
        return errorResponse(res, { message: 'Desteklenmeyen issue type' });
    }

    res.json(results);

  } catch (error) {
    console.error('Fix error:', error);
    return serverError(res, error, 'Düzeltme başarısız');
  }
});

// Update Employee Email - Duplicate email düzeltme
router.post('/update-employee-email', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { employeeId, newEmail } = req.body;

    if (!employeeId || !newEmail) {
      return errorResponse(res, { message: 'Employee ID ve yeni email gerekli' });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return errorResponse(res, { message: 'Geçersiz email formatı' });
    }

    // Email zaten kullanılıyor mu kontrol et
    const existingEmployee = await Employee.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: employeeId }
    });

    if (existingEmployee) {
      return errorResponse(res, { message: 'Bu email adresi başka bir çalışan tarafından kullanılıyor' });
    }

    // Employee'yi bul ve güncelle
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const oldEmail = employee.email;
    employee.email = newEmail.toLowerCase();
    await employee.save();

    console.log(`Email updated: ${oldEmail} -> ${newEmail} for employee ${employeeId}`);

    res.json({
      success: true,
      message: 'Email başarıyla güncellendi',
      oldEmail,
      newEmail: newEmail.toLowerCase()
    });

  } catch (error) {
    console.error('Update email error:', error);
    return serverError(res, error, 'Email güncelleme başarısız');
  }
});

// Send Notification to Company - Şirkete sistem mesajı gönder
router.post('/notify-company', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { companyId, subject, message, employeeIds } = req.body;

    if (!companyId || !subject || !message) {
      return errorResponse(res, { message: 'Şirket ID, konu ve mesaj gerekli' });
    }

    const company = await Company.findById(companyId).populate('dealer');
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Etkilenen çalışanların listesini hazırla
    let employeeDetails = '';
    if (employeeIds && employeeIds.length > 0) {
      const employees = await Employee.find({ _id: { $in: employeeIds } })
        .select('firstName lastName email tcKimlik');

      employeeDetails = '\n\n📋 Etkilenen Çalışanlar:\n' +
        employees.map(e => `• ${e.firstName} ${e.lastName} (${e.email || e.tcKimlik})`).join('\n');
    }

    // Sistem mesajı oluştur
    const Message = require('../models/Message');
    const messageContent = `${message}${employeeDetails}\n\n⚠️ Bu bir sistem bildirimidir. Lütfen gerekli düzeltmeleri yapınız.`;

    const systemMessage = new Message({
      type: 'SYSTEM',
      sender: req.user.id,
      senderRole: 'super_admin',
      recipientCompany: companyId,
      subject: `[Sistem Bildirimi] ${subject}`,
      content: messageContent,
      isRead: false
    });

    await systemMessage.save();

    console.log(`System message sent to company ${companyId} (${company.name})`);

    res.json({
      success: true,
      message: `Şirkete sistem mesajı gönderildi: ${company.name}`,
      messageId: systemMessage._id
    });

  } catch (error) {
    console.error('Notification error:', error);
    return serverError(res, error, 'Bildirim gönderme başarısız');
  }
});

module.exports = router;
