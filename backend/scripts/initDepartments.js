const mongoose = require('mongoose');
const Department = require('../models/Department');
const Company = require('../models/Company');
require('dotenv').config();

const initDepartments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim');

    console.log('MongoDB bağlandı');

    // Tüm şirketleri bul
    const companies = await Company.find({ isActive: true });

    if (companies.length === 0) {
      console.log('Hiç şirket bulunamadı. Önce şirket oluşturmanız gerekiyor.');
      process.exit(0);
    }

    // Her şirket için default departmanları oluştur
    for (const company of companies) {
      console.log(`\n${company.name} şirketi için departmanlar oluşturuluyor...`);

      // Ofis Bölümü (ana departman - parent)
      let ofisBolumu = await Department.findOne({ 
        company: company._id, 
        name: 'Ofis Bölümü',
        parent: null // Top-level
      });

      if (!ofisBolumu) {
        ofisBolumu = await Department.create({
          name: 'Ofis Bölümü',
          company: company._id,
          parent: null,
          description: 'Ofis bölümü departmanları'
        });
        console.log(`  ✓ Ofis Bölümü oluşturuldu`);
      } else {
        console.log(`  - Ofis Bölümü zaten mevcut`);
      }

      // Muhasebe departmanı (Ofis Bölümü altında)
      const muhasebe = await Department.findOne({ 
        company: company._id, 
        name: 'Muhasebe',
        parent: ofisBolumu._id
      });
      if (!muhasebe) {
        await Department.create({
          name: 'Muhasebe',
          company: company._id,
          parent: ofisBolumu._id,
          description: 'Muhasebe departmanı'
        });
        console.log(`  ✓ Muhasebe oluşturuldu (Ofis Bölümü altında)`);
      }

      // Satış Pazarlama departmanı (Ofis Bölümü altında)
      const satisPazarlama = await Department.findOne({ 
        company: company._id, 
        name: 'Satış Pazarlama',
        parent: ofisBolumu._id
      });
      if (!satisPazarlama) {
        await Department.create({
          name: 'Satış Pazarlama',
          company: company._id,
          parent: ofisBolumu._id,
          description: 'Satış ve pazarlama departmanı'
        });
        console.log(`  ✓ Satış Pazarlama oluşturuldu (Ofis Bölümü altında)`);
      }

      // Diğer örnek departmanlar (top-level - Ofis Bölümü altında değil)
      const exampleDepartments = [
        { name: 'Pazarlama Departmanı', description: 'Pazarlama ve reklam departmanı' },
        { name: 'Üretim Departmanı', description: 'Üretim ve imalat departmanı' },
        { name: 'Depo Sevkiyat', description: 'Depo ve sevkiyat departmanı' },
        { name: 'Satın Alma', description: 'Satın alma departmanı' }
      ];

      for (const dept of exampleDepartments) {
        const existing = await Department.findOne({ 
          company: company._id, 
          name: dept.name,
          parent: null // Top-level
        });
        if (!existing) {
          await Department.create({
            name: dept.name,
            company: company._id,
            parent: null,
            description: dept.description
          });
          console.log(`  ✓ ${dept.name} oluşturuldu`);
        }
      }
    }

    console.log('\n✓ Tüm default departmanlar oluşturuldu');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
};

initDepartments();

