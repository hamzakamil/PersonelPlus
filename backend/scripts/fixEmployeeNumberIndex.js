/**
 * Bu script, employeeNumber alanındaki eski global unique index'i kaldırır
 * ve yerine şirket bazlı compound index kullanılmasını sağlar.
 *
 * Kullanım: node scripts/fixEmployeeNumberIndex.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim';

async function fixIndex() {
  try {
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');

    const db = mongoose.connection.db;
    const collection = db.collection('employees');

    // Mevcut index'leri listele
    console.log('\nMevcut index\'ler:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}`);
    });

    // employeeNumber_1 index'ini bul ve sil
    const oldIndex = indexes.find(idx => idx.name === 'employeeNumber_1');
    if (oldIndex) {
      console.log('\n"employeeNumber_1" index\'i bulundu, siliniyor...');
      await collection.dropIndex('employeeNumber_1');
      console.log('✓ "employeeNumber_1" index\'i başarıyla silindi!');
    } else {
      console.log('\n"employeeNumber_1" index\'i bulunamadı (zaten silinmiş olabilir)');
    }

    // tcKimlik_1 global index varsa onu da sil
    const tcKimlikIndex = indexes.find(idx => idx.name === 'tcKimlik_1');
    if (tcKimlikIndex) {
      console.log('\n"tcKimlik_1" global index\'i bulundu, siliniyor...');
      await collection.dropIndex('tcKimlik_1');
      console.log('✓ "tcKimlik_1" index\'i başarıyla silindi!');
    }

    // Güncellenmiş index'leri listele
    console.log('\nGüncellenmiş index\'ler:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}`);
    });

    console.log('\n✓ İşlem tamamlandı!');
    console.log('Not: Yeni compound index\'ler uygulama başlatıldığında otomatik oluşturulacak.');

  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

fixIndex();
