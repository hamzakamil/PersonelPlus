require('dotenv').config();
const mongoose = require('mongoose');
const { initializeGlobalLeaveTypes, initializeCompanyLeaveTypes } = require('../services/leaveTypeInitializer');
const Company = require('../models/Company');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlandı');

    // 1. Global leave types'ları oluştur (eğer yoksa)
    console.log('Global leave types kontrol ediliyor...');
    await initializeGlobalLeaveTypes();
    console.log('✅ Global leave types hazır');

    // 2. Tüm şirketler için leave types oluştur
    const companies = await Company.find({});
    console.log(`\n${companies.length} şirket bulundu. Leave types oluşturuluyor...`);

    for (const company of companies) {
      try {
        // Şirket için leave types zaten var mı kontrol et
        const CompanyLeaveType = require('../models/CompanyLeaveType');
        const existingCount = await CompanyLeaveType.countDocuments({ 
          company: company._id,
          isActive: true 
        });

        if (existingCount === 0) {
          console.log(`  - ${company.name} (${company._id}) için leave types oluşturuluyor...`);
          await initializeCompanyLeaveTypes(company._id);
          console.log(`  ✅ ${company.name} için leave types oluşturuldu`);
        } else {
          console.log(`  ⏭️  ${company.name} için zaten ${existingCount} leave type mevcut, atlanıyor`);
        }
      } catch (error) {
        console.error(`  ❌ ${company.name} için hata:`, error.message);
      }
    }

    console.log('\n✅ Tüm şirketler için leave types kontrol edildi');
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kesildi');
  }
}

run();




