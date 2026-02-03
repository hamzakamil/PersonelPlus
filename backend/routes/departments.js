const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, notFound, forbidden, createdResponse } = require('../utils/responseHelper');
const catchAsync = require('../utils/catchAsync');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const validate = require('../middleware/validate');
const { department: departmentValidation } = require('../validations');

// Get all departments
router.get('/', auth, validate(departmentValidation.listDepartments), catchAsync(async (req, res) => {
  let query = {};

  if (req.query.company) {
    query.company = req.query.company;

    if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(req.query.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        throw new ForbiddenError();
      }
    } else if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
      if (req.query.company !== userCompanyId) {
        throw new ForbiddenError();
      }
    }
  } else {
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      query.company = req.user.company;
    }
  }

  const departments = await Department.find(query)
    .populate('company')
    .populate('workplace', 'name sgkRegisterNumber isDefault')
    .populate('parentDepartment', 'name')
    .populate('workingHours', 'name')
    .populate('manager', 'firstName lastName email')
    .sort({ parentDepartment: 1, createdAt: -1 });

  return successResponse(res, { data: departments });
}));

// Get departments by company
router.get('/company/:companyId', auth, validate(departmentValidation.departmentsByCompany), catchAsync(async (req, res) => {
  const company = await Company.findById(req.params.companyId);
  if (!company) {
    throw new NotFoundError('Sirket bulunamadi');
  }

  const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
  if (req.user.role.name === 'bayi_admin' && userDealerId !== company.dealer.toString()) {
    throw new ForbiddenError();
  }
  const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
  if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
      userCompanyId !== req.params.companyId) {
    throw new ForbiddenError();
  }

  const departments = await Department.find({ company: req.params.companyId })
    .populate('workplace', 'name sgkRegisterNumber isDefault')
    .populate('parentDepartment', 'name')
    .populate('workingHours', 'name')
    .populate('manager', 'firstName lastName email')
    .sort({ parentDepartment: 1, createdAt: -1 });

  return successResponse(res, { data: departments });
}));

// Get single department
router.get('/:id', auth, validate(departmentValidation.departmentById), catchAsync(async (req, res) => {
  const department = await Department.findById(req.params.id)
    .populate('company')
    .populate('workplace', 'name sgkRegisterNumber isDefault')
    .populate('parentDepartment', 'name')
    .populate('workingHours', 'name')
    .populate('manager', 'firstName lastName email');

  if (!department) {
    throw new NotFoundError('Departman bulunamadi');
  }

  const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
  if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) &&
      userCompanyId !== department.company._id.toString()) {
    throw new ForbiddenError();
  }

  return successResponse(res, { data: department });
}));

