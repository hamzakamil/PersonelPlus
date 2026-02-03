const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  employeeLimit: {
    type: Number,
    required: true
  },

  // Fiyatlandırma
  monthlyPrice: {
    type: Number,
    required: true
  },
  yearlyPrice: {
    type: Number,
    required: true
  },
  pricePerEmployee: {
    type: Number
  },

  // Özellikler
  features: [{
    name: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],

  // Durum
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },

  // Meta
  description: {
    type: String
  },
  highlightText: {
    type: String // "En Popüler" gibi
  }
}, {
  timestamps: true
});

// Index for sorting and filtering
packageSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Package', packageSchema);
