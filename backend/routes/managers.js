const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Workplace = require('../models/Workplace');
const WorkplaceSection = require('../models/WorkplaceSection');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');
const {
  calculateApprovalChain,
  updateDepartmentEmployeesApprovalChain,
  updateEmployeeApprovalChain,
  updateWorkplaceEmployeesApprovalChain,
  updateWorkplaceSectionEmployeesApprovalChain
} = require('../services/approvalChainService');

// Yardımcı fonksiyon: Populated obje veya ObjectId'den ID'yi güvenli şekilde al
const getObjectId = (obj) => {
  if (!obj) return null;
  return obj._id || obj;
};

// ========== ÇALIŞAN YÖNETİCİSİ BELİRLEME ==========

// Çalışana direkt manager atama
router.put('/employee/:employeeId/manager', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { managerId } = req.body;

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    const userCompanyId = getObjectId(req.user.company);
    const empCompanyId = getObjectId(employee.company);
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        userCompanyId.toString() !== empCompanyId.toString()) {
      return forbidden(res);
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return notFound(res, 'Yönetici bulunamadı');
      }

      // Aynı şirkette olmalı
      if (manager.company.toString() !== employee.company.toString()) {
        return errorResponse(res, { message: 'Yönetici aynı şirkette olmalıdır' });
      }

      // Kendi kendine manager olamaz
      if (managerId === req.params.employeeId) {
        return errorResponse(res, { message: 'Çalışan kendi yöneticisi olamaz' });
      }

      employee.manager = managerId;
    } else {
      employee.manager = null;
    }

    await employee.save();

    // Approval chain'i güncelle
    await updateEmployeeApprovalChain(employee._id);

    const populated = await Employee.findById(employee._id)
      .populate('manager', 'firstName lastName email')
      .populate('department', 'name manager')
      .populate('company', 'name');

    res.json({ 
      success: true, 
      message: 'Yönetici başarıyla atandı',
      data: populated 
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== DEPARTMAN YÖNETİCİSİ BELİRLEME ==========

// Departmana yönetici atama
router.put('/department/:departmentId/manager', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { managerId } = req.body;

    const department = await Department.findById(req.params.departmentId);
    if (!department) {
      return notFound(res, 'Departman bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const deptCompanyId = getObjectId(department.company);
      const userCompanyId = getObjectId(req.user.company);
      if (deptCompanyId.toString() !== userCompanyId.toString()) {
        return forbidden(res);
      }
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return notFound(res, 'Yönetici bulunamadı');
      }

      // Aynı şirkette olmalı
      if (manager.company.toString() !== department.company.toString()) {
        return errorResponse(res, { message: 'Yönetici aynı şirkette olmalıdır' });
      }

      department.manager = managerId;
    } else {
      department.manager = null;
    }

    await department.save();

    // Bu departman ve alt departmanlardaki tüm çalışanların approval chain'lerini güncelle
    await updateDepartmentEmployeesApprovalChain(department._id);

    const populated = await Department.findById(department._id)
      .populate('manager', 'firstName lastName email')
      .populate('company', 'name')
      .populate('parentDepartment', 'name');

    res.json({ 
      success: true, 
      message: 'Departman yöneticisi başarıyla atandı. Tüm alt departman çalışanlarının onay zincirleri güncellendi.',
      data: populated 
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== ÇALIŞAN ONAY ZİNCİRİNİ GÖRÜNTÜLEME ==========

// Çalışanın onay zincirini getir
router.get('/employee/:employeeId/approval-chain', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('manager', 'firstName lastName email position')
      .populate('department', 'name manager')
      .populate('approvalChain', 'firstName lastName email position');

    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return forbidden(res);
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = getObjectId(req.user.company);
      const empCompanyId = getObjectId(employee.company);
      if (userCompanyId.toString() !== empCompanyId.toString()) {
        return forbidden(res);
      }
    }

    // Approval chain'i hesapla (güncel olsun)
    const chain = await calculateApprovalChain(employee._id);

    // Chain'deki çalışanları populate et
    const chainEmployees = await Employee.find({ _id: { $in: chain } })
      .select('firstName lastName email position department manager')
      .populate('department', 'name')
      .populate('manager', 'firstName lastName');

    res.json({ 
      success: true, 
      data: {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          position: employee.position,
          manager: employee.manager,
          department: employee.department
        },
        approvalChain: chainEmployees,
        chainOrder: chain
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== SGK İŞYERİ YÖNETİCİSİ BELİRLEME ==========

// SGK İşyerine yönetici atama
router.put('/workplace/:workplaceId/manager', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { managerId } = req.body;

    const workplace = await Workplace.findById(req.params.workplaceId);
    if (!workplace) {
      return notFound(res, 'SGK İşyeri bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const workplaceCompanyId = getObjectId(workplace.company);
      const userCompanyId = getObjectId(req.user.company);
      if (workplaceCompanyId.toString() !== userCompanyId.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(workplace.company);
      const companyDealerId = getObjectId(company?.dealer);
      const userDealerId = getObjectId(req.user.dealer);
      if (!company || companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res);
      }
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return notFound(res, 'Yönetici bulunamadı');
      }

      // Aynı şirkette olmalı
      if (manager.company.toString() !== workplace.company.toString()) {
        return errorResponse(res, { message: 'Yönetici aynı şirkette olmalıdır' });
      }

      workplace.manager = managerId;
    } else {
      workplace.manager = null;
    }

    await workplace.save();

    // Bu işyerindeki çalışanların approval chain'lerini güncelle
    if (typeof updateWorkplaceEmployeesApprovalChain === 'function') {
      await updateWorkplaceEmployeesApprovalChain(workplace._id);
    }

    const populated = await Workplace.findById(workplace._id)
      .populate('manager', 'firstName lastName email')
      .populate('company', 'name');

    res.json({
      success: true,
      message: 'SGK İşyeri yöneticisi başarıyla atandı',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== İŞYERİ BÖLÜMÜ YÖNETİCİSİ BELİRLEME ==========

// İşyeri bölümüne yönetici atama
router.put('/workplace-section/:sectionId/manager', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { managerId } = req.body;

    const section = await WorkplaceSection.findById(req.params.sectionId)
      .populate('workplace');
    if (!section) {
      return notFound(res, 'İşyeri bölümü bulunamadı');
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const sectionCompanyId = getObjectId(section.workplace?.company);
      const userCompanyId = getObjectId(req.user.company);
      if (sectionCompanyId?.toString() !== userCompanyId.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(section.workplace.company);
      const companyDealerId = getObjectId(company?.dealer);
      const userDealerId = getObjectId(req.user.dealer);
      if (!company || companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res);
      }
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await Employee.findById(managerId);
      if (!manager) {
        return notFound(res, 'Yönetici bulunamadı');
      }

      // Aynı şirkette olmalı
      if (manager.company.toString() !== section.workplace.company.toString()) {
        return errorResponse(res, { message: 'Yönetici aynı şirkette olmalıdır' });
      }

      section.manager = managerId;
    } else {
      section.manager = null;
    }

    await section.save();

    // Bu bölümdeki çalışanların approval chain'lerini güncelle
    if (typeof updateWorkplaceSectionEmployeesApprovalChain === 'function') {
      await updateWorkplaceSectionEmployeesApprovalChain(section._id);
    }

    const populated = await WorkplaceSection.findById(section._id)
      .populate('manager', 'firstName lastName email')
      .populate('workplace', 'name');

    res.json({
      success: true,
      message: 'İşyeri bölümü yöneticisi başarıyla atandı',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== TOPLU YÖNETİCİ ATAMA ==========

// Birden fazla çalışana aynı yöneticiyi ata
router.post('/bulk-assign', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { employeeIds, managerId } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return errorResponse(res, { message: 'Çalışan listesi gereklidir' });
    }

    // Manager kontrolü (null olabilir - yönetici kaldırma)
    let manager = null;
    if (managerId) {
      manager = await Employee.findById(managerId);
      if (!manager) {
        return notFound(res, 'Yönetici bulunamadı');
      }
    }

    const results = {
      success: [],
      failed: []
    };

    for (const employeeId of employeeIds) {
      try {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          results.failed.push({ employeeId, reason: 'Çalışan bulunamadı' });
          continue;
        }

        // Yetki kontrolü
        if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
          const empCompanyId = getObjectId(employee.company);
          const userCompanyId = getObjectId(req.user.company);
          if (empCompanyId.toString() !== userCompanyId.toString()) {
            results.failed.push({ employeeId, reason: 'Yetkiniz yok' });
            continue;
          }
        } else if (req.user.role.name === 'bayi_admin') {
          const company = await Company.findById(employee.company);
          const companyDealerId = getObjectId(company?.dealer);
          const userDealerId = getObjectId(req.user.dealer);
          if (!company || companyDealerId.toString() !== userDealerId.toString()) {
            results.failed.push({ employeeId, reason: 'Yetkiniz yok' });
            continue;
          }
        }

        // Manager aynı şirkette mi kontrolü
        if (manager && manager.company.toString() !== employee.company.toString()) {
          results.failed.push({ employeeId, reason: 'Yönetici farklı şirkette' });
          continue;
        }

        // Kendi kendine manager olamaz
        if (managerId && managerId === employeeId) {
          results.failed.push({ employeeId, reason: 'Kendi yöneticisi olamaz' });
          continue;
        }

        employee.manager = managerId || null;
        await employee.save();
        await updateEmployeeApprovalChain(employee._id);

        results.success.push(employeeId);
      } catch (err) {
        results.failed.push({ employeeId, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.success.length} çalışana yönetici atandı, ${results.failed.length} başarısız`,
      data: results
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== ORGANİZASYON YAPISI ==========

// Şirketin organizasyon ağacını getir
router.get('/organization', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { company: companyId } = req.query;

    // Company ID belirleme
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
        targetCompanyId = req.user.company;
      } else {
        return errorResponse(res, { message: 'Şirket seçilmelidir' });
      }
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = getObjectId(req.user.company);
      if (targetCompanyId.toString() !== userCompanyId.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(targetCompanyId);
      const companyDealerId = getObjectId(company?.dealer);
      const userDealerId = getObjectId(req.user.dealer);
      if (!company || companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res);
      }
    }

    // SGK İşyerlerini getir
    const workplaces = await Workplace.find({ company: targetCompanyId, isActive: true })
      .populate('manager', 'firstName lastName email position')
      .lean();

    // İşyeri bölümlerini getir
    const sections = await WorkplaceSection.find({
      workplace: { $in: workplaces.map(w => w._id) },
      isActive: true
    })
      .populate('manager', 'firstName lastName email position')
      .lean();

    // Departmanları getir
    const departments = await Department.find({ company: targetCompanyId, isActive: true })
      .populate('manager', 'firstName lastName email position')
      .populate('parentDepartment', 'name')
      .lean();

    // Çalışanları getir
    const employees = await Employee.find({ company: targetCompanyId, isActive: true })
      .populate('manager', 'firstName lastName email position')
      .populate('department', 'name')
      .populate('workplace', 'name')
      .populate('workplaceSection', 'name')
      .select('firstName lastName email position manager department workplace workplaceSection approvalChain')
      .lean();

    // Hiyerarşik yapıyı oluştur
    const buildDepartmentTree = (parentId = null) => {
      return departments
        .filter(d => {
          if (parentId === null) return !d.parentDepartment;
          return d.parentDepartment && d.parentDepartment._id.toString() === parentId.toString();
        })
        .map(dept => ({
          ...dept,
          type: 'department',
          children: buildDepartmentTree(dept._id),
          employees: employees.filter(e =>
            e.department && e.department._id.toString() === dept._id.toString()
          )
        }));
    };

    const organization = workplaces.map(workplace => ({
      ...workplace,
      type: 'workplace',
      sections: sections
        .filter(s => s.workplace.toString() === workplace._id.toString())
        .map(section => ({
          ...section,
          type: 'section',
          employees: employees.filter(e =>
            e.workplaceSection && e.workplaceSection._id.toString() === section._id.toString()
          )
        })),
      departments: buildDepartmentTree(null).filter(d => {
        // Departmandaki çalışanların çoğu bu işyerinde mi?
        const deptEmployees = employees.filter(e =>
          e.department && e.department._id.toString() === d._id.toString()
        );
        return deptEmployees.some(e =>
          e.workplace && e.workplace._id.toString() === workplace._id.toString()
        );
      }),
      directEmployees: employees.filter(e =>
        e.workplace &&
        e.workplace._id.toString() === workplace._id.toString() &&
        !e.department &&
        !e.workplaceSection
      )
    }));

    // Herhangi bir yere atanmamış çalışanlar
    const unassigned = employees.filter(e => !e.workplace && !e.department);

    res.json({
      success: true,
      data: {
        organization,
        unassigned,
        summary: {
          totalWorkplaces: workplaces.length,
          totalSections: sections.length,
          totalDepartments: departments.length,
          totalEmployees: employees.length,
          unassignedCount: unassigned.length
        }
      }
    });
  } catch (error) {
    console.error('Organization fetch error:', error);
    return serverError(res, error);
  }
});

// ========== İSTATİSTİKLER ==========

// Yönetici atama istatistiklerini getir
router.get('/statistics', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { company: companyId } = req.query;

    // Company ID belirleme
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
        targetCompanyId = req.user.company;
      }
    }

    // Yetki kontrolü
    if (targetCompanyId) {
      if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
        const userCompanyId = getObjectId(req.user.company);
        if (targetCompanyId.toString() !== userCompanyId.toString()) {
          return forbidden(res);
        }
      } else if (req.user.role.name === 'bayi_admin') {
        const company = await Company.findById(targetCompanyId);
        const companyDealerId = getObjectId(company?.dealer);
        const userDealerId = getObjectId(req.user.dealer);
        if (!company || companyDealerId.toString() !== userDealerId.toString()) {
          return forbidden(res);
        }
      }
    }

    const companyFilter = targetCompanyId ? { company: targetCompanyId } : {};
    const activeFilter = { ...companyFilter, isActive: true };

    // Çalışan istatistikleri
    const totalEmployees = await Employee.countDocuments(activeFilter);
    const employeesWithManager = await Employee.countDocuments({ ...activeFilter, manager: { $ne: null } });
    const employeesWithoutManager = totalEmployees - employeesWithManager;

    // Departman istatistikleri
    const totalDepartments = await Department.countDocuments(activeFilter);
    const departmentsWithManager = await Department.countDocuments({ ...activeFilter, manager: { $ne: null } });
    const departmentsWithoutManager = totalDepartments - departmentsWithManager;

    // İşyeri istatistikleri
    const workplaceFilter = targetCompanyId ? { company: targetCompanyId, isActive: true } : { isActive: true };
    const totalWorkplaces = await Workplace.countDocuments(workplaceFilter);
    const workplacesWithManager = await Workplace.countDocuments({ ...workplaceFilter, manager: { $ne: null } });
    const workplacesWithoutManager = totalWorkplaces - workplacesWithManager;

    // Bölüm istatistikleri
    let sectionFilter = { isActive: true };
    if (targetCompanyId) {
      const companyWorkplaces = await Workplace.find({ company: targetCompanyId }).select('_id');
      sectionFilter.workplace = { $in: companyWorkplaces.map(w => w._id) };
    }
    const totalSections = await WorkplaceSection.countDocuments(sectionFilter);
    const sectionsWithManager = await WorkplaceSection.countDocuments({ ...sectionFilter, manager: { $ne: null } });
    const sectionsWithoutManager = totalSections - sectionsWithManager;

    res.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          withManager: employeesWithManager,
          withoutManager: employeesWithoutManager,
          percentage: totalEmployees > 0 ? Math.round((employeesWithManager / totalEmployees) * 100) : 0
        },
        departments: {
          total: totalDepartments,
          withManager: departmentsWithManager,
          withoutManager: departmentsWithoutManager,
          percentage: totalDepartments > 0 ? Math.round((departmentsWithManager / totalDepartments) * 100) : 0
        },
        workplaces: {
          total: totalWorkplaces,
          withManager: workplacesWithManager,
          withoutManager: workplacesWithoutManager,
          percentage: totalWorkplaces > 0 ? Math.round((workplacesWithManager / totalWorkplaces) * 100) : 0
        },
        sections: {
          total: totalSections,
          withManager: sectionsWithManager,
          withoutManager: sectionsWithoutManager,
          percentage: totalSections > 0 ? Math.round((sectionsWithManager / totalSections) * 100) : 0
        }
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ========== POTANSİYEL YÖNETİCİLER ==========

// Potansiyel yönetici listesi (aynı şirketten aktif çalışanlar)
router.get('/potential-managers', auth, async (req, res) => {
  try {
    const { company: companyId, excludeId } = req.query;

    // Company ID belirleme
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
        targetCompanyId = req.user.company;
      } else {
        return errorResponse(res, { message: 'Şirket seçilmelidir' });
      }
    }

    // Yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const userCompanyId = getObjectId(req.user.company);
      if (targetCompanyId.toString() !== userCompanyId.toString()) {
        return forbidden(res);
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(targetCompanyId);
      const companyDealerId = getObjectId(company?.dealer);
      const userDealerId = getObjectId(req.user.dealer);
      if (!company || companyDealerId.toString() !== userDealerId.toString()) {
        return forbidden(res);
      }
    }

    const filter = {
      company: targetCompanyId,
      isActive: true
    };

    // Belirli bir çalışanı hariç tut (kendi kendine yönetici olamaz)
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const potentialManagers = await Employee.find(filter)
      .select('firstName lastName email position department workplace')
      .populate('department', 'name')
      .populate('workplace', 'name')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json({
      success: true,
      data: potentialManagers
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

