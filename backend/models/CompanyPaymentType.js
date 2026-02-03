const mongoose = require('mongoose');

const companyPaymentTypeSchema = new mongoose.Schema({
  // Şirket referansı
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // Ödeme türü referansı
  paymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdditionalPaymentType',
    required: true
  },
  // Şirkete özel isim (opsiyonel)
  customName: {
    type: String,
    default: null
  },
  // Varsayılan tutar
  defaultAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Aktif mi?
  isActive: {
    type: Boolean,
    default: true
  },
  // Ek ayarlar
  settings: {
    // Tek seferlik ödemeler için onay gerekli mi?
    requiresApproval: {
      type: Boolean,
      default: false
    },
    // Maksimum tutar limiti
    maxAmount: {
      type: Number,
      default: null
    },
    // Ödeme günü (1-31)
    paymentDay: {
      type: Number,
      default: 1,
      min: 1,
      max: 31
    },
    // Seçilen ödeme yöntemi (Yemek gibi türler için: CASH, MEAL_CARD_ONLY, NON_MEAL_CARD)
    selectedPaymentMethod: {
      type: String,
      default: null
    },
    // SGK kesintisi yapılsın mı?
    hasSgkDeduction: {
      type: Boolean,
      default: true
    },
    // Vergi kesintisi yapılsın mı?
    hasVatDeduction: {
      type: Boolean,
      default: true
    },
    // Otomatik kesinti oluşturulsun mu? (Net maaşın değişmemesi için)
    createAutoDeduction: {
      type: Boolean,
      default: false
    },
    // Abonman ödemeleri KDV dahil mi? (Yol için)
    includesVat: {
      type: Boolean,
      default: false
    }
  },
  // Oluşturan kullanıcı
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Bir şirkette bir ödeme türü yalnızca bir kez olabilir
companyPaymentTypeSchema.index({ company: 1, paymentType: 1 }, { unique: true });
companyPaymentTypeSchema.index({ company: 1, isActive: 1 });

// Populate edilmiş ödeme türü adını döndür
companyPaymentTypeSchema.virtual('displayName').get(function() {
  if (this.customName) {
    return this.customName;
  }
  if (this.paymentType && typeof this.paymentType === 'object') {
    return this.paymentType.name;
  }
  return null;
});

// JSON dönüşümünde virtual alanları dahil et
companyPaymentTypeSchema.set('toJSON', { virtuals: true });
companyPaymentTypeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CompanyPaymentType', companyPaymentTypeSchema);
