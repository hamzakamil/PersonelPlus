/**
 * Migration Script: PENDING_DEALER_APPROVAL -> PENDING
 *
 * Bu script veritabanındaki tutarsız status değerlerini düzeltir.
 *
 * Kullanım:
 *   node scripts/fixPendingStatus.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixPendingStatus() {
  try {
    // MongoDB bağlantısı
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/personnel';
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB bağlantısı başarılı');

    // EmploymentPreRecord koleksiyonunu güncelle
    const preRecordResult = await mongoose.connection.db.collection('employmentprerecords').updateMany(
      {
        status: {
          $in: ['PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL', 'CANCELLATION_PENDING']
        }
      },
      {
        $set: { status: 'PENDING' }
      }
    );

    console.log(`EmploymentPreRecord güncellendi: ${preRecordResult.modifiedCount} kayıt`);

    // Employment koleksiyonunu güncelle (eski model)
    const employmentResult = await mongoose.connection.db.collection('employments').updateMany(
      {
        status: {
          $in: ['PENDING_DEALER_APPROVAL', 'PENDING_COMPANY_APPROVAL']
        }
      },
      {
        $set: { status: 'PENDING_COMPANY_APPROVAL' } // Eski model için PENDING_COMPANY_APPROVAL bırak
      }
    );

    console.log(`Employment güncellendi: ${employmentResult.modifiedCount} kayıt`);

    // Özet
    console.log('\n=== ÖZET ===');
    console.log(`Toplam güncellenen: ${preRecordResult.modifiedCount + employmentResult.modifiedCount} kayıt`);
    console.log('Migration tamamlandı!');

  } catch (error) {
    console.error('Migration hatası:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
fixPendingStatus();