// Create department
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), validate(departmentValidation.createDepartment), catchAsync(async (req, res) => {
  const { name, company, parent, parentDepartment, description, workingHours, manager, workplace } = req.body;
  const finalParent = parent || parentDepartment;

  let companyId = company;
  if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
    companyId = req.user.company;
  } else if (req.user.role.name === 'bayi_admin' && !companyId) {
    throw new BadRequestError('Sirket secilmelidir');
  }

  if (finalParent) {
    const parentDept = await Department.findById(finalParent);
    if (!parentDept) {
      throw new NotFoundError('Ust departman bulunamadi');
    }
    const parentCompanyId = parentDept.company?._id || parentDept.company;
    if (parentCompanyId.toString() !== companyId.toString()) {
      throw new BadRequestError('Ust departman ayni sirkete ait olmalidir');
    }
  }

  if (workingHours) {
    const WorkingHours = require('../models/WorkingHours');
    const wh = await WorkingHours.findById(workingHours);
    if (!wh) {
      throw new NotFoundError('Calisma saatleri bulunamadi');
    }
    const whCompanyId = wh.company?._id || wh.company;
    if (whCompanyId.toString() !== companyId.toString()) {
      throw new BadRequestError('Calisma saatleri ayni sirkete ait olmalidir');
    }
  }

  if (manager) {
    const Employee = require('../models/Employee');
    const managerEmployee = await Employee.findById(manager);
    if (!managerEmployee) {
      throw new NotFoundError('Yonetici calisan bulunamadi');
    }
    const managerCompanyId = managerEmployee.company?._id || managerEmployee.company;
    if (managerCompanyId.toString() !== companyId.toString()) {
      throw new BadRequestError('Yonetici ayni sirkete ait olmalidir');
    }
  }

  let workplaceId = workplace || null;
  if (workplaceId) {
    const workplaceDoc = await Workplace.findById(workplaceId);
    if (!workplaceDoc) {
      throw new NotFoundError('Isyeri bulunamadi');
    }
    const wpCompanyId = workplaceDoc.company?._id || workplaceDoc.company;
    if (wpCompanyId.toString() !== companyId.toString()) {
      throw new BadRequestError('Isyeri ayni sirkete ait olmalidir');
    }
  }

  const department = new Department({
    name,
    company: companyId,
    workplace: workplaceId,
    parentDepartment: finalParent || null,
    description,
    workingHours: workingHours || null,
    manager: manager || null
  });
  await department.save();

  const populated = await Department.findById(department._id)
    .populate('company')
    .populate('workplace', 'name sgkRegisterNumber isDefault')
    .populate('parentDepartment', 'name')
    .populate('workingHours', 'name')
    .populate('manager', 'firstName lastName email');

  if (manager) {
    const { updateDepartmentEmployeesApprovalChain } = require('../services/approvalChainService');
    try {
      await updateDepartmentEmployeesApprovalChain(department._id);
    } catch (error) {
      console.error('Approval chain guncelleme hatasi:', error);
    }
  }

  return createdResponse(res, { data: populated, message: 'Departman olusturuldu' });
}));

// Activate department
router.post('/:id/activate', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), validate(departmentValidation.departmentById), catchAsync(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new NotFoundError('Departman bulunamadi');
  }

  const userCompanyId = req.user.company?._id || req.user.company;
  const deptCompanyId = department.company?._id || department.company;
  if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
      userCompanyId.toString() !== deptCompanyId.toString()) {
    throw new ForbiddenError();
  }

  if (department.isActive) {
    throw new BadRequestError('Bu departman zaten aktif');
  }

  department.isActive = true;
  await department.save();

  const populated = await Department.findById(department._id)
    .populate('company')
    .populate('workplace', 'name sgkRegisterNumber isDefault')
    .populate('parentDepartment', 'name')
    .populate('workingHours', 'name')
    .populate('manager', 'firstName lastName email');

  return successResponse(res, { data: populated, message: 'Departman aktif edildi' });
}));

