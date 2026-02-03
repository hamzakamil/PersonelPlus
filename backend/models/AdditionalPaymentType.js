const mongoose = require('mongoose');

const additionalPaymentTypeSchema = new mongoose.Schema({
  // Ödeme türü adı
  name: {
    type: String,
    required: true
  },
  // Benzersiz kod (YOL, YEMEK, SERVIS, vb.)
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // Açıklama
  description: {
    type: String,
    default: null
  },
  // Kategori
  category: {
    type: String,
    enum: ['TRANSPORTATION', 'FOOD', 'FAMILY', 'CLOTHING', 'BONUS', 'OTHER'],
    required: true
  },
  // Ödeme sıklığı
  paymentFrequency: {
    type: String,
    enum: ['MONTHLY', 'YEARLY', 'ONE_TIME'],
    default: 'MONTHLY'
  },
  // Vergi muafiyeti
  isTaxExempt: {
    type: Boolean,
    default: false
  },
  // Vergi muaf limit (TL)
  taxExemptLimit: {
    type: Number,
    default: 0
  },
  // Sistem varsayılanı mı?
  isDefault: {
    type: Boolean,
    default: false
  },
  // Aktif mi?
  isActive: {
    type: Boolean,
    default: true
  },
  // Görüntüleme sırası
  displayOrder: {
    type: Number,
    default: 99
  },

  // Ödeme yöntemi seçenekleri var mı? (Yemek gibi özel türler için)
  hasPaymentMethodOptions: {
    type: Boolean,
    default: false
  },

  // Ödeme yöntemi seçenekleri
  paymentMethodOptions: [{
    code: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: null
    },
    hasSgkDeduction: {
      type: Boolean,
      default: true
    },
    hasVatDeduction: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Indexes (code already has unique: true in schema)
additionalPaymentTypeSchema.index({ category: 1, isActive: 1 });
additionalPaymentTypeSchema.index({ displayOrder: 1 });

// Kategori Türkçe adları için virtual
additionalPaymentTypeSchema.virtual('categoryName').get(function() {
  const categoryNames = {
    'TRANSPORTATION': 'Ulaşım',
    'FOOD': 'Yemek',
    'FAMILY': 'Aile',
    'CLOTHING': 'Giyim',
    'BONUS': 'Prim',
    'OTHER': 'Diğer'
  };
  return categoryNames[this.category] || this.category;
});

// Ödeme sıklığı Türkçe adları için virtual
additionalPaymentTypeSchema.virtual('frequencyName').get(function() {
  const frequencyNames = {
    'MONTHLY': 'Aylık',
    'YEARLY': 'Yıllık',
    'ONE_TIME': 'Tek Seferlik'
  };
  return frequencyNames[this.paymentFrequency] || this.paymentFrequency;
});

// JSON dönüşümünde virtual alanları dahil et
additionalPaymentTypeSchema.set('toJSON', { virtuals: true });
additionalPaymentTypeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AdditionalPaymentType', additionalPaymentTypeSchema);
