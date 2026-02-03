const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Workplace = require('../models/Workplace');
const WorkplaceSection = require('../models/WorkplaceSection');
const User = require('../models/User');
const Role = require('../models/Role');

/**
 * Şirketin company_admin rolündeki kullanıcısının employee kaydını döndürür
 */
async function getCompanyAdmin(companyId) {
  try {
    const companyAdminRole = await Role.findOne({ name: 'company_admin' });
    if (!companyAdminRole) return null;

    const companyAdminUser = await User.findOne({
      company: companyId,
      role: companyAdminRole._id
    }).populate('employee');

    return companyAdminUser?.employee || null;
  } catch (error) {
    console.error('Company admin bulma hatası:', error);
    return null;
  }
}

/**
 * Çalışan için onay zincirini hesaplar (ALTTAN ÜSTE DOĞRU)
 * Öncelik sırası:
 * 1. Çalışanın departmanının yöneticisi (en alt seviye)
 * 2. Üst departmanların yöneticileri (parentDepartment üzerinden yukarı)
 * 3. Çalışanın direkt manager'ı (employee.manager)
 * 4. Manager'ın manager'ı (recursive)
 * 5. İşyeri bölümü yöneticisi (workplaceSection.manager)
 * 6. SGK İşyeri yöneticisi (workplace.manager)
 *
 * Chain'in ilk elemanı en alt yönetici, son elemanı en üst yönetici olur.
 */
async function calculateApprovalChain(employeeId) {
  try {
    const employee = await Employee.findById(employeeId)
      .populate('department')
      .populate('workplace')
      .populate('workplaceSection')
      .populate('manager', 'firstName lastName email manager department');

    if (!employee) {
      return [];
    }

    const chain = [];
    const visited = new Set(); // Sonsuz döngü önleme

    // 1. Departman yöneticisi (en alt seviye - chain'in başına ekle)
    if (employee.department) {
      const department = await Department.findById(employee.department)
        .populate('manager', 'firstName lastName email manager department')
        .populate('parentDepartment');

      // Departman yöneticisi var mı kontrol et
      if (department && department.manager) {
        const deptManager = department.manager;
        const directManager = employee.manager;

        // Departman yöneticisi, çalışanın manager'ı ile aynı kişi mi kontrol et
        if (directManager &&
            deptManager._id.toString() === directManager._id.toString()) {
          // Aynı kişi ise, departman yöneticisi adımını atla
          // Manager pozisyonunda eklenecek (adım 3'te)
        } else {
          // Farklı kişiler ise departman yöneticisini ekle
          const managerId = deptManager._id.toString();
          if (!visited.has(managerId)) {
            chain.push(deptManager._id);
            visited.add(managerId);
          }
        }
      } else if (department && !department.manager) {
        // Departman yöneticisi yoksa şirket admin'ini fallback olarak ekle
        const companyAdmin = await getCompanyAdmin(employee.company);
        if (companyAdmin && !visited.has(companyAdmin._id.toString())) {
          chain.push(companyAdmin._id);
          visited.add(companyAdmin._id.toString());
        }
      }

      // 2. Üst departmanların yöneticilerini ekle (parentDepartment üzerinden yukarı)
      let currentDept = department;
      while (currentDept && currentDept.parentDepartment) {
        const parentDept = await Department.findById(currentDept.parentDepartment)
          .populate('manager', 'firstName lastName email manager department')
          .populate('parentDepartment');

        if (parentDept && parentDept.manager) {
          const managerId = parentDept.manager._id.toString();
          if (!visited.has(managerId)) {
            chain.push(parentDept.manager._id);
            visited.add(managerId);
          }
        }

        currentDept = parentDept;
      }
    }

    // 3. Çalışanın direkt manager'ı (eğer departman yöneticisi değilse)
    if (employee.manager) {
      const managerId = employee.manager._id.toString();
      if (!visited.has(managerId)) {
        chain.push(employee.manager._id);
        visited.add(managerId);
      }
    }

    // 4. Manager'ların manager'larını recursive ekle (yukarı doğru)
    for (let i = 0; i < chain.length; i++) {
      const managerId = chain[i];
      await addManagerHierarchy(managerId, chain, visited);
    }

    // 5. İşyeri Bölümü yöneticisi (workplaceSection.manager)
    if (employee.workplaceSection) {
      const section = await WorkplaceSection.findById(employee.workplaceSection)
        .populate('manager', 'firstName lastName email manager department');

      if (section && section.manager) {
        const sectionManagerId = section.manager._id.toString();
        if (!visited.has(sectionManagerId)) {
          chain.push(section.manager._id);
          visited.add(sectionManagerId);
          // Section manager'ın üst yöneticilerini de ekle
          await addManagerHierarchy(section.manager._id, chain, visited);
        }
      }

      // Üst bölümlerin yöneticilerini ekle (parentSection üzerinden yukarı)
      let currentSection = section;
      while (currentSection && currentSection.parentSection) {
        const parentSection = await WorkplaceSection.findById(currentSection.parentSection)
          .populate('manager', 'firstName lastName email manager department');

        if (parentSection && parentSection.manager) {
          const parentManagerId = parentSection.manager._id.toString();
          if (!visited.has(parentManagerId)) {
            chain.push(parentSection.manager._id);
            visited.add(parentManagerId);
            await addManagerHierarchy(parentSection.manager._id, chain, visited);
          }
        }

        currentSection = parentSection;
      }
    }

    // 6. SGK İşyeri yöneticisi (workplace.manager)
    if (employee.workplace) {
      const workplace = await Workplace.findById(employee.workplace)
        .populate('manager', 'firstName lastName email manager department');

      if (workplace && workplace.manager) {
        const workplaceManagerId = workplace.manager._id.toString();
        if (!visited.has(workplaceManagerId)) {
          chain.push(workplace.manager._id);
          visited.add(workplaceManagerId);
          // Workplace manager'ın üst yöneticilerini de ekle
          await addManagerHierarchy(workplace.manager._id, chain, visited);
        }
      }
    }

    // Approval chain'i employee'ye kaydet (validation olmadan)
    try {
      await Employee.findByIdAndUpdate(
        employee._id,
        { approvalChain: chain },
        { runValidators: false }
      );
    } catch (saveError) {
      console.warn('Approval chain kaydetme hatası (görmezden geliniyor):', saveError.message);
      // Kaydetme hatası olsa bile chain'i döndür
    }

    return chain;
  } catch (error) {
    console.error('Approval chain hesaplama hatası:', error);
    return [];
  }
}

