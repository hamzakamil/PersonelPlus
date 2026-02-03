const mongoose = require('mongoose');
const YearlyTaxLimits = require('../models/YearlyTaxLimits');
require('dotenv').config();

// Varsayılan yıllık limitler
const defaultLimits = [
  {
    year: 2024,
    yemekLimits: {
      sgkDailyLimit: 134,
      vatDailyLimit: 250
    },
    yolLimits: {
      sgkDailyLimit: 134,
      vatDailyLimit: 134,
      sgkMonthlyLimit: 4000,
      vatMonthlyLimit: 4000
    },
    isActive: false,
    notes: '2024 yılı SGK ve Vergi limitleri'
  },
  {
    year: 2025,
    yemekLimits: {
      sgkDailyLimit: 158,
      vatDailyLimit: 300
    },
    yolLimits: {
      sgkDailyLimit: 158,
      vatDailyLimit: 158,
      sgkMonthlyLimit: 5000,
      vatMonthlyLimit: 5000
    },
    isActive: false,
    notes: '2025 yılı SGK ve Vergi limitleri'
  },
  {
    year: 2026,
    yemekLimits: {
      sgkDailyLimit: 180,
      vatDailyLimit: 350
    },
    yolLimits: {
      sgkDailyLimit: 180,
      vatDailyLimit: 180,
      sgkMonthlyLimit: 5500,
      vatMonthlyLimit: 5500
    },
    isActive: true,
    notes: '2026 yılı SGK ve Vergi limitleri'
  }
];

/**
 * Varsayılan yıllık limitleri oluşturur veya günceller
 */
async function initializeYearlyTaxLimits() {
  try {
    console.log('Yıllık vergi limitleri kontrol ediliyor...');

    for (const limitData of defaultLimits) {
      // Mevcut kaydı kontrol et
      const existing = await YearlyTaxLimits.findOne({ year: limitData.year });

      if (existing) {
        // isActive durumunu güncelle
        if (existing.isActive !== limitData.isActive) {
          await YearlyTaxLimits.updateOne(
            { year: limitData.year },
            { $set: { isActive: limitData.isActive, notes: limitData.notes } }
          );
          console.log(`  ↻ ${limitData.year} yılı limitleri güncellendi (isActive: ${limitData.isActive})`);
        } else {
          console.log(`  ✓ ${limitData.year} yılı limitleri zaten mevcut`);
        }
      } else {
        // Yeni kayıt oluştur
        await YearlyTaxLimits.create(limitData);
        console.log(`  + ${limitData.year} yılı limitleri oluşturuldu`);
      }
    }

    console.log('\nYıllık vergi limitleri başarıyla kontrol edildi.');
    return { success: true, message: 'Yıllık limitler hazır' };

  } catch (error) {
    console.error('Yıllık limitler oluşturulurken hata:', error);
    throw error;
  }
}

// Doğrudan çalıştırılırsa
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pys';

  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('MongoDB bağlantısı başarılı\n');
      await initializeYearlyTaxLimits();
      process.exit(0);
    })
    .catch(err => {
      console.error('MongoDB bağlantı hatası:', err);
      process.exit(1);
    });
}

module.exports = { initializeYearlyTaxLimits, defaultLimits };
