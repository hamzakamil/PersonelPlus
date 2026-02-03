const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DealerSubscription'
  },
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },

  // Tutar
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'TRY'
  },

  // iyzico bilgileri
  iyzicoPaymentId: {
    type: String
  },
  iyzicoConversationId: {
    type: String
  },
  iyzicoToken: {
    type: String
  },

  // Durum
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },

  // Ödeme detayları
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'manual'],
    default: 'credit_card'
  },
  cardLastFour: {
    type: String
  },
  cardType: {
    type: String // visa, mastercard, etc.
  },

  // Fatura bilgileri
  invoiceNumber: {
    type: String
  },
  invoiceUrl: {
    type: String
  },

  // Abonelik tipi
  billingType: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },

  // Tarihler
  paidAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },

  // Meta
  metadata: {
    type: Object // iyzico tam response
  },
  errorMessage: {
    type: String
  },
  notes: {
    type: String
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ dealer: 1, status: 1 });
paymentSchema.index({ iyzicoConversationId: 1 });
paymentSchema.index({ iyzicoToken: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
