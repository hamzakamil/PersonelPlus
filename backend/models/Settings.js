const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Yıllık asgari ücret ayarları
    minimumWages: [
      {
        year: {
          type: Number,
          required: true,
          unique: true, // Her yıl için tek bir kayıt
        },
        net: {
          type: Number,
          required: true, // Net asgari ücret
        },
        brut: {
          type: Number,
          required: true, // Brüt asgari ücret
        },
        effectiveDate: {
          type: Date, // Yürürlük tarihi
          default: Date.now,
        },
      },
    ],
    // Aktif yıl (varsayılan olarak kullanılacak)
    currentYear: {
      type: Number,
      default: new Date().getFullYear(),
    },
    // Kayıt modu: email doğrulama veya manuel onay
    registrationMode: {
      type: String,
      enum: ['email_verification', 'manual_approval'],
      default: 'manual_approval',
    },
    // Google OAuth Deneme Hesabı Ayarları
    trialSettings: {
      trialDays: {
        type: Number,
        default: 14, // Deneme süresi (gün)
      },
      trialEmployeeQuota: {
        type: Number,
        default: 1, // Deneme çalışan kotası
      },
    },
    // Destek İletişim Bilgileri
    supportEmail: {
      type: String,
      default: 'destek@personelplus.com',
    },
    supportPhone: {
      type: String,
      default: '0555 123 45 67',
    },
  },
  {
    timestamps: true,
  }
);

// Singleton pattern - sadece bir ayar kaydı olmalı
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    // İlk kurulumda 2026 yılı için varsayılan değerleri ekle
    const currentYear = new Date().getFullYear();
    settings = new this({
      minimumWages: [
        {
          year: 2026,
          net: 28007.5,
          brut: 33030.0,
          effectiveDate: new Date('2026-01-01'),
        },
      ],
      currentYear: currentYear,
    });
    await settings.save();
  }
  return settings;
};

// Belirli bir yıl için asgari ücret getir
settingsSchema.statics.getMinimumWage = async function (year = null) {
  const settings = await this.getSettings();
  const targetYear = year || settings.currentYear || new Date().getFullYear();

  const wageData = settings.minimumWages.find(w => w.year === targetYear);

  if (!wageData) {
    // Eğer yıl bulunamazsa, en son yılın değerini döndür
    const sortedWages = settings.minimumWages.sort((a, b) => b.year - a.year);
    if (sortedWages.length > 0) {
      return sortedWages[0];
    }
    // Hiç kayıt yoksa varsayılan değerler (2026)
    return {
      year: targetYear,
      net: 28007.5,
      brut: 33030.0,
    };
  }

  return wageData;
};

module.exports = mongoose.model('Settings', settingsSchema);
