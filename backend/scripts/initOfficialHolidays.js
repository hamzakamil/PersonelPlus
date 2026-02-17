const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const OfficialHoliday = require('../models/OfficialHoliday');

// Türkiye Resmi Tatilleri (2024-2027)
const officialHolidays = [
  // ============ 2024 ============
  // Sabit Tatiller
  { name: 'Yılbaşı', date: '2024-01-01', type: 'important', isHalfDay: false },
  { name: 'Ulusal Egemenlik ve Çocuk Bayramı', date: '2024-04-23', type: 'national', isHalfDay: false },
  { name: 'Emek ve Dayanışma Günü', date: '2024-05-01', type: 'important', isHalfDay: false },
  { name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', date: '2024-05-19', type: 'national', isHalfDay: false },
  { name: 'Demokrasi ve Millî Birlik Günü', date: '2024-07-15', type: 'important', isHalfDay: true, halfDayPeriod: 'afternoon' },
  { name: 'Zafer Bayramı', date: '2024-08-30', type: 'national', isHalfDay: false },
  { name: 'Cumhuriyet Bayramı', date: '2024-10-29', type: 'national', isHalfDay: false },

  // Dini Bayramlar (2024)
  { name: 'Ramazan Bayramı Arefe', date: '2024-04-09', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Ramazan Bayramı 1. Gün', date: '2024-04-10', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 2. Gün', date: '2024-04-11', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 3. Gün', date: '2024-04-12', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı Arefe', date: '2024-06-15', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Kurban Bayramı 1. Gün', date: '2024-06-16', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 2. Gün', date: '2024-06-17', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 3. Gün', date: '2024-06-18', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 4. Gün', date: '2024-06-19', type: 'religious', isHalfDay: false, isRecurring: false },

  // ============ 2025 ============
  // Sabit Tatiller
  { name: 'Yılbaşı', date: '2025-01-01', type: 'important', isHalfDay: false },
  { name: 'Ulusal Egemenlik ve Çocuk Bayramı', date: '2025-04-23', type: 'national', isHalfDay: false },
  { name: 'Emek ve Dayanışma Günü', date: '2025-05-01', type: 'important', isHalfDay: false },
  { name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', date: '2025-05-19', type: 'national', isHalfDay: false },
  { name: 'Demokrasi ve Millî Birlik Günü', date: '2025-07-15', type: 'important', isHalfDay: true, halfDayPeriod: 'afternoon' },
  { name: 'Zafer Bayramı', date: '2025-08-30', type: 'national', isHalfDay: false },
  { name: 'Cumhuriyet Bayramı', date: '2025-10-29', type: 'national', isHalfDay: false },

  // Dini Bayramlar (2025)
  { name: 'Ramazan Bayramı Arefe', date: '2025-03-29', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Ramazan Bayramı 1. Gün', date: '2025-03-30', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 2. Gün', date: '2025-03-31', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 3. Gün', date: '2025-04-01', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı Arefe', date: '2025-06-05', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Kurban Bayramı 1. Gün', date: '2025-06-06', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 2. Gün', date: '2025-06-07', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 3. Gün', date: '2025-06-08', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 4. Gün', date: '2025-06-09', type: 'religious', isHalfDay: false, isRecurring: false },

  // ============ 2026 ============
  // Sabit Tatiller
  { name: 'Yılbaşı', date: '2026-01-01', type: 'important', isHalfDay: false },
  { name: 'Ulusal Egemenlik ve Çocuk Bayramı', date: '2026-04-23', type: 'national', isHalfDay: false },
  { name: 'Emek ve Dayanışma Günü', date: '2026-05-01', type: 'important', isHalfDay: false },
  { name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', date: '2026-05-19', type: 'national', isHalfDay: false },
  { name: 'Demokrasi ve Millî Birlik Günü', date: '2026-07-15', type: 'important', isHalfDay: true, halfDayPeriod: 'afternoon' },
  { name: 'Zafer Bayramı', date: '2026-08-30', type: 'national', isHalfDay: false },
  { name: 'Cumhuriyet Bayramı', date: '2026-10-29', type: 'national', isHalfDay: false },

  // Dini Bayramlar (2026)
  { name: 'Ramazan Bayramı Arefe', date: '2026-03-19', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Ramazan Bayramı 1. Gün', date: '2026-03-20', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 2. Gün', date: '2026-03-21', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 3. Gün', date: '2026-03-22', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı Arefe', date: '2026-05-26', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Kurban Bayramı 1. Gün', date: '2026-05-27', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 2. Gün', date: '2026-05-28', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 3. Gün', date: '2026-05-29', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 4. Gün', date: '2026-05-30', type: 'religious', isHalfDay: false, isRecurring: false },

  // ============ 2027 ============
  // Sabit Tatiller
  { name: 'Yılbaşı', date: '2027-01-01', type: 'important', isHalfDay: false },
  { name: 'Ulusal Egemenlik ve Çocuk Bayramı', date: '2027-04-23', type: 'national', isHalfDay: false },
  { name: 'Emek ve Dayanışma Günü', date: '2027-05-01', type: 'important', isHalfDay: false },
  { name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', date: '2027-05-19', type: 'national', isHalfDay: false },
  { name: 'Demokrasi ve Millî Birlik Günü', date: '2027-07-15', type: 'important', isHalfDay: true, halfDayPeriod: 'afternoon' },
  { name: 'Zafer Bayramı', date: '2027-08-30', type: 'national', isHalfDay: false },
  { name: 'Cumhuriyet Bayramı', date: '2027-10-29', type: 'national', isHalfDay: false },

  // Dini Bayramlar (2027)
  { name: 'Ramazan Bayramı Arefe', date: '2027-03-08', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Ramazan Bayramı 1. Gün', date: '2027-03-09', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 2. Gün', date: '2027-03-10', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Ramazan Bayramı 3. Gün', date: '2027-03-11', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı Arefe', date: '2027-05-15', type: 'half_day', isHalfDay: true, halfDayPeriod: 'afternoon', isRecurring: false },
  { name: 'Kurban Bayramı 1. Gün', date: '2027-05-16', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 2. Gün', date: '2027-05-17', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 3. Gün', date: '2027-05-18', type: 'religious', isHalfDay: false, isRecurring: false },
  { name: 'Kurban Bayramı 4. Gün', date: '2027-05-19', type: 'religious', isHalfDay: false, isRecurring: false },
];

async function initOfficialHolidays() {
  try {
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim');
    console.log('MongoDB bağlantısı başarılı');

    // Mevcut tatilleri temizle
    const deleteResult = await OfficialHoliday.deleteMany({});
    console.log(`${deleteResult.deletedCount} mevcut tatil silindi`);

    // Yeni tatilleri ekle
    let successCount = 0;
    let errorCount = 0;

    for (const holiday of officialHolidays) {
      try {
        const holidayDate = new Date(holiday.date);
        const year = holidayDate.getFullYear();

        await OfficialHoliday.create({
          name: holiday.name,
          date: holidayDate,
          year: year,
          type: holiday.type,
          isHalfDay: holiday.isHalfDay || false,
          halfDayPeriod: holiday.halfDayPeriod || null,
          isRecurring: holiday.isRecurring !== undefined ? holiday.isRecurring : true,
        });

        successCount++;
        console.log(`✓ ${holiday.name} (${holiday.date}) eklendi`);
      } catch (error) {
        errorCount++;
        console.error(`✗ ${holiday.name} eklenemedi:`, error.message);
      }
    }

    console.log('\n=== ÖZET ===');
    console.log(`Toplam: ${officialHolidays.length} tatil`);
    console.log(`Başarılı: ${successCount}`);
    console.log(`Hatalı: ${errorCount}`);

    // Yıl bazında özet
    const years = [2024, 2025, 2026, 2027];
    for (const year of years) {
      const count = await OfficialHoliday.countDocuments({ year });
      console.log(`${year}: ${count} tatil`);
    }

    console.log('\n✓ Resmi tatiller başarıyla yüklendi!');
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
initOfficialHolidays();
