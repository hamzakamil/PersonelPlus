/**
 * Paket Seed Script
 * Varsayılan paketleri veritabanına ekler
 *
 * Kullanım: node scripts/seedPackages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('../models/Package');

const packages = [
  {
    name: '10 Kişilik Paket',
    code: 'PKG_10',
    employeeLimit: 10,
    monthlyPrice: 750,
    yearlyPrice: 7500,
    pricePerEmployee: 75,
    sortOrder: 1,
    description: 'Küçük işletmeler için ideal başlangıç paketi',
    features: [
      { name: 'Temel İK yönetimi', enabled: true },
      { name: 'Puantaj takibi', enabled: true },
      { name: 'İzin yönetimi', enabled: true },
      { name: 'Email desteği', enabled: true }
    ],
    isActive: true
  },
  {
    name: '50 Kişilik Paket',
    code: 'PKG_50',
    employeeLimit: 50,
    monthlyPrice: 2500,
    yearlyPrice: 25000,
    pricePerEmployee: 50,
    sortOrder: 2,
    description: 'Büyüyen işletmeler için ekonomik çözüm',
    features: [
      { name: 'Temel İK yönetimi', enabled: true },
      { name: 'Puantaj takibi', enabled: true },
      { name: 'İzin yönetimi', enabled: true },
      { name: 'Email desteği', enabled: true },
      { name: 'Raporlama', enabled: true }
    ],
    isActive: true
  },
  {
    name: '100 Kişilik Paket',
    code: 'PKG_100',
    employeeLimit: 100,
    monthlyPrice: 4000,
    yearlyPrice: 40000,
    pricePerEmployee: 40,
    sortOrder: 3,
    description: 'Orta ölçekli işletmeler için profesyonel çözüm',
    highlightText: 'En Popüler',
    features: [
      { name: 'Temel İK yönetimi', enabled: true },
      { name: 'Puantaj takibi', enabled: true },
      { name: 'İzin yönetimi', enabled: true },
      { name: 'Öncelikli destek', enabled: true },
      { name: 'Gelişmiş raporlama', enabled: true },
      { name: 'API erişimi', enabled: true }
    ],
    isActive: true
  },
  {
    name: '250 Kişilik Paket',
    code: 'PKG_250',
    employeeLimit: 250,
    monthlyPrice: 8750,
    yearlyPrice: 87500,
    pricePerEmployee: 35,
    sortOrder: 4,
    description: 'Büyük işletmeler için kapsamlı çözüm',
    features: [
      { name: 'Temel İK yönetimi', enabled: true },
      { name: 'Puantaj takibi', enabled: true },
      { name: 'İzin yönetimi', enabled: true },
      { name: 'Öncelikli destek', enabled: true },
      { name: 'Gelişmiş raporlama', enabled: true },
      { name: 'API erişimi', enabled: true },
      { name: 'Özel entegrasyonlar', enabled: true }
    ],
    isActive: true
  },
  {
    name: '500 Kişilik Paket',
    code: 'PKG_500',
    employeeLimit: 500,
    monthlyPrice: 15000,
    yearlyPrice: 150000,
    pricePerEmployee: 30,
    sortOrder: 5,
    description: 'Kurumsal müşteriler için gelişmiş çözüm',
    features: [
      { name: 'Temel İK yönetimi', enabled: true },
      { name: 'Puantaj takibi', enabled: true },
      { name: 'İzin yönetimi', enabled: true },
      { name: '7/24 destek', enabled: true },
      { name: 'Gelişmiş raporlama', enabled: true },
      { name: 'API erişimi', enabled: true },
      { name: 'Özel entegrasyonlar', enabled: true },
      { name: 'Dedicated hesap yöneticisi', enabled: true }
    ],
    isActive: true
  },
  {
    name: '1000 Kişilik Paket',
    code: 'PKG_1000',
    employeeLimit: 1000,
    monthlyPrice: 25000,
    yearlyPrice: 250000,
    pricePerEmployee: 25,
    sortOrder: 6,
    description: 'Enterprise müşteriler için tam kapsamlı çözüm',
    highlightText: 'Kurumsal',
    features: [
      { name: 'Temel İK yönetimi', enabled: true },
      { name: 'Puantaj takibi', enabled: true },
      { name: 'İzin yönetimi', enabled: true },
      { name: '7/24 öncelikli destek', enabled: true },
      { name: 'Gelişmiş raporlama', enabled: true },
      { name: 'Sınırsız API erişimi', enabled: true },
      { name: 'Özel entegrasyonlar', enabled: true },
      { name: 'Dedicated hesap yöneticisi', enabled: true },
      { name: 'Özel eğitim', enabled: true },
      { name: 'SLA garantisi', enabled: true }
    ],
    isActive: true
  }
];

async function seedPackages() {
  try {
    // MongoDB'ye bağlan
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/untitled4';
    await mongoose.connect(mongoUri);
    console.log('MongoDB bağlantısı başarılı');

    // Mevcut paketleri kontrol et
    const existingCount = await Package.countDocuments();
    console.log(`Mevcut paket sayısı: ${existingCount}`);

    if (existingCount > 0) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('Mevcut paketler silinsin mi? (y/n): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'y') {
        await Package.deleteMany({});
        console.log('Mevcut paketler silindi');
      } else {
        console.log('Mevcut paketler korunuyor, sadece eksik paketler eklenecek');
      }
    }

    // Paketleri ekle
    let addedCount = 0;
    let skippedCount = 0;

    for (const pkg of packages) {
      const existing = await Package.findOne({ code: pkg.code });
      if (existing) {
        console.log(`Paket zaten mevcut: ${pkg.name} (${pkg.code})`);
        skippedCount++;
      } else {
        await Package.create(pkg);
        console.log(`Paket eklendi: ${pkg.name} (${pkg.code})`);
        addedCount++;
      }
    }

    console.log('\n--- Özet ---');
    console.log(`Eklenen paket: ${addedCount}`);
    console.log(`Atlanan paket: ${skippedCount}`);
    console.log(`Toplam paket: ${await Package.countDocuments()}`);

    // Tüm paketleri listele
    console.log('\n--- Paket Listesi ---');
    const allPackages = await Package.find().sort({ sortOrder: 1 });
    allPackages.forEach(pkg => {
      console.log(`${pkg.sortOrder}. ${pkg.name} - ${pkg.employeeLimit} kişi - ${pkg.monthlyPrice} TL/ay`);
    });

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

// Script doğrudan çalıştırılıyorsa seed et
if (require.main === module) {
  seedPackages();
}

module.exports = { seedPackages, packages };
