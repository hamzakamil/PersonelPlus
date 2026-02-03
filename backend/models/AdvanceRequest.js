const mongoose = require('mongoose');

const advanceRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  // Sıradaki onaylayıcı
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  // Onay zinciri
  approvalChain: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED']
    },
    actionDate: Date,
    comment: String
  }],
  // Taksit bilgileri
  installments: {
    type: Number,
    default: 1,
    min: 1
  },
  installmentAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  // Ödeme planı
  paymentSchedule: [{
    month: String, // "2026-02" formatında
    amount: Number,
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: Date,
    paymentNote: String
  }],
  // Onay bilgileri
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  // Red bilgileri
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  // İptal bilgileri
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  // Notlar
  internalNotes: {
    type: String // Yöneticiler için not
  }
}, {
  timestamps: true
});

// Index for efficient queries
advanceRequestSchema.index({ employee: 1, status: 1 });
advanceRequestSchema.index({ company: 1, status: 1 });
advanceRequestSchema.index({ status: 1, requestDate: -1 });

// Taksit tutarını hesapla
advanceRequestSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('amount') || this.isModified('installments')) {
    this.installmentAmount = this.amount / this.installments;
    this.remainingAmount = this.amount;
  }
  next();
});

module.exports = mongoose.model('AdvanceRequest', advanceRequestSchema);
