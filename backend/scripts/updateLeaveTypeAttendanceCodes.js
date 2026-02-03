const mongoose = require('mongoose');
require('dotenv').config();
const LeaveType = require('../models/LeaveType');

/**
 * Mevcut LeaveType'lara attendanceCode ekler
 * Bu script bir kez çalıştırılmalı
 */
async function updateLeaveTypeAttendanceCodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlandı');

    // Kod eşleştirmeleri
    const codeMapping = {
      'ANNUAL_LEAVE': 'S',    // Senelik/Yıllık izin
      'SICK_LEAVE': 'R',      // Rapor
      'UNPAID_LEAVE': 'U',    // Ücretsiz izin
      'HOURLY_LEAVE': 'SI',   // Saatlik İzin
      'OTHER': 'D'            // Diğer
    };

    // Tüm LeaveType'ları güncelle
    for (const [code, attendanceCode] of Object.entries(codeMapping)) {
      const result = await LeaveType.updateOne(
        { code: code, attendanceCode: { $exists: false } },
        { $set: { attendanceCode: attendanceCode } }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ ${code} -> attendanceCode: ${attendanceCode} eklendi`);
      } else {
        // attendanceCode zaten varsa veya null ise güncelle
        const result2 = await LeaveType.updateOne(
          { code: code },
          { $set: { attendanceCode: attendanceCode } }
        );
        if (result2.modifiedCount > 0) {
          console.log(`✅ ${code} -> attendanceCode: ${attendanceCode} güncellendi`);
        } else {
          console.log(`ℹ️  ${code} zaten güncel veya bulunamadı`);
        }
      }
    }

    console.log('\n✅ LeaveType attendanceCode güncelleme tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

updateLeaveTypeAttendanceCodes();