/**
 * Manager'ın üst manager'larını recursive olarak ekler
 */
async function addManagerHierarchy(managerId, chain, visited) {
  const manager = await Employee.findById(managerId)
    .populate('manager', 'firstName lastName email manager department')
    .populate('department');

  if (!manager) {
    return;
  }

  // Manager'ın direkt manager'ı varsa ekle
  if (manager.manager) {
    const upperManagerId = manager.manager._id.toString();
    if (!visited.has(upperManagerId)) {
      chain.push(manager.manager._id);
      visited.add(upperManagerId);
      // Recursive olarak devam et
      await addManagerHierarchy(manager.manager._id, chain, visited);
    }
  }

  // Manager'ın departmanının yöneticisi varsa ve farklıysa ekle
  if (manager.department) {
    const dept = await Department.findById(manager.department)
      .populate('manager', 'firstName lastName email manager department')
      .populate('parentDepartment');

    if (dept && dept.manager) {
      const deptManagerId = dept.manager._id.toString();
      // Eğer departman yöneticisi manager'ın kendisi değilse ve chain'de yoksa ekle
      if (deptManagerId !== managerId.toString() && !visited.has(deptManagerId)) {
        chain.push(dept.manager._id);
        visited.add(deptManagerId);
        await addManagerHierarchy(dept.manager._id, chain, visited);
      }
    }

    // Üst departmanların yöneticilerini de ekle
    let currentDept = dept;
    while (currentDept && currentDept.parentDepartment) {
      const parentDept = await Department.findById(currentDept.parentDepartment)
        .populate('manager', 'firstName lastName email manager department')
        .populate('parentDepartment');

      if (parentDept && parentDept.manager) {
        const parentManagerId = parentDept.manager._id.toString();
        if (!visited.has(parentManagerId)) {
          chain.push(parentDept.manager._id);
          visited.add(parentManagerId);
          await addManagerHierarchy(parentDept.manager._id, chain, visited);
        }
      }

      currentDept = parentDept;
    }
  }
}

