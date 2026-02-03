const mongoose = require('mongoose');

const dealerSubscriptionSchema = new mongoose.Schema({
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },

  // Kota Bilgisi
  employeeQuota: {
    type: Number,
    required: true
  },
  usedQuota: {
    type: Number,
    default: 0
  },

  // Abonelik Tipi
  billingType: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },

  // Tarihler
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },

  // Durum
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'cancelled'],
    default: 'active'
  },

  // Ödeme Bilgisi
  price: {
    type: Number,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },

  // Otomatik yenileme
  autoRenew: {
    type: Boolean,
    default: false
  },

  // Geçmiş
  history: [{
    action: {
      type: String // 'created', 'renewed', 'upgraded', 'expired', 'cancelled', 'suspended'
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Meta
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
dealerSubscriptionSchema.index({ dealer: 1, status: 1 });
dealerSubscriptionSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model('DealerSubscription', dealerSubscriptionSchema);
