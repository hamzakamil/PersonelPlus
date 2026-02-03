/**
 * Debug - Tüm verileri kontrol et
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlantısı başarılı\n');

    // Şirket sayısı
    const companyCount = await Company.countDocuments();
    const activeCompanyCount = await Company.countDocuments({ isActive: true });
    console.log(`Toplam şirket: ${companyCount} (Aktif: ${activeCompanyCount})`);

    // İşyeri sayısı
    const workplaceCount = await Workplace.countDocuments();
    const activeWorkplaceCount = await Workplace.countDocuments({ isActive: true });
    console.log(`Toplam işyeri: ${workplaceCount} (Aktif: ${activeWorkplaceCount})`);

    // Çalışan sayısı
    const employeeCount = await Employee.countDocuments();
    const activeEmployeeCount = await Employee.countDocuments({ isActive: true });
    console.log(`Toplam çalışan: ${employeeCount} (Aktif: ${activeEmployeeCount})`);

    // Departman sayısı
    const deptCount = await Department.countDocuments();
    const activeDeptCount = await Department.countDocuments({ isActive: true });
    console.log(`Toplam departman: ${deptCount} (Aktif: ${activeDeptCount})`);

    // Tüm işyerlerini listele
    console.log('\n--- TÜM İŞYERLERİ ---');
    const allWorkplaces = await Workplace.find().populate('company', 'name').populate('manager', 'firstName lastName');

    if (allWorkplaces.length === 0) {
      console.log('Hiç işyeri bulunamadı!');
    } else {
      allWorkplaces.forEach(wp => {
        const companyName = wp.company?.name || 'Şirket yok';
        const status = wp.isActive !== false ? 'AKTİF' : 'PASİF';
        const isDefault = wp.isDefault ? ' [VARSAYILAN]' : '';
        const manager = wp.manager ? ` Yön: ${wp.manager.firstName} ${wp.manager.lastName}` : '';
        console.log(`  [${status}] ${wp.name}${isDefault} - ${companyName}${manager}`);
      });
    }

    // Tüm şirketleri listele
    console.log('\n--- TÜM ŞİRKETLER ---');
    const allCompanies = await Company.find();
    allCompanies.forEach(c => {
      const status = c.isActive !== false ? 'AKTİF' : 'PASİF';
      console.log(`  [${status}] ${c.name} (${c._id})`);
    });

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

debug();
