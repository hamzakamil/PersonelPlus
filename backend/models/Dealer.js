const mongoose = require('mongoose');
const crypto = require('crypto');

const dealerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true, // null değerlere izin ver
      uppercase: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
    },
    contactPerson: {
      type: String, // Yetkili kisi adi
    },
    ikDisplayName: {
      type: String, // Bayi'nin İK olarak görünecek adı (işe giriş/çıkış ekranlarında)
      default: null, // null ise bayi adı (name) kullanılır
    },
    address: {
      type: String,
    },
    city: {
      type: String,
      default: 'Istanbul',
    },
    zipCode: {
      type: String,
      default: '34000',
    },
    taxNumber: {
      type: String, // Vergi no veya TCKN (iyzico icin gerekli)
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxCompanies: {
      type: Number,
      default: null, // null = sınırsız, sayı = maksimum şirket sayısı
    },

    // Bayinin kendi şirketi (kendi çalışanları için)
    selfCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    // Abonelik bilgileri
    activeSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DealerSubscription',
      default: null,
    },

    // Hızlı erişim için denormalize alanlar
    subscriptionStatus: {
      type: String,
      enum: ['none', 'active', 'expired', 'suspended'],
      default: 'none',
    },
    employeeQuota: {
      type: Number,
      default: 0,
    },
    usedEmployeeQuota: {
      type: Number,
      default: 0,
    },
    allocatedQuota: {
      type: Number,
      default: 0, // Şirketlere dağıtılan toplam
    },
    quotaExpiresAt: {
      type: Date,
      default: null,
    },

    // Komisyon bilgileri
    commissionRate: {
      type: Number,
      default: 10, // Varsayılan %10
      min: 0,
      max: 100,
    },
    totalCommissionEarned: {
      type: Number,
      default: 0, // Toplam kazanılan komisyon
    },
    pendingCommission: {
      type: Number,
      default: 0, // Bekleyen (henüz ödenmemiş) komisyon
    },
    paidCommission: {
      type: Number,
      default: 0, // Ödenen komisyon
    },
  },
  {
    timestamps: true,
  }
);

// Referans kodu otomatik üret (yoksa)
dealerSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    let code;
    let exists = true;
    while (exists) {
      code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 haneli hex
      exists = await mongoose.model('Dealer').findOne({ referralCode: code });
    }
    this.referralCode = code;
  }
  next();
});

module.exports = mongoose.model('Dealer', dealerSchema);
