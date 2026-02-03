/**
 * Migration Script: Mevcut bayiler için selfCompany oluştur
 *
 * Bu script mevcut bayilere "Kendi Şirketim" oluşturur.
 * Bayi kendi çalışanlarını bu şirket üzerinden yönetebilir.
 *
 * Kullanım: node scripts/migrateDealerSelfCompanies.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');
const Company = require('../models/Company');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pys';

async function migrate() {
  try {
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');

    // selfCompany olmayan bayileri bul
    const dealersWithoutSelfCompany = await Dealer.find({
      $or: [
        { selfCompany: null },
        { selfCompany: { $exists: false } }
      ]
    });

    console.log(`\n${dealersWithoutSelfCompany.length} bayi için selfCompany oluşturulacak.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const dealer of dealersWithoutSelfCompany) {
      try {
        console.log(`İşleniyor: ${dealer.name} (${dealer._id})`);

        // Zaten isDealerSelfCompany olan bir şirket var mı kontrol et
        const existingSelfCompany = await Company.findOne({
          dealer: dealer._id,
          isDealerSelfCompany: true
        });

        if (existingSelfCompany) {
          console.log(`  -> Zaten selfCompany mevcut: ${existingSelfCompany.name}`);
          // Dealer'a referansı ekle
          dealer.selfCompany = existingSelfCompany._id;
          await dealer.save();
          successCount++;
          continue;
        }

        // Yeni selfCompany oluştur
        const selfCompany = new Company({
          name: `${dealer.name} (Kendi Şirketim)`,
          dealer: dealer._id,
          contactEmail: dealer.contactEmail,
          contactPhone: dealer.contactPhone,
          address: dealer.address,
          isDealerSelfCompany: true,
          isActive: true,
          isActivated: true,
          activatedAt: new Date()
        });
        await selfCompany.save();

        // Dealer'a referansı ekle
        dealer.selfCompany = selfCompany._id;
        await dealer.save();

        console.log(`  -> selfCompany oluşturuldu: ${selfCompany.name}`);
        successCount++;

      } catch (error) {
        console.error(`  -> HATA: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('Migration tamamlandı!');
    console.log(`Başarılı: ${successCount}`);
    console.log(`Hatalı: ${errorCount}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Migration hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

migrate();