// Update department
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), validate(departmentValidation.updateDepartment), catchAsync(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new NotFoundError('Departman bulunamadi');
  }

  const userCompanyId = req.user.company?._id || req.user.company;
  const deptCompanyId = department.company?._id || department.company;
  if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
      userCompanyId.toString() !== deptCompanyId.toString()) {
    throw new ForbiddenError();
  }

  const { name, parent, parentDepartment, description, workingHours, manager, isActive, workplace } = req.body;
  const finalParent = parent !== undefined ? parent : parentDepartment;

  if (finalParent !== undefined) {
    if (finalParent) {
      const parentDept = await Department.findById(finalParent);
      if (!parentDept) {
        throw new NotFoundError('Ust departman bulunamadi');
      }
      const parentCompanyId = parentDept.company?._id || parentDept.company;
      if (parentCompanyId.toString() !== deptCompanyId.toString()) {
        throw new BadRequestError('Ust departman ayni sirkete ait olmalidir');
      }
      if (finalParent === req.params.id) {
        throw new BadRequestError('Departman kendi alt departmani olamaz');
      }
    }
    department.parentDepartment = finalParent || null;
  }

  if (workingHours !== undefined) {
    if (workingHours) {
      const WorkingHours = require('../models/WorkingHours');
      const wh = await WorkingHours.findById(workingHours);
      if (!wh) {
        throw new NotFoundError('Calisma saatleri bulunamadi');
      }
      const whCompanyId = wh.company?._id || wh.company;
      if (whCompanyId.toString() !== deptCompanyId.toString()) {
        throw new BadRequestError('Calisma saatleri ayni sirkete ait olmalidir');
      }
    }
    department.workingHours = workingHours || null;
  }

  if (manager !== undefined) {
    if (manager) {
      const Employee = require('../models/Employee');
      const managerEmployee = await Employee.findById(manager);
      if (!managerEmployee) {
        throw new NotFoundError('Yonetici calisan bulunamadi');
      }
      const managerCompanyId = managerEmployee.company?._id || managerEmployee.company;
      if (managerCompanyId.toString() !== deptCompanyId.toString()) {
        throw new BadRequestError('Yonetici ayni sirkete ait olmalidir');
      }
    }
    const oldManager = department.manager;
    department.manager = manager || null;

    if (oldManager?.toString() !== (manager || null)?.toString()) {
      const { updateDepartmentEmployeesApprovalChain } = require('../services/approvalChainService');
      try {
        await updateDepartmentEmployeesApprovalChain(department._id);
      } catch (error) {
        console.error('Approval chain guncelleme hatasi:', error);
      }
    }
  }

  if (workplace !== undefined) {
    if (workplace) {
      const workplaceDoc = await Workplace.findById(workplace);
      if (!workplaceDoc) {
        throw new NotFoundError('Isyeri bulunamadi');
      }
      const wpCompanyId = workplaceDoc.company?._id || workplaceDoc.company;
      if (wpCompanyId.toString() !== deptCompanyId.toString()) {
        throw new BadRequestError('Isyeri ayni sirkete ait olmalidir');
      }
    }
    department.workplace = workplace || null;
  }

  department.name = name || department.name;
  department.description = description !== undefined ? description : department.description;

  if (isActive !== undefined && !department.isDefault) {
    department.isActive = isActive;
  }

  await department.save();

  const populated = await Department.findById(department._id)
    .populate('company')
    .populate('workplace', 'name sgkRegisterNumber isDefault')
    .populate('parentDepartment', 'name')
    .populate('workingHours', 'name')
    .populate('manager', 'firstName lastName email');

  return successResponse(res, { data: populated, message: 'Departman guncellendi' });
}));

// Delete department
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), validate(departmentValidation.departmentById), catchAsync(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new NotFoundError('Departman bulunamadi');
  }

  const userCompanyId = req.user.company?._id || req.user.company;
  const deptCompanyId = department.company?._id || department.company;
  if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
      userCompanyId.toString() !== deptCompanyId.toString()) {
    throw new ForbiddenError();
  }

  if (department.isDefault) {
    throw new BadRequestError('Merkez Isyeri silinemez. Isterseniz ismini degistirebilirsiniz.');
  }

  const children = await Department.find({ parentDepartment: department._id });
  if (children.length > 0) {
    const childNames = children.map(c => c.name).join(', ');
    const activeCount = children.filter(c => c.isActive).length;
    const inactiveCount = children.filter(c => !c.isActive).length;

    let message = `Bu departmanin ${children.length} alt kaydi var: ${childNames}. `;
    if (activeCount > 0 && inactiveCount > 0) {
      message += `(${activeCount} aktif, ${inactiveCount} pasif) `;
    } else if (inactiveCount > 0) {
      message += `(Tumu pasif) `;
    }
    message += 'Once alt kayitlari silin veya tasiyin.';

    throw new BadRequestError(message);
  }

  if (!department.parentDepartment) {
    await Workplace.findOneAndDelete({
      company: department.company,
      name: department.name,
      isDefault: false
    });
  }

  await Department.findByIdAndDelete(req.params.id);
  return successResponse(res, { message: 'Departman silindi' });
}));

module.exports = router;
