/**
 * Tüm işyerlerini listele
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

async function listAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlantısı başarılı\n');

    const companies = await Company.find({ isActive: true });

    for (const company of companies) {
      const workplaces = await Workplace.find({
        company: company._id
      }).populate('manager', 'firstName lastName');

      if (workplaces.length === 0) continue;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`ŞİRKET: ${company.name}`);
      console.log('='.repeat(60));

      for (const wp of workplaces) {
        const employees = await Employee.find({ workplace: wp._id });
        const departments = await Department.find({ workplace: wp._id });

        const status = wp.isActive ? '✓ AKTİF' : '✗ PASİF';
        const isDefault = wp.isDefault ? ' [VARSAYILAN]' : '';

        console.log(`\n  ${status} - ${wp.name}${isDefault}`);
        console.log(`    ID: ${wp._id}`);
        console.log(`    SGK No: ${wp.sgkRegisterNumber || '-'}`);
        console.log(`    Çalışan sayısı: ${employees.length}`);
        console.log(`    Departman sayısı: ${departments.length}`);
        if (wp.manager) {
          console.log(`    Yönetici: ${wp.manager.firstName} ${wp.manager.lastName}`);
        }
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nMongoDB bağlantısı kapatıldı');
  }
}

listAll();
