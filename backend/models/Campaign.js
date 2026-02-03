const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  // Temel bilgiler
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },

  // Kampanya tipi
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'trial'],
    required: true
  },

  // İndirim değerleri
  discountPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },

  // Deneme süresi (trial tipi için)
  trialDays: {
    type: Number,
    min: 0,
    default: 0
  },

  // Geçerlilik tarihleri
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },

  // Kullanım limitleri
  maxUses: {
    type: Number,
    default: null // null = sınırsız
  },
  usedCount: {
    type: Number,
    default: 0
  },
  maxUsesPerDealer: {
    type: Number,
    default: 1 // Bir bayi kaç kez kullanabilir
  },

  // Kısıtlamalar
  applicablePackages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  }], // Boş array = tüm paketler
  applicableBillingTypes: [{
    type: String,
    enum: ['monthly', 'yearly']
  }], // Boş array = tüm tipler
  minBillingMonths: {
    type: Number,
    default: 1 // Minimum fatura dönemi
  },

  // Minimum sipariş tutarı
  minOrderAmount: {
    type: Number,
    default: 0
  },

  // Durum
  isActive: {
    type: Boolean,
    default: true
  },

  // Kullanım geçmişi
  usageHistory: [{
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealer'
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    discountApplied: Number,
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Oluşturan
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ code: 1 });
campaignSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Kampanyanın geçerli olup olmadığını kontrol et
campaignSchema.methods.isValid = function() {
  const now = new Date();

  if (!this.isActive) return false;
  if (now < this.startDate || now > this.endDate) return false;
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;

  return true;
};

// Bayi için kullanılabilir mi?
campaignSchema.methods.canBeUsedByDealer = function(dealerId) {
  if (!this.isValid()) return false;

  const dealerUsageCount = this.usageHistory.filter(
    h => h.dealer.toString() === dealerId.toString()
  ).length;

  return dealerUsageCount < this.maxUsesPerDealer;
};

// İndirim tutarını hesapla
campaignSchema.methods.calculateDiscount = function(originalAmount) {
  if (this.type === 'percentage') {
    return (originalAmount * this.discountPercent) / 100;
  } else if (this.type === 'fixed') {
    return Math.min(this.discountAmount, originalAmount);
  } else if (this.type === 'trial') {
    return originalAmount; // Trial = %100 indirim
  }
  return 0;
};

module.exports = mongoose.model('Campaign', campaignSchema);