/**
 * Departman yöneticisi değiştiğinde, o departman ve alt departmanlardaki
 * tüm çalışanların approval chain'lerini güncelle
 */
async function updateDepartmentEmployeesApprovalChain(departmentId) {
  try {
    // Departman ve tüm alt departmanları bul (recursive)
    const getAllSubDepartments = async (deptId) => {
      const departments = [deptId];
      const subDepts = await Department.find({ parentDepartment: deptId });
      for (const subDept of subDepts) {
        const subSubDepts = await getAllSubDepartments(subDept._id);
        departments.push(...subSubDepts);
      }
      return departments;
    };

    const departmentIds = await getAllSubDepartments(departmentId);

    // Bu departmanlardaki tüm çalışanları bul
    const employees = await Employee.find({
      department: { $in: departmentIds }
    });

    // Her çalışan için approval chain'i yeniden hesapla
    for (const employee of employees) {
      await calculateApprovalChain(employee._id);
    }

    return { success: true, updatedCount: employees.length };
  } catch (error) {
    console.error('Departman çalışanları approval chain güncelleme hatası:', error);
    throw error;
  }
}

/**
 * Çalışanın manager'ı değiştiğinde approval chain'i güncelle
 */
async function updateEmployeeApprovalChain(employeeId) {
  try {
    return await calculateApprovalChain(employeeId);
  } catch (error) {
    console.error('Çalışan approval chain güncelleme hatası:', error);
    throw error;
  }
}

/**
 * SGK İşyeri yöneticisi değiştiğinde, o işyerindeki
 * tüm çalışanların approval chain'lerini güncelle
 */
async function updateWorkplaceEmployeesApprovalChain(workplaceId) {
  try {
    // Bu işyerindeki tüm çalışanları bul
    const employees = await Employee.find({
      workplace: workplaceId,
      isActive: true
    });

    // Her çalışan için approval chain'i yeniden hesapla
    for (const employee of employees) {
      await calculateApprovalChain(employee._id);
    }

    return { success: true, updatedCount: employees.length };
  } catch (error) {
    console.error('İşyeri çalışanları approval chain güncelleme hatası:', error);
    throw error;
  }
}

/**
 * İşyeri Bölümü yöneticisi değiştiğinde, o bölümdeki ve alt bölümlerdeki
 * tüm çalışanların approval chain'lerini güncelle
 */
async function updateWorkplaceSectionEmployeesApprovalChain(sectionId) {
  try {
    // Bölüm ve tüm alt bölümleri bul (recursive)
    const getAllSubSections = async (secId) => {
      const sections = [secId];
      const subSections = await WorkplaceSection.find({ parentSection: secId });
      for (const subSec of subSections) {
        const subSubSections = await getAllSubSections(subSec._id);
        sections.push(...subSubSections);
      }
      return sections;
    };

    const sectionIds = await getAllSubSections(sectionId);

    // Bu bölümlerdeki tüm çalışanları bul
    const employees = await Employee.find({
      workplaceSection: { $in: sectionIds },
      isActive: true
    });

    // Her çalışan için approval chain'i yeniden hesapla
    for (const employee of employees) {
      await calculateApprovalChain(employee._id);
    }

    return { success: true, updatedCount: employees.length };
  } catch (error) {
    console.error('Bölüm çalışanları approval chain güncelleme hatası:', error);
    throw error;
  }
}

module.exports = {
  calculateApprovalChain,
  updateDepartmentEmployeesApprovalChain,
  updateEmployeeApprovalChain,
  updateWorkplaceEmployeesApprovalChain,
  updateWorkplaceSectionEmployeesApprovalChain
};
