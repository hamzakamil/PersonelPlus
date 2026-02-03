const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DealerSubscription'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // Komisyon tutarı
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'TRY'
  },

  // Komisyon oranı (%)
  rate: {
    type: Number,
    required: true
  },

  // Üzerine komisyon hesaplanan tutar
  baseAmount: {
    type: Number,
    required: true
  },

  // Durum
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },

  // Onay bilgileri
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Ödeme bilgileri
  paidAt: {
    type: Date
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'eft', 'cash', 'other'],
    default: 'bank_transfer'
  },
  paymentReference: {
    type: String // Dekont no, işlem referansı
  },

  // İptal bilgileri
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String
  },

  // Notlar
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
commissionSchema.index({ dealer: 1, status: 1 });
commissionSchema.index({ payment: 1 });
commissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);
