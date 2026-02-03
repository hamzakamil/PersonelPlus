const LeaveType = require('../models/LeaveType');
const CompanyLeaveType = require('../models/CompanyLeaveType');
const LeaveSubType = require('../models/LeaveSubType');

/**
 * Global default LeaveType kayıtlarını oluşturur (ilk kurulum için)
 */
async function initializeGlobalLeaveTypes() {
  try {
    // Zaten kayıtlar varsa atla
    const existingCount = await LeaveType.countDocuments({ isDefault: true });
    if (existingCount > 0) {
      return { success: true, message: 'Global izin türleri zaten mevcut' };
    }

    // Global default izin türleri
    const globalTypes = [
      {
        name: 'Yıllık izin (Ücretli İzin)',
        description: 'Yıllık ücretli izin',
        isDefault: true,
        code: 'ANNUAL_LEAVE',
        attendanceCode: 'S',
        defaultDays: 14,
        isOtherCategory: false
      },
      {
        name: 'Hastalık izni (Rapor İzni)',
        description: 'Hastalık raporu ile alınan izin',
        isDefault: true,
        code: 'SICK_LEAVE',
        attendanceCode: 'R',
        defaultDays: 0,
        isOtherCategory: false
      },
      {
        name: 'Mazeret izni (Ücretsiz İzin)',
        description: 'Ücretsiz mazeret izni',
        isDefault: true,
        code: 'UNPAID_LEAVE',
        attendanceCode: 'U',
        defaultDays: 0,
        isOtherCategory: false
      },
      {
        name: 'Saatlik İzin',
        description: 'Saatlik izin',
        isDefault: true,
        code: 'HOURLY_LEAVE',
        attendanceCode: 'SI',
        defaultDays: 0,
        isOtherCategory: false
      },
      {
        name: 'Diğer',
        description: 'Diğer izin türleri',
        isDefault: true,
        code: 'OTHER',
        attendanceCode: 'D',
        defaultDays: 0,
        isOtherCategory: true
      }
    ];

    await LeaveType.insertMany(globalTypes);

    return { success: true, message: 'Global izin türleri oluşturuldu' };
  } catch (error) {
    console.error('Global izin türleri oluşturulurken hata:', error);
    throw error;
  }
}

/**
 * Yeni şirket oluşturulduğunda global default LeaveType'ları CompanyLeaveType'a kopyalar
 * @param {String} companyId - Şirket ID'si
 */
async function initializeCompanyLeaveTypes(companyId) {
  try {
    // Global default LeaveType'ları bul
    const globalDefaults = await LeaveType.find({ isDefault: true, isActive: true });

    if (globalDefaults.length === 0) {
      await initializeGlobalLeaveTypes();
      const refreshed = await LeaveType.find({ isDefault: true, isActive: true });
      globalDefaults.push(...refreshed);
    }

    // Her global default için CompanyLeaveType oluştur
    const companyLeaveTypes = globalDefaults.map(globalType => ({
      company: companyId,
      leaveType: globalType._id,
      name: globalType.name,
      description: globalType.description,
      isActive: true,
      customDays: null,
      isDefault: true,
      isOtherCategory: globalType.isOtherCategory
    }));

    const createdCompanyLeaveTypes = await CompanyLeaveType.insertMany(companyLeaveTypes);

    // "Diğer" kategorisi için alt izin türlerini oluştur
    const globalOtherCategory = globalDefaults.find(gt => gt.isOtherCategory);
    if (globalOtherCategory) {
      const companyOtherCategory = createdCompanyLeaveTypes.find(lt =>
        lt.leaveType && lt.leaveType.toString() === globalOtherCategory._id.toString()
      ) || await CompanyLeaveType.findOne({
        company: companyId,
        leaveType: globalOtherCategory._id
      });

      if (companyOtherCategory) {
        const subTypes = [
          { name: 'Babalık izni', description: 'Babalık izni', isDefault: true },
          { name: 'Evlilik izni', description: 'Evlilik izni', isDefault: true },
          { name: 'Ölüm izni', description: 'Ölüm izni', isDefault: true },
          { name: 'Doğum izni', description: 'Doğum izni', isDefault: true }
        ];

        const companySubTypes = subTypes.map(subType => ({
          name: subType.name,
          description: subType.description,
          parentLeaveType: companyOtherCategory._id,
          company: companyId,
          isDefault: subType.isDefault
        }));

        await LeaveSubType.insertMany(companySubTypes);
      }
    }

    return { success: true, message: 'Şirket izin türleri oluşturuldu' };
  } catch (error) {
    console.error('Şirket izin türleri oluşturulurken hata:', error);
    throw error;
  }
}

module.exports = {
  initializeGlobalLeaveTypes,
  initializeCompanyLeaveTypes
};
