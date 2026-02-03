// backend/scripts/seedDepartments.js
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Company = require('../models/Company');
require('dotenv').config();

const seedDepartments = async () => {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // İlk şirketi al (veya belirli bir şirketi seçebilirsiniz)
    const company = await Company.findOne();
    
    if (!company) {
      console.log('❌ Hiç şirket bulunamadı. Önce bir şirket oluşturun.');
      process.exit(1);
    }

    console.log(`📋 Şirket: ${company.name}`);

    // Merkez İşyeri kontrolü
    let merkezDepartment = await Department.findOne({ 
      company: company._id, 
      isDefault: true 
    });

    if (!merkezDepartment) {
      console.log('⚠️  Merkez İşyeri bulunamadı, oluşturuluyor...');
      merkezDepartment = await Department.create({
        name: 'Merkez',
        company: company._id,
        isDefault: true,
        isActive: true,
        description: 'SGK Merkez İşyeri'
      });
      console.log('✅ Merkez İşyeri oluşturuldu');
    } else {
      console.log('✅ Merkez İşyeri mevcut');
    }

    // Mevcut departmanları kontrol et
    const existingDepts = await Department.find({ 
      company: company._id,
      isDefault: false
    });
    
    const existingNames = existingDepts.map(d => d.name);
    console.log(`📊 Mevcut departmanlar: ${existingNames.join(', ') || 'Yok'}`);

    // Örnek departmanlar
    const sampleDepartments = [
      {
        name: 'Satın Alma',
        parentDepartment: merkezDepartment._id,
        description: 'Satın alma ve tedarik departmanı',
        isActive: true
      },
      {
        name: 'Depo Sevkiyat',
        parentDepartment: merkezDepartment._id,
        description: 'Depo ve sevkiyat işlemleri',
        isActive: true
      },
      {
        name: 'Üretim Departmanı',
        parentDepartment: merkezDepartment._id,
        description: 'Üretim ve imalat departmanı',
        isActive: true
      },
      {
        name: 'Pazarlama Departmanı',
        parentDepartment: merkezDepartment._id,
        description: 'Pazarlama ve satış departmanı',
        isActive: true
      }
    ];

    console.log('\n🏗️  Departmanlar oluşturuluyor...');
    
    for (const deptData of sampleDepartments) {
      // Zaten var mı kontrol et
      const existing = await Department.findOne({
        company: company._id,
        name: deptData.name
      });

      if (existing) {
        console.log(`⏭️  "${deptData.name}" zaten mevcut, atlanıyor...`);
        continue;
      }

      const dept = await Department.create({
        ...deptData,
        company: company._id
      });
      console.log(`✅ Departman oluşturuldu: ${dept.name}`);
    }

    // Üretim Departmanı'nı bul
    const uretimDept = await Department.findOne({
      company: company._id,
      name: 'Üretim Departmanı'
    });

    if (uretimDept) {
      console.log('\n🔧 Üretim Departmanı altına bölüm ekleniyor...');
      
      // Montaj Bölümü kontrolü
      const montajBolum = await Department.findOne({
        company: company._id,
        name: 'Montaj Bölümü'
      });

      if (montajBolum) {
        console.log('⏭️  "Montaj Bölümü" zaten mevcut, atlanıyor...');
      } else {
        const bolum = await Department.create({
          name: 'Montaj Bölümü',
          parentDepartment: uretimDept._id,
          company: company._id,
          description: 'Montaj işlemleri bölümü',
          isActive: true
        });
        console.log(`✅ Bölüm oluşturuldu: ${bolum.name}`);
      }
    }

    // Final rapor
    console.log('\n📊 ÖZET RAPOR:');
    const allDepartments = await Department.find({ company: company._id })
      .populate('parentDepartment', 'name');
    
    console.log('\n🏢 Şirket Yapısı:');
    console.log('─────────────────────────────────────');
    
    // Merkez
    const merkez = allDepartments.find(d => d.isDefault);
    if (merkez) {
      console.log(`📍 ${merkez.name} (SGK Merkez İşyeri)`);
      
      // Merkez altındaki departmanlar
      const deptUnderMerkez = allDepartments.filter(d => 
        d.parentDepartment && d.parentDepartment._id.toString() === merkez._id.toString()
      );
      
      deptUnderMerkez.forEach(dept => {
        console.log(`   └─ ${dept.name} ${dept.description ? `(${dept.description})` : ''}`);
        
        // Bu departman altındaki bölümler
        const sections = allDepartments.filter(s => 
          s.parentDepartment && s.parentDepartment._id.toString() === dept._id.toString()
        );
        
        sections.forEach(section => {
          console.log(`      └─ ${section.name} ${section.description ? `(${section.description})` : ''}`);
        });
      });
    }

    // Diğer bağımsız departmanlar
    const independent = allDepartments.filter(d => 
      !d.isDefault && !d.parentDepartment
    );
    
    if (independent.length > 0) {
      console.log('\n🔹 Bağımsız Departmanlar:');
      independent.forEach(dept => {
        console.log(`   • ${dept.name}`);
      });
    }

    console.log('\n✨ İşlem tamamlandı!');
    console.log(`📈 Toplam departman/bölüm sayısı: ${allDepartments.length}`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
};

seedDepartments();
