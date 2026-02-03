const mongoose = require('mongoose');

/**
 * Yıllık Vergi ve SGK Limitleri
 * SGK ve Vergi muafiyet limitleri yıllar itibariyle değişebilir
 */
const yearlyTaxLimitsSchema = new mongoose.Schema({
  // Yıl
  year: {
    type: Number,
    required: true,
    unique: true
  },

  // Yemek Kazancı Limitleri
  yemekLimits: {
    // SGK muafiyet limiti (günlük)
    sgkDailyLimit: {
      type: Number,
      default: 158 // 2025 değeri
    },
    // Vergi muafiyet limiti (günlük)
    vatDailyLimit: {
      type: Number,
      default: 300 // 2025 değeri
    }
  },

  // Yol Kazancı Limitleri
  yolLimits: {
    // SGK muafiyet limiti (günlük) - Abonman için
    sgkDailyLimit: {
      type: Number,
      default: 158 // 2025 değeri
    },
    // Vergi muafiyet limiti (günlük) - Abonman için
    vatDailyLimit: {
      type: Number,
      default: 158 // 2025 değeri (KDV hariç)
    },
    // SGK muafiyet limiti (aylık)
    sgkMonthlyLimit: {
      type: Number,
      default: 5000
    },
    // Vergi muafiyet limiti (aylık)
    vatMonthlyLimit: {
      type: Number,
      default: 5000
    }
  },

  // Genel SGK Limitleri
  sgkLimits: {
    // SGK tavan ücreti (aylık)
    sgkCeiling: {
      type: Number,
      default: 0
    },
    // SGK taban ücreti (asgari ücret)
    sgkFloor: {
      type: Number,
      default: 0
    }
  },

  // Aktif mi? (Yalnızca bir yıl aktif olabilir)
  isActive: {
    type: Boolean,
    default: false
  },

  // Açıklama
  notes: {
    type: String,
    default: null
  },

  // Oluşturan
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes (year already has unique: true in schema)
yearlyTaxLimitsSchema.index({ isActive: 1 });

module.exports = mongoose.model('YearlyTaxLimits', yearlyTaxLimitsSchema);
