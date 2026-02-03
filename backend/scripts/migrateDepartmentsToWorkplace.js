/**
 * Migration Script: Departmanlari Merkez Isyerine Ata
 *
 * Bu script, workplace alani olmayan tum departmanlari
 * ilgili sirketin varsayilan (Merkez) isyerine atar.
 *
 * Kullanim: node scripts/migrateDepartmentsToWorkplace.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Model'leri dogru sirada yukle
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const Department = require('../models/Department');

async function migrate() {
  try {
    // MongoDB baglan
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB baglantisi basarili');

    // Workplace atanmamis departmanlari bul
    const unassignedDepartments = await Department.find({
      $or: [
        { workplace: null },
        { workplace: { $exists: false } }
      ]
    }).populate('company', 'name');

    console.log(`\n${unassignedDepartments.length} adet workplace atanmamis departman bulundu.\n`);

    if (unassignedDepartments.length === 0) {
      console.log('Islem yapilacak departman yok.');
      process.exit(0);
    }

    // Sirket bazinda grupla
    const byCompany = {};
    for (const dept of unassignedDepartments) {
      const companyId = dept.company?._id?.toString() || dept.company?.toString();
      if (!companyId) {
        console.log(`UYARI: ${dept.name} departmaninin sirketi bulunamadi, atlaniyor.`);
        continue;
      }
      if (!byCompany[companyId]) {
        byCompany[companyId] = {
          companyName: dept.company?.name || 'Bilinmeyen',
          departments: []
        };
      }
      byCompany[companyId].departments.push(dept);
    }

    let totalUpdated = 0;
    let totalFailed = 0;

    // Her sirket icin islem yap
    for (const [companyId, data] of Object.entries(byCompany)) {
      console.log(`\n--- Sirket: ${data.companyName} (${companyId}) ---`);
      console.log(`   ${data.departments.length} departman guncellenmeli`);

      // Bu sirketin varsayilan (Merkez) isyerini bul
      const defaultWorkplace = await Workplace.findOne({
        company: companyId,
        isDefault: true
      });

      if (!defaultWorkplace) {
        console.log(`   HATA: Bu sirketin varsayilan isyeri bulunamadi!`);

        // Varsayilan isyeri yoksa ilk isyeriyi kullan
        const anyWorkplace = await Workplace.findOne({ company: companyId });
        if (!anyWorkplace) {
          console.log(`   HATA: Bu sirkette hic isyeri yok! Departmanlar atlaniyor.`);
          totalFailed += data.departments.length;
          continue;
        }

        console.log(`   BILGI: Ilk isyeri kullanilacak: ${anyWorkplace.name}`);

        // Departmanlari guncelle
        for (const dept of data.departments) {
          await Department.findByIdAndUpdate(dept._id, { workplace: anyWorkplace._id });
          console.log(`   + ${dept.name} -> ${anyWorkplace.name}`);
          totalUpdated++;
        }
      } else {
        console.log(`   Varsayilan isyeri: ${defaultWorkplace.name}`);

        // Departmanlari guncelle
        for (const dept of data.departments) {
          await Department.findByIdAndUpdate(dept._id, { workplace: defaultWorkplace._id });
          console.log(`   + ${dept.name} -> ${defaultWorkplace.name}`);
          totalUpdated++;
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`SONUC:`);
    console.log(`  Guncellenen: ${totalUpdated} departman`);
    console.log(`  Basarisiz: ${totalFailed} departman`);
    console.log(`========================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('Migration hatasi:', error);
    process.exit(1);
  }
}

migrate();
