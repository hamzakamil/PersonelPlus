/**
 * SGK Meslek Kodları veritabanı kontrol script'i
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SgkMeslekKodu = require('../models/SgkMeslekKodu');

async function check() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pys';
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB bağlantısı başarılı.\n');

    // Toplam kayıt sayısı
    const totalCount = await SgkMeslekKodu.countDocuments();
    console.log(`Toplam kayıt sayısı: ${totalCount}`);

    // adNormalized alanı boş olan kayıtlar
    const nullNormalizedCount = await SgkMeslekKodu.countDocuments({ adNormalized: { $exists: false } });
    const emptyNormalizedCount = await SgkMeslekKodu.countDocuments({ adNormalized: null });
    const emptyStringNormalizedCount = await SgkMeslekKodu.countDocuments({ adNormalized: '' });

    console.log(`\nadNormalized alanı:`)
    console.log(`  - $exists: false olan: ${nullNormalizedCount}`);
    console.log(`  - null olan: ${emptyNormalizedCount}`);
    console.log(`  - boş string olan: ${emptyStringNormalizedCount}`);

    // Örnek kayıtları göster
    console.log('\n📋 Örnek kayıtlar (ilk 5):');
    const samples = await SgkMeslekKodu.find().limit(5).lean();
    samples.forEach(s => {
      console.log(`  Kod: ${s.kod}`);
      console.log(`  Ad: ${s.ad}`);
      console.log(`  adNormalized: ${s.adNormalized || '(BOŞ)'}`);
      console.log('  ---');
    });

    // "yazılım" veya "bilgisayar" içeren kayıtları ara
    console.log('\n🔍 "yazılım" içeren kayıtlar:');
    const yazilimResults = await SgkMeslekKodu.find({
      $or: [
        { ad: { $regex: 'yazılım', $options: 'i' } },
        { ad: { $regex: 'yazilim', $options: 'i' } },
        { adNormalized: { $regex: 'yazilim', $options: 'i' } }
      ]
    }).limit(10).lean();

    if (yazilimResults.length === 0) {
      console.log('  Bulunamadı');
    } else {
      yazilimResults.forEach(s => {
        console.log(`  ${s.kod} - ${s.ad}`);
      });
    }

    console.log('\n🔍 "bilgisayar" içeren kayıtlar:');
    const bilgisayarResults = await SgkMeslekKodu.find({
      $or: [
        { ad: { $regex: 'bilgisayar', $options: 'i' } },
        { adNormalized: { $regex: 'bilgisayar', $options: 'i' } }
      ]
    }).limit(10).lean();

    if (bilgisayarResults.length === 0) {
      console.log('  Bulunamadı');
    } else {
      bilgisayarResults.forEach(s => {
        console.log(`  ${s.kod} - ${s.ad}`);
      });
    }

    console.log('\n🔍 "mühendis" içeren kayıtlar:');
    const muhendisResults = await SgkMeslekKodu.find({
      $or: [
        { ad: { $regex: 'mühendis', $options: 'i' } },
        { ad: { $regex: 'muhendis', $options: 'i' } },
        { adNormalized: { $regex: 'muhendis', $options: 'i' } }
      ]
    }).limit(10).lean();

    if (muhendisResults.length === 0) {
      console.log('  Bulunamadı');
    } else {
      muhendisResults.forEach(s => {
        console.log(`  ${s.kod} - ${s.ad}`);
      });
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı.');
  }
}

check();
